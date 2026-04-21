const AUTO_REFRESH_MS = 15000;
const STORAGE_KEYS = {
  activeLocalPart: "xtracker-active-local-part",
};

const state = {
  config: null,
  activeAddress: "",
  aliases: [],
  messages: [],
  activeMessageId: "",
  activeMessage: null,
  poller: null,
};

const currentInboxEl = document.querySelector("#currentInbox");
const connectionBadgeEl = document.querySelector("#connectionBadge");
const inboxHintEl = document.querySelector("#inboxHint");
const statusTextEl = document.querySelector("#statusText");
const modeLabelEl = document.querySelector("#modeLabel");
const messageCountEl = document.querySelector("#messageCount");
const aliasCountEl = document.querySelector("#aliasCount");
const localPartInputEl = document.querySelector("#localPartInput");
const previewLocalEl = document.querySelector("#previewLocal");
const previewDomainEl = document.querySelector("#previewDomain");
const sessionCardEl = document.querySelector("#sessionCard");
const aliasListEl = document.querySelector("#aliasList");
const messageListEl = document.querySelector("#messageList");
const messageDetailEl = document.querySelector("#messageDetail");
const messageItemTemplateEl = document.querySelector("#messageItemTemplate");
const aliasItemTemplateEl = document.querySelector("#aliasItemTemplate");

function sanitizeLocalPart(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function getInboxDomain() {
  return state.config?.inboxDomain || "inbox.xtracker.co.kr";
}

function buildAddress(localPart) {
  return `${localPart}@${getInboxDomain()}`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "요청에 실패했습니다.");
  }

  return payload;
}

function looksLikeMixedCode(value) {
  return /[a-z]/i.test(value) && /\d/.test(value);
}

function extractVerificationCode(message) {
  const subject = String(message?.subject || "");
  const intro = String(message?.intro || "");
  const source = `${subject}\n${intro}`;

  const keywordPattern =
    /(?:인증\s*코드|인증번호|코드|otp|verification(?:\s*code)?|one[-\s]*time(?:\s*password)?|passcode)\D{0,12}([a-z0-9-]{4,12})/i;
  const keywordMatch = source.match(keywordPattern);
  if (keywordMatch?.[1]) {
    return keywordMatch[1].replace(/[^a-z0-9]/gi, "").toUpperCase();
  }

  const sixDigitMatch = source.match(/\b\d{6}\b/);
  if (sixDigitMatch?.[0]) {
    return sixDigitMatch[0];
  }

  const numericMatch = source.match(/\b\d{4,8}\b/);
  if (numericMatch?.[0]) {
    return numericMatch[0];
  }

  const mixedMatch = source.match(/\b[a-z0-9]{6,10}\b/gi);
  if (Array.isArray(mixedMatch)) {
    const candidate = mixedMatch.find((item) => looksLikeMixedCode(item));
    if (candidate) {
      return candidate.toUpperCase();
    }
  }

  return "";
}

function setStatus(message, tone = "idle") {
  statusTextEl.textContent = message;
  connectionBadgeEl.className = `status-badge is-${tone}`;
  connectionBadgeEl.textContent = tone === "connected" ? "정상" : tone === "error" ? "오류" : "대기";
}

function updatePreview() {
  const localPart = sanitizeLocalPart(localPartInputEl.value) || "your-alias";
  previewLocalEl.textContent = localPart;
  previewDomainEl.textContent = `@${getInboxDomain()}`;
}

function getModeLabel() {
  if (state.config?.sourceMode === "webhook-cache") {
    return "제한";
  }
  if (state.config?.apiConfigured) {
    return "정상";
  }
  return "설정 필요";
}

function getModeDescription() {
  if (state.config?.sourceMode === "webhook-cache") {
    return "실시간 API 없이 캐시 기준으로 동작";
  }
  if (state.config?.apiConfigured) {
    return "실시간 수신 메일 조회 가능";
  }
  return "API 키 설정이 필요합니다";
}

function renderStats() {
  messageCountEl.textContent = `${state.messages.length}`;
  modeLabelEl.textContent = getModeLabel();
  aliasCountEl.textContent = `${state.aliases.length}`;
}

function renderCurrentInbox() {
  if (!state.activeAddress) {
    currentInboxEl.textContent = "주소를 설정해보세요";
    inboxHintEl.textContent = "메일명을 입력하고 주소를 저장하면 메일이 수신됩니다.";
    return;
  }

  currentInboxEl.textContent = state.activeAddress;
  inboxHintEl.textContent = `${Math.floor(AUTO_REFRESH_MS / 1000)}초마다 자동으로 새 메일을 확인합니다.`;
}

