const http = require("http");
const https = require("https");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { URL } = require("url");

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const STORE_PATH = path.join(DATA_DIR, "messages.json");
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

const env = loadEnvFile(path.join(ROOT_DIR, ".env"));
const config = {
  port: Number(process.env.PORT || env.PORT || 4173),
  host: process.env.HOST || env.HOST || "127.0.0.1",
  inboxDomain: process.env.INBOX_DOMAIN || env.INBOX_DOMAIN || "inbox.xtracker.co.kr",
  resendApiKey: process.env.RESEND_API_KEY || env.RESEND_API_KEY || "",
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET || env.RESEND_WEBHOOK_SECRET || "",
};

function loadEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return raw.split(/\r?\n/).reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return acc;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        return acc;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['\"]|['\"]$/g, "");
      acc[key] = value;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function text(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

async function ensureStore() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(STORE_PATH, fs.constants.F_OK);
  } catch {
    await fsp.writeFile(STORE_PATH, JSON.stringify({ messages: [] }, null, 2));
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fsp.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.messages) ? parsed : { messages: [] };
  } catch {
    return { messages: [] };
  }
}

async function writeStore(store) {
  await ensureStore();
  await fsp.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

function normalizeAddress(value) {
  return String(value || "").trim().toLowerCase();
}

function getAddressList(payload, key) {
  const value = payload[key];
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeAddress(item.address || item.email || item)).filter(Boolean);
  }

  return [normalizeAddress(value.address || value.email || value)].filter(Boolean);
}

function getSender(payload) {
  const value = payload.from;
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    return value.address || value.email || value.name || "";
  }

  return String(value);
}

function getBodyContent(value) {
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join("\n");
  }

  return String(value);
}

function deriveIntro(message) {
  const source = getBodyContent(message.text) || getBodyContent(message.html) || "";
  return String(source)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function mergeAttachments(metadataList = [], downloadList = []) {
  const downloadById = new Map(downloadList.map((item) => [item.id, item]));
  return metadataList.map((attachment) => ({
    id: attachment.id,
    filename: attachment.filename,
    contentType: attachment.content_type,
    contentDisposition: attachment.content_disposition,
    contentId: attachment.content_id,
    size: attachment.size || downloadById.get(attachment.id)?.size || null,
    downloadUrl: downloadById.get(attachment.id)?.download_url || null,
    expiresAt: downloadById.get(attachment.id)?.expires_at || null,
  }));
}

function normalizeMessage(payload) {
  return {
    id: payload.id || payload.email_id,
    from: getSender(payload),
    to: getAddressList(payload, "to"),
    cc: getAddressList(payload, "cc"),
    bcc: getAddressList(payload, "bcc"),
    replyTo: getAddressList(payload, "reply_to"),
    subject: payload.subject || "(제목 없음)",
    createdAt: payload.created_at || payload.createdAt || new Date().toISOString(),
    messageId: payload.message_id || payload.messageId || "",
    text: getBodyContent(payload.text),
    html: getBodyContent(payload.html),
    headers: payload.headers || {},
    raw: payload.raw || null,
    attachments: mergeAttachments(payload.attachments || [], payload.attachmentDownloads || []),
    intro: payload.intro || deriveIntro(payload),
    source: payload.source || "resend",
    cachedAt: new Date().toISOString(),
  };
}

function sortMessagesDesc(messages) {
  return [...messages].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function messageTargetsAddress(message, address) {
  const wanted = normalizeAddress(address);
  const recipients = [...(message.to || []), ...(message.cc || []), ...(message.bcc || [])];
  return recipients.some((item) => normalizeAddress(item) === wanted);
}

async function upsertMessage(message) {
  if (!message?.id) {
    return;
  }

  const store = await readStore();
  const index = store.messages.findIndex((item) => item.id === message.id);

  if (index >= 0) {
    store.messages[index] = { ...store.messages[index], ...message };
  } else {
    store.messages.unshift(message);
  }

  store.messages = sortMessagesDesc(store.messages).slice(0, 500);
  await writeStore(store);
}

async function getCachedMessages(address) {
  const store = await readStore();
  return sortMessagesDesc(store.messages.filter((message) => messageTargetsAddress(message, address)));
}

async function getCachedMessageById(id) {
  const store = await readStore();
  return store.messages.find((message) => message.id === id) || null;
}

function requestJson(urlString, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          let payload = null;
          if (body) {
            try {
              payload = JSON.parse(body);
            } catch {
              payload = { message: body };
            }
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(payload?.message || payload?.error || `Resend API error (${response.statusCode})`));
            return;
          }

          resolve(payload);
        });
      },
    );

    request.on("error", reject);

    if (options.body) {
      request.write(options.body);
    }

    request.end();
  });
}

