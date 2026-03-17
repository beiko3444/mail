function normalizeAddress(value) {
  return String(value || "").trim().toLowerCase();
}

function getAddressList(payload, key) {
  const value = payload?.[key];
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeAddress(item?.address || item?.email || item))
      .filter(Boolean);
  }

  return [normalizeAddress(value?.address || value?.email || value)].filter(Boolean);
}

function getSender(payload) {
  const value = payload?.from;
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.address || value.email || value.name || String(value);
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
  const source = getBodyContent(message?.text) || getBodyContent(message?.html) || "";
  return source
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
    source: payload.source || "resend-api",
  };
}

function sortMessagesDesc(messages) {
  return [...messages].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function messageTargetsAddress(message, address) {
  const wanted = normalizeAddress(address);
  const recipients = [
    ...(message.to || []),
    ...(message.cc || []),
    ...(message.bcc || []),
  ];
  return recipients.some((item) => normalizeAddress(item) === wanted);
}

async function resendRequest(pathname) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY 가 설정되지 않았습니다.");
  }

  const response = await fetch(`https://api.resend.com${pathname}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Resend API error (${response.status})`);
  }

  return payload;
}

async function listReceivedMessages(address) {
  const target = normalizeAddress(address);
  const payload = await resendRequest("/emails/receiving?limit=100");
  const list = Array.isArray(payload?.data) ? payload.data : [];

  const filtered = list
    .filter((message) => {
      const recipients = [
        ...getAddressList(message, "to"),
        ...getAddressList(message, "cc"),
        ...getAddressList(message, "bcc"),
      ];
      return recipients.includes(target);
    })
    .map((message) => normalizeMessage({ ...message, source: "resend-api" }));

  return sortMessagesDesc(filtered);
}

async function getReceivedMessage(id) {
  const safeId = encodeURIComponent(id);
  const email = await resendRequest(`/emails/receiving/${safeId}`);
  let attachmentDownloads = [];

  if (Array.isArray(email?.attachments) && email.attachments.length > 0) {
    try {
      const attachmentPayload = await resendRequest(`/emails/receiving/${safeId}/attachments`);
      attachmentDownloads = Array.isArray(attachmentPayload?.data) ? attachmentPayload.data : [];
    } catch {
      attachmentDownloads = [];
    }
  }

  return normalizeMessage({
    ...email,
    attachmentDownloads,
    source: "resend-api",
  });
}

module.exports = {
  listReceivedMessages,
  getReceivedMessage,
  messageTargetsAddress,
};