function renderSessionCard() {
  if (!state.config) {
    sessionCardEl.className = "session-card";
    sessionCardEl.textContent = "설정 확인 중";
    return;
  }

  const currentAddress = state.activeAddress || "미선택";
  const aliasStoreType =
    state.config.aliasStore?.type === "supabase-rest" || state.config.aliasStore?.type === "redis-rest"
      ? "DB"
      : state.config.aliasStore?.persistent
        ? "로컬"
        : "설정 필요";
  sessionCardEl.className = "session-card";
  sessionCardEl.textContent = `${getModeDescription()} · 주소목록 저장: ${aliasStoreType} · 도메인: ${getInboxDomain()} · 현재 주소: ${currentAddress}`;
}

function renderAliases() {
  if (!state.aliases.length) {
    aliasListEl.className = "mail-list empty-state";
    aliasListEl.textContent = "저장한 주소가 아직 없습니다.";
    return;
  }

  aliasListEl.className = "mail-list";
  aliasListEl.innerHTML = "";

  state.aliases.forEach((address) => {
    const fragment = aliasItemTemplateEl.content.cloneNode(true);
    const item = fragment.querySelector(".alias-item");
    const addressEl = fragment.querySelector(".alias-item__address");
    const metaEl = fragment.querySelector(".alias-item__meta");
    const removeBtn = fragment.querySelector(".alias-remove-btn");

    addressEl.textContent = address;
    metaEl.textContent = address === state.activeAddress ? "현재 보고 있는 주소" : "클릭해서 이 주소의 메일함 열기";

    if (address === state.activeAddress) {
      item.classList.add("is-active");
    }

    item.addEventListener("click", async () => {
      const localPart = address.split("@")[0] || "";
      localPartInputEl.value = localPart;
      updatePreview();
      await activateCurrentInput();
    });

    removeBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      const confirmed = window.confirm("삭제하시겠습니까?");
      if (!confirmed) {
        return;
      }

      try {
        await removeAlias(address);
      } catch (error) {
        setStatus(`주소 삭제에 실패했습니다: ${error.message}`, "error");
      }
    });

    aliasListEl.appendChild(fragment);
  });
}

function renderMessages() {
  if (!state.activeAddress) {
    messageListEl.className = "mail-list empty-state";
    messageListEl.textContent = "주소를 적용하면 이곳에 해당 주소로 온 메일이 표시됩니다.";
    return;
  }

  if (!state.messages.length) {
    messageListEl.className = "mail-list empty-state";
    messageListEl.textContent = "아직 받은 메일이 없습니다. 이 주소로 테스트 메일을 보내보세요.";
    return;
  }

  messageListEl.className = "mail-list";
  messageListEl.innerHTML = "";

  state.messages.forEach((message) => {
    const fragment = messageItemTemplateEl.content.cloneNode(true);
    const button = fragment.querySelector(".message-item");
    const subjectEl = fragment.querySelector(".message-item__subject");
    const timeEl = fragment.querySelector(".message-item__time");
    const fromEl = fragment.querySelector(".message-item__from");
    const introEl = fragment.querySelector(".message-item__intro");
    const code = extractVerificationCode(message);

    subjectEl.textContent = message.subject || "(제목 없음)";
    if (code) {
      const codeBadge = document.createElement("span");
      codeBadge.className = "message-item__code";
      codeBadge.textContent = code;
      subjectEl.append(" ", codeBadge);
    }
    timeEl.textContent = formatDate(message.createdAt);
    fromEl.textContent = `보낸 사람: ${message.from || "알 수 없음"}`;
    introEl.textContent = message.intro || "미리보기가 없습니다.";

    if (message.id === state.activeMessageId) {
      button.classList.add("is-active");
    }

    button.addEventListener("click", () => openMessage(message.id));
    messageListEl.appendChild(fragment);
  });
}

