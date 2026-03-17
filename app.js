const AUTO_REFRESH_MS = 15000;
const STORAGE_KEYS = {
  activeLocalPart: "xtracker-active-local-part",
  aliases: "xtracker-saved-aliases",
};

const WORDS_A = ["alpha", "beacon", "core", "delta", "lumen", "signal", "orbit", "echo"];
const WORDS_B = ["desk", "mail", "team", "spot", "flow", "note", "pilot", "lane"];

const state = {
  config: null,
  activeAddress: "",
  aliases: loadAliases(),
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

function loadAliases() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.aliases);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAliases() {
  localStorage.setItem(STORAGE_KEYS.aliases, JSON.stringify(state.aliases));
}

function sanitizeLocalPart(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function createRandomLocalPart() {
  const number = Math.floor(Math.random() * 900 + 100);
  return `${pick(WORDS_A)}-${pick(WORDS_B)}-${number}`;
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

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "요청에 실패했습니다.");
  }

  return payload;
}

function setStatus(message, tone = "idle") {
  statusTextEl.textContent = message;
  connectionBadgeEl.className = `status-badge is-${tone}`;
  connectionBadgeEl.textContent = tone === "connected" ? "연결됨" : tone === "error" ? "오류" : "대기";
}

function updatePreview() {
  const localPart = sanitizeLocalPart(localPartInputEl.value) || "your-alias";
  previewLocalEl.textContent = localPart;
  previewDomainEl.textContent = `@${getInboxDomain()}`;
}

function getModeLabel() {
  if (state.config?.sourceMode === "webhook-cache") {
    return "Webhook";
  }
  if (state.config?.apiConfigured) {
    return "Live API";
  }
  return "Setup Needed";
}

function getModeDescription() {
  if (state.config?.sourceMode === "webhook-cache") {
    return "Webhook Cache Only";
  }
  if (state.config?.apiConfigured) {
    return "Resend Received Emails API";
  }
  return "Disabled (RESEND_API_KEY required)";
}

function renderStats() {
  messageCountEl.textContent = `${state.messages.length}`;
  modeLabelEl.textContent = getModeLabel();
  aliasCountEl.textContent = `${state.aliases.length}`;
}

function renderCurrentInbox() {
  if (!state.activeAddress) {
    currentInboxEl.textContent = "주소를 설정해보세요";
    inboxHintEl.textContent = "Resend 설정이 끝났으면 원하는 local-part를 입력해 메일을 받아보세요.";
    return;
  }

  currentInboxEl.textContent = state.activeAddress;
  inboxHintEl.textContent = `${Math.floor(AUTO_REFRESH_MS / 1000)}초마다 해당 주소의 메일을 다시 확인합니다.`;
}