async function resendRequest(pathname) {
  if (!config.resendApiKey) {
    throw new Error("RESEND_API_KEY 가 설정되지 않았습니다.");
  }

  return requestJson(`https://api.resend.com${pathname}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
  });
}

async function listReceivedMessages(address) {
  const target = normalizeAddress(address);
  const payload = await resendRequest("/emails/receiving?limit=100");
  const list = Array.isArray(payload?.data) ? payload.data : [];

  const filtered = list
    .filter((message) => {
      const recipients = Array.isArray(message.to) ? message.to.map(normalizeAddress) : [];
      return recipients.includes(target);
    })
    .map((message) =>
      normalizeMessage({
        ...message,
        source: "resend-api",
      }),
    );

  await Promise.all(filtered.map((message) => upsertMessage(message)));
  return sortMessagesDesc(filtered);
}

async function getReceivedMessage(id) {
  const email = await resendRequest(`/emails/receiving/${id}`);
  let attachmentDownloads = [];

  if (Array.isArray(email?.attachments) && email.attachments.length > 0) {
    try {
      const attachmentPayload = await resendRequest(`/emails/receiving/${id}/attachments`);
      attachmentDownloads = Array.isArray(attachmentPayload?.data) ? attachmentPayload.data : [];
    } catch {
      attachmentDownloads = [];
    }
  }

  const message = normalizeMessage({
    ...email,
    attachmentDownloads,
    source: "resend-api",
  });

  await upsertMessage(message);
  return message;
}

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("JSON 본문을 해석하지 못했습니다."));
      }
    });
    req.on("error", reject);
  });
}

function buildConfigPayload() {
  return {
    inboxDomain: config.inboxDomain,
    apiConfigured: Boolean(config.resendApiKey),
    webhookSecretConfigured: Boolean(config.resendWebhookSecret),
    webhookPath: "/api/webhooks/resend",
    sourceMode: config.resendApiKey ? "resend-api" : "webhook-cache",
    autoRefreshSeconds: 15,
  };
}

async function handleWebhook(req, res) {
  try {
    const event = await parseJsonBody(req);

    if (event.type !== "email.received") {
      json(res, 200, { ok: true, ignored: true });
      return;
    }

    const emailId = event.data?.email_id;
    if (!emailId) {
      json(res, 400, { error: "email_id 가 없는 webhook 입니다." });
      return;
    }

    let message;
    if (config.resendApiKey) {
      message = await getReceivedMessage(emailId);
    } else {
      message = normalizeMessage({
        ...event.data,
        id: emailId,
        source: "webhook-cache",
      });
      await upsertMessage(message);
    }

    json(res, 200, {
      ok: true,
      stored: true,
      id: message.id,
    });
  } catch (error) {
    json(res, 500, { error: error.message || "Webhook 처리에 실패했습니다." });
  }
}

async function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(ROOT_DIR, path.normalize(safePath).replace(/^\/+/, ""));
  const relativePath = path.relative(ROOT_DIR, filePath);

  if (
    !filePath.startsWith(ROOT_DIR) ||
    relativePath.startsWith("data") ||
    relativePath.startsWith(".") ||
    relativePath.split(path.sep).some((part) => part.startsWith("."))
  ) {
    text(res, 403, "Forbidden");
    return;
  }

  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) {
      text(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=300",
    });

    fs.createReadStream(filePath).pipe(res);
  } catch {
    text(res, 404, "Not found");
  }
}

async function handleApi(req, res, pathname, searchParams) {
  if (pathname === "/api/health") {
    json(res, 200, { ok: true, config: buildConfigPayload() });
    return;
  }

  if (pathname === "/api/config") {
    json(res, 200, buildConfigPayload());
    return;
  }

  if (pathname === "/api/messages") {
    const address = normalizeAddress(searchParams.get("address"));
    if (!address) {
      json(res, 400, { error: "address 쿼리가 필요합니다." });
      return;
    }

    try {
      const messages = config.resendApiKey ? await listReceivedMessages(address) : await getCachedMessages(address);
      json(res, 200, {
        address,
        source: config.resendApiKey ? "resend-api" : "webhook-cache",
        messages,
      });
    } catch (error) {
      const fallback = await getCachedMessages(address);
      json(res, 200, {
        address,
        source: fallback.length ? "cache-fallback" : "error",
        warning: error.message,
        messages: fallback,
      });
    }
    return;
  }

  if (pathname.startsWith("/api/messages/")) {
    const id = decodeURIComponent(pathname.slice("/api/messages/".length));
    const address = normalizeAddress(searchParams.get("address"));

    try {
      let message = config.resendApiKey ? await getReceivedMessage(id) : await getCachedMessageById(id);
      if (!message) {
        json(res, 404, { error: "메일을 찾지 못했습니다." });
        return;
      }

      if (address && !messageTargetsAddress(message, address)) {
        json(res, 403, { error: "이 주소의 메일이 아닙니다." });
        return;
      }

      json(res, 200, message);
    } catch (error) {
      json(res, 500, { error: error.message || "메일 조회에 실패했습니다." });
    }
    return;
  }

  if (pathname === "/api/webhooks/resend" && req.method === "POST") {
    await handleWebhook(req, res);
    return;
  }

  text(res, 404, "Not found");
}

async function requestListener(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/")) {
    await handleApi(req, res, pathname, url.searchParams);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    text(res, 405, "Method Not Allowed");
    return;
  }

  await serveStatic(req, res, pathname);
}

async function start() {
  await ensureStore();
  const server = http.createServer((req, res) => {
    requestListener(req, res).catch((error) => {
      json(res, 500, { error: error.message || "서버 오류가 발생했습니다." });
    });
  });

  server.listen(config.port, config.host, () => {
    console.log(`Free Mail Forge running on http://${config.host}:${config.port}`);
    console.log(`Inbox domain: ${config.inboxDomain}`);
    console.log(`Resend API configured: ${config.resendApiKey ? "yes" : "no"}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