function renderMessageDetail() {
  if (!state.activeMessage) {
    messageDetailEl.className = "detail-card empty-state";
    messageDetailEl.textContent = "메일을 클릭하면 발신자, 제목, 본문, 첨부파일이 여기에서 보입니다.";
    return;
  }

  const message = state.activeMessage;
  messageDetailEl.className = "detail-card";
  messageDetailEl.innerHTML = `
    <div class="detail-header">
      <h4 class="detail-title">${escapeHtml(message.subject || "(제목 없음)")}</h4>
    </div>
    <div class="detail-meta">
      <div>보낸 사람: ${escapeHtml(message.from || "알 수 없음")}</div>
      <div>받는 사람: ${escapeHtml((message.to || []).join(", ") || state.activeAddress)}</div>
      <div>수신 시각: ${escapeHtml(formatDate(message.createdAt))}</div>
      <div>메시지 ID: ${escapeHtml(message.messageId || "-")}</div>
    </div>
  `;

  const textBlock = document.createElement("section");
  textBlock.className = "detail-block";
  textBlock.innerHTML = "<strong>텍스트 본문</strong>";
  const textPre = document.createElement("pre");
  textPre.textContent = message.text || message.intro || "표시할 텍스트 본문이 없습니다.";
  textBlock.appendChild(textPre);
  messageDetailEl.appendChild(textBlock);

  if (message.html) {
    const htmlBlock = document.createElement("section");
    htmlBlock.className = "html-preview";
    htmlBlock.innerHTML = "<strong>HTML 미리보기</strong>";
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-same-origin");
    iframe.srcdoc = message.html;
    htmlBlock.appendChild(iframe);
    messageDetailEl.appendChild(htmlBlock);
  }

  if (Array.isArray(message.attachments) && message.attachments.length > 0) {
    const attachmentBlock = document.createElement("section");
    attachmentBlock.className = "detail-block";
    attachmentBlock.innerHTML = "<strong>첨부파일</strong>";

    const list = document.createElement("div");
    list.className = "attachment-list";

    message.attachments.forEach((attachment) => {
      const row = document.createElement("div");
      row.className = "attachment-item";

      const meta = document.createElement("div");
      meta.innerHTML = `
        <div class="attachment-item__name">${escapeHtml(attachment.filename || "unnamed")}</div>
        <div class="attachment-item__meta">${escapeHtml(attachment.contentType || "unknown")} ${attachment.size ? `· ${attachment.size} bytes` : ""}</div>
      `;

      row.appendChild(meta);

      if (attachment.downloadUrl) {
        const link = document.createElement("a");
        link.className = "attachment-link";
        link.href = attachment.downloadUrl;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = "다운로드";
        row.appendChild(link);
      }

      list.appendChild(row);
    });

    attachmentBlock.appendChild(list);
    messageDetailEl.appendChild(attachmentBlock);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeAddress(value) {
  return String(value || "").trim().toLowerCase();
}

function applyAliases(aliases) {
  state.aliases = Array.isArray(aliases) ? aliases.map(normalizeAddress).filter(Boolean) : [];
  renderAliases();
  renderStats();
  renderSessionCard();
}

async function loadAliasesFromDb() {
  const payload = await requestJson("/api/aliases");
  applyAliases(payload.aliases || []);
}

async function addAlias(address) {
  const normalized = normalizeAddress(address);
  if (!normalized) {
    return;
  }

  const payload = await requestJson("/api/aliases", {
    method: "POST",
    body: { address: normalized },
  });
  applyAliases(payload.aliases || []);
}

async function removeAlias(address) {
  const normalized = normalizeAddress(address);
  if (!normalized) {
    return;
  }

  const payload = await requestJson(`/api/aliases?address=${encodeURIComponent(normalized)}`, {
    method: "DELETE",
  });
  applyAliases(payload.aliases || []);

  if (state.activeAddress === normalized) {
    stopPolling();
    state.activeAddress = "";
    state.messages = [];
    state.activeMessage = null;
    state.activeMessageId = "";
    localStorage.removeItem(STORAGE_KEYS.activeLocalPart);
    localPartInputEl.value = "";
    updatePreview();
    renderCurrentInbox();
    renderMessages();
    renderMessageDetail();
    setStatus("선택 중인 주소를 목록에서 삭제했습니다.", "idle");
  }
}

function setActiveAddress(localPart) {
  const sanitized = sanitizeLocalPart(localPart);
  if (!sanitized) {
    setStatus("메일명을 먼저 입력해주세요.", "error");
    return false;
  }

  state.activeAddress = buildAddress(sanitized);
  localStorage.setItem(STORAGE_KEYS.activeLocalPart, sanitized);
  renderCurrentInbox();
  renderSessionCard();
  setStatus(`현재 주소를 ${state.activeAddress} 로 설정했습니다.`, "connected");
  return true;
}

async function loadMessages(showFeedback = true) {
  if (!state.activeAddress) {
    renderMessages();
    renderStats();
    return;
  }

  try {
    const payload = await requestJson(`/api/messages?address=${encodeURIComponent(state.activeAddress)}`);
    state.messages = Array.isArray(payload.messages) ? payload.messages : [];
    renderMessages();
    renderStats();

    if (state.activeMessageId) {
      const exists = state.messages.some((message) => message.id === state.activeMessageId);
      if (!exists) {
        state.activeMessageId = "";
        state.activeMessage = null;
      }
    }

    if (!state.activeMessageId && state.messages[0]) {
      await openMessage(state.messages[0].id, false);
    } else {
      renderMessageDetail();
    }

    if (showFeedback) {
      setStatus(`받은 메일 ${state.messages.length}개를 확인했습니다.`, "connected");
    } else if (payload.warning) {
      setStatus(`실시간 API 조회에 실패해 캐시를 보여줍니다: ${payload.warning}`, "idle");
    }
  } catch (error) {
    setStatus(`메일 목록을 불러오지 못했습니다: ${error.message}`, "error");
  }
}

async function openMessage(messageId, announce = true) {
  if (!state.activeAddress || !messageId) {
    return;
  }

  try {
    state.activeMessageId = messageId;
    renderMessages();
    const payload = await requestJson(
      `/api/messages/${encodeURIComponent(messageId)}?address=${encodeURIComponent(state.activeAddress)}`,
    );
    state.activeMessage = payload;
    renderMessageDetail();

    if (announce) {
      setStatus(`메일 한 건을 열었습니다: ${payload.subject || "(제목 없음)"}`, "connected");
    }
  } catch (error) {
    setStatus(`메일 상세를 불러오지 못했습니다: ${error.message}`, "error");
  }
}

function startPolling() {
  stopPolling();
  state.poller = window.setInterval(() => {
    loadMessages(false);
  }, AUTO_REFRESH_MS);
}

function stopPolling() {
  if (state.poller) {
    window.clearInterval(state.poller);
    state.poller = null;
  }
}

async function activateCurrentInput() {
  if (!setActiveAddress(localPartInputEl.value)) {
    return;
  }

  try {
    await addAlias(state.activeAddress);
  } catch (error) {
    setStatus(`주소 저장에 실패했습니다: ${error.message}`, "error");
    return;
  }

  await loadMessages(true);
  startPolling();
}

function bindEvents() {
  document.querySelector("#activateInboxBtn").addEventListener("click", activateCurrentInput);

  localPartInputEl.addEventListener("input", () => {
    const sanitized = sanitizeLocalPart(localPartInputEl.value);
    if (sanitized !== localPartInputEl.value) {
      localPartInputEl.value = sanitized;
    }
    updatePreview();
  });

  localPartInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      activateCurrentInput();
    }
  });
}