function renderSessionCard() {
  if (!state.config) {
    sessionCardEl.className = "session-card empty-state";
    sessionCardEl.textContent = "서버 설정을 불러오는 중입니다.";
    return;
  }

  sessionCardEl.className = "session-card";
  sessionCardEl.innerHTML = `
    <div class="session-row">
      <span class="session-row__label">Inbox Domain</span>
      <strong class="session-row__value">${escapeHtml(getInboxDomain())}</strong>
    </div>
    <div class="session-row">
      <span class="session-row__label">Mode</span>
      <strong class="session-row__value">${getModeDescription()}</strong>
    </div>
    <div class="session-row">
      <span class="session-row__label">Webhook Path</span>
      <strong class="session-row__value">${escapeHtml(state.config.webhookPath)}</strong>
    </div>
    <div class="session-row">
      <span class="session-row__label">Current Address</span>
      <strong class="session-row__value">${escapeHtml(state.activeAddress || "아직 선택되지 않음")}</strong>
    </div>
    <div class="session-row">
      <span class="session-row__label">Saved Aliases</span>
      <strong class="session-row__value">${state.aliases.length}개</strong>
    </div>
  `;
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

    item.dataset.address = address;
    addressEl.textContent = address;
    metaEl.textContent = address === state.activeAddress ? "현재 보고 있는 주소" : "클릭해서 이 주소의 메일함 열기";

    if (address === state.activeAddress) {
      item.classList.add("is-active");
    }

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

    subjectEl.textContent = message.subject || "(제목 없음)";
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

function addAlias(address) {
  if (!address) {
    return;
  }

  state.aliases = [address, ...state.aliases.filter((item) => item !== address)].slice(0, 100);
  saveAliases();
  renderAliases();
  renderStats();
  renderSessionCard();
}

function removeAlias(address) {
  state.aliases = state.aliases.filter((item) => item !== address);
  saveAliases();

  if (state.activeAddress === address) {
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

  renderAliases();
  renderStats();
  renderSessionCard();
}

function setActiveAddress(localPart) {
  const sanitized = sanitizeLocalPart(localPart);
  if (!sanitized) {
    setStatus("local-part 를 먼저 입력해주세요.", "error");
    return false;
  }

  state.activeAddress = buildAddress(sanitized);
  localStorage.setItem(STORAGE_KEYS.activeLocalPart, sanitized);
  addAlias(state.activeAddress);
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
    const payload = await fetchJson(`/api/messages?address=${encodeURIComponent(state.activeAddress)}`);
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
    const payload = await fetchJson(`/api/messages/${encodeURIComponent(messageId)}?address=${encodeURIComponent(state.activeAddress)}`);
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

async function copyCurrentAddress() {
  if (!state.activeAddress) {
    setStatus("먼저 주소를 적용해주세요.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(state.activeAddress);
    setStatus("현재 주소를 복사했습니다.", "connected");
  } catch {
    setStatus("클립보드 복사에 실패했습니다. 로컬 서버에서 다시 시도해주세요.", "error");
  }
}

function clearCurrentAddress() {
  stopPolling();
  state.activeAddress = "";
  state.messages = [];
  state.activeMessage = null;
  state.activeMessageId = "";
  localStorage.removeItem(STORAGE_KEYS.activeLocalPart);
  renderCurrentInbox();
  renderSessionCard();
  renderAliases();
  renderMessages();
  renderMessageDetail();
  renderStats();
  setStatus("현재 주소 선택만 해제했습니다. 저장 목록은 유지됩니다.", "idle");
}

async function activateCurrentInput() {
  if (!setActiveAddress(localPartInputEl.value)) {
    return;
  }

  await loadMessages(true);
  startPolling();
}

function bindEvents() {
  document.querySelector("#activateInboxBtn").addEventListener("click", activateCurrentInput);
  document.querySelector("#applyAliasBtn").addEventListener("click", activateCurrentInput);
  document.querySelector("#randomAliasBtn").addEventListener("click", async () => {
    localPartInputEl.value = createRandomLocalPart();
    updatePreview();
    await activateCurrentInput();
  });
  document.querySelector("#refreshBtn").addEventListener("click", () => loadMessages(true));
  document.querySelector("#copyAddressBtn").addEventListener("click", copyCurrentAddress);
  document.querySelector("#clearAliasBtn").addEventListener("click", clearCurrentAddress);

  aliasListEl.addEventListener("click", async (event) => {
    const item = event.target.closest(".alias-item");
    if (!item) {
      return;
    }

    const address = item.dataset.address || "";
    if (!address) {
      return;
    }

    if (event.target.closest(".alias-remove-btn")) {
      event.preventDefault();
      event.stopPropagation();
      removeAlias(address);
      return;
    }

    if (event.target.closest(".alias-open-btn") || !event.target.closest("button")) {
      const localPart = address.split("@")[0] || "";
      localPartInputEl.value = localPart;
      updatePreview();
      await activateCurrentInput();
    }
  });

  localPartInputEl.addEventListener("input", () => {
    const sanitized = sanitizeLocalPart(localPartInputEl.value);
    if (sanitized !== localPartInputEl.value) {
      localPartInputEl.value = sanitized;
    }
    updatePreview();
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
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
    state.config = await fetchJson("/api/config");
    previewDomainEl.textContent = `@${getInboxDomain()}`;
    renderSessionCard();
    renderStats();
    updatePreview();

    const savedLocalPart = sanitizeLocalPart(localStorage.getItem(STORAGE_KEYS.activeLocalPart) || "");
    localPartInputEl.value = savedLocalPart || createRandomLocalPart();
    updatePreview();
    if (savedLocalPart) {
      setActiveAddress(savedLocalPart);
      await loadMessages(false);
      startPolling();
    } else {
      setStatus("원하는 local-part를 입력하거나 랜덤 주소를 눌러 시작하세요.", "idle");
    }

    if (state.config.sourceMode === "webhook-cache") {
      setStatus("RESEND_API_KEY 가 없어 webhook 캐시 모드로 동작합니다.", "idle");
    } else if (!state.config.apiConfigured) {
      setStatus("RESEND_API_KEY 가 없어 메일 조회가 비활성화되어 있습니다.", "error");
    }
  } catch (error) {
    setStatus(`앱 초기화에 실패했습니다: ${error.message}`, "error");
  }
}

init();