async function init() {
  bindEvents();
  renderCurrentInbox();
  renderSessionCard();
  renderAliases();
  renderMessages();
  renderMessageDetail();
  renderStats();
  setStatus("백엔드 구성을 확인하는 중입니다.", "idle");

  try {
    state.config = await requestJson("/api/config");
    previewDomainEl.textContent = `@${getInboxDomain()}`;
    renderSessionCard();
    renderStats();
    updatePreview();

    let aliasLoadError = "";
    try {
      await loadAliasesFromDb();
    } catch (error) {
      aliasLoadError = error.message || "주소 목록을 불러오지 못했습니다.";
      setStatus(`주소 목록을 불러오지 못했습니다: ${error.message}`, "error");
    }

    const savedLocalPart = sanitizeLocalPart(localStorage.getItem(STORAGE_KEYS.activeLocalPart) || "");
    localPartInputEl.value = savedLocalPart || "";
    updatePreview();
    if (savedLocalPart) {
      setActiveAddress(savedLocalPart);
      try {
        await addAlias(state.activeAddress);
      } catch {
        // 주소 선택은 유지하고 메일 조회는 계속 진행합니다.
      }
      await loadMessages(false);
      startPolling();
    } else {
      if (!aliasLoadError) {
        setStatus("원하는 메일명을 입력하고 주소 저장을 누르세요.", "idle");
      }
    }

    if (!aliasLoadError && state.config.sourceMode === "webhook-cache") {
      setStatus("RESEND_API_KEY 가 없어 webhook 캐시 모드로 동작합니다.", "idle");
    } else if (!aliasLoadError && !state.config.apiConfigured) {
      setStatus("RESEND_API_KEY 가 없어 메일 조회가 비활성화되어 있습니다.", "error");
    }
  } catch (error) {
    setStatus(`앱 초기화에 실패했습니다: ${error.message}`, "error");
  }
}

init();
