(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { mailbox: null, messages: [], nextCursor: null, revision: 0, detailRevision: 0, detailLoading: false, listRevision: 0, busy: false, ready: false, booting: false, polling: null, failures: 0, selected: '', rendered: '', buttons: new Map(), retry: 'initialize' };
  const formatDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '수신 시각 없음' : new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  };
  function status(message, error = false) {
    $('statusText').textContent = message;
    $('statusText').classList.toggle('is-error', error);
    $('statusDot').dataset.state = error ? 'error' : state.mailbox ? 'active' : 'idle';
    $('retryBtn').hidden = !error;
    if (error && state.mailbox) $('syncText').textContent = '연결을 확인하고 있어요. 잠시 후 자동으로 다시 시도해요.';
  }
  async function request(path, method = 'GET') {
    const response = await fetch(path, { method, credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(12000) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload.error || '연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.'), { status: response.status });
    return payload;
  }
  function controls() {
    const active = Boolean(state.mailbox);
    $('mailboxCard').dataset.hasMailbox = String(active);
    $('createBtn').disabled = state.busy || !state.ready;
    $('createBtn').textContent = state.busy ? '처리 중…' : active ? '새 주소' : '무료 주소 만들기';
    $('createBtn').className = 'button create-button ' + (active ? 'button-light' : 'button-primary');
    for (const id of ['copyBtn', 'refreshBtn', 'closeBtn']) $(id).disabled = state.busy || !active;
    $('copyBtn').hidden = !active;
    $('closeBtn').hidden = !active;
    $('expiryProgress').hidden = !active;
    $('retryBtn').disabled = state.busy || state.booting;
    $('emailAddress').value = state.mailbox?.address || '';
    $('mailboxCard').setAttribute('aria-busy', String(state.busy || state.booting));
  }
  function empty(target, title, text, action) {
    target.replaceChildren();
    const box = document.createElement('div'); box.className = 'empty-state';
    const symbol = document.createElement('span'); symbol.className = 'empty-symbol'; symbol.textContent = '✉'; symbol.setAttribute('aria-hidden', 'true');
    const heading = document.createElement('h3'); heading.textContent = title;
    const paragraph = document.createElement('p'); paragraph.textContent = text;
    box.append(symbol, heading, paragraph);
    if (action) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'button button-light'; button.textContent = action.label;
      button.addEventListener('click', action.run); box.append(button);
    }
    target.append(box);
  }
  function setView(view) {
    $('inboxWorkspace').dataset.view = view;
    $('detailPanel').hidden = view !== 'detail';
  }
  function clearMailbox() {
    state.revision++; state.detailRevision++; state.detailLoading = false; state.mailbox = null; state.messages = []; state.nextCursor = null; state.selected = ''; state.rendered = '';
    if ($('copyDialog').open) $('copyDialog').close();
    $('manualCopyText').value = '';
    clearTimeout(state.polling); setView('list'); controls(); renderMessages();
    $('messageDetail').replaceChildren();
    $('expiryText').textContent = '발급한 순간부터 24시간 이용';
    $('syncText').textContent = '주소를 만들면 새 메일을 자동으로 확인해요.';
    $('copyLabel').textContent = '주소 복사';
  }
  function setMailbox(mailbox) { clearMailbox(); state.mailbox = mailbox; controls(); renderMessages(); countdown(); }
  function renderMessages() {
    $('messageCount').textContent = String(state.messages.length);
    const fingerprint = JSON.stringify([Boolean(state.mailbox), state.selected, state.messages]);
    if (fingerprint === state.rendered) return;
    state.rendered = fingerprint;
    const focusedId = document.activeElement?.dataset?.messageId;
    state.buttons.clear();
    if (!state.messages.length) {
      return empty($('messageList'), state.mailbox ? '새 메일을 기다리고 있어요' : '첫 메일을 받을 준비',
        state.mailbox ? '주소를 복사해 사용해 보세요. 도착한 메일은 여기에 자동으로 표시돼요.' : '위에서 무료 주소를 만들면 도착한 메일을 여기서 확인할 수 있어요.');
    }
    $('messageList').replaceChildren();
    for (const message of state.messages) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'message-item' + (state.selected === message.id ? ' selected' : '');
      button.dataset.messageId = message.id; button.setAttribute('aria-pressed', String(state.selected === message.id));
      const avatar = document.createElement('span'); avatar.className = 'sender-avatar'; avatar.textContent = (message.from || '?').replace(/["<]/g, '').slice(0, 1).toUpperCase(); avatar.setAttribute('aria-hidden', 'true');
      const info = document.createElement('span'); info.className = 'message-summary';
      const sender = document.createElement('span'); sender.className = 'message-sender'; sender.textContent = message.from || '발신자 없음';
      const subject = document.createElement('strong'); subject.textContent = message.subject || '(제목 없음)';
      const time = document.createElement('time'); time.dateTime = message.createdAt; time.textContent = formatDate(message.createdAt);
      const arrow = document.createElement('span'); arrow.className = 'message-arrow'; arrow.textContent = '›'; arrow.setAttribute('aria-hidden', 'true');
      info.append(sender, subject); button.append(avatar, info, time, arrow);
      button.addEventListener('click', () => openMessage(message.id));
      state.buttons.set(message.id, button); $('messageList').append(button);
    }
    if (focusedId) state.buttons.get(focusedId)?.focus();
  }
  async function openMessage(id) {
    const revision = state.revision, detailRevision = ++state.detailRevision;
    state.selected = id; state.detailLoading = true; renderMessages(); setView('detail');
    empty($('messageDetail'), '메일을 열고 있어요', '잠시만 기다려 주세요.');
    $('messageDetail').setAttribute('aria-busy', 'true'); $('messageDetail').focus();
    try {
      const message = await request('/api/messages/' + encodeURIComponent(id));
      if (revision !== state.revision || detailRevision !== state.detailRevision) return;
      if (message.address !== state.mailbox?.address) return restore();
      const target = $('messageDetail'); target.replaceChildren();
      const title = document.createElement('h3'); title.textContent = message.subject || '(제목 없음)';
      const meta = document.createElement('p'); meta.className = 'detail-meta'; meta.textContent = (message.from || '발신자 없음') + ' · ' + formatDate(message.createdAt);
      const body = document.createElement('pre'); body.textContent = message.text || '표시할 텍스트가 없어요. HTML 원문과 첨부파일은 지원하지 않습니다.';
      target.append(title, meta, body);
      const code = message.text?.match(/(?:인증(?:번호|코드)|verification code|passcode|OTP)[^\d]{0,30}(\d{4,8})\b/i)?.[1];
      if (code) {
        const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'code-copy'; copy.textContent = '인증번호 ' + code + ' 복사';
        copy.addEventListener('click', () => copyText(code, copy, '인증번호 ' + code + ' 복사')); target.insertBefore(copy, body);
      }
    } catch (error) {
      if (revision !== state.revision || detailRevision !== state.detailRevision) return;
      if (error.status === 401) { clearMailbox(); state.retry = 'restore'; status('메일함 접근을 확인할 수 없어요. 새로 확인해 주세요.', true); }
      else empty($('messageDetail'), '메일을 열지 못했어요', error.message, { label: '다시 열기', run: () => openMessage(id) });
    } finally {
      if (revision === state.revision && detailRevision === state.detailRevision) { state.detailLoading = false; $('messageDetail').setAttribute('aria-busy', 'false'); }
    }
  }
  function backToList() {
    const selected = state.selected;
    state.detailRevision++; state.detailLoading = false; state.selected = ''; renderMessages(); setView('list');
    $('messageDetail').replaceChildren(); $('messageDetail').setAttribute('aria-busy', 'false');
    state.buttons.get(selected)?.focus();
  }
  async function loadMessages() {
    if (!state.mailbox || state.busy || document.hidden) return;
    const revision = state.revision, listRevision = ++state.listRevision;
    const cursor = state.nextCursor;
    try {
      const payload = await request('/api/messages' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''));
      if (revision !== state.revision || listRevision !== state.listRevision) return;
      if (payload.address !== state.mailbox?.address) return restore();
      state.messages = payload.partial || cursor ? [...new Map([...state.messages, ...payload.messages].map(m => [m.id, m])).values()] : payload.messages;
      state.nextCursor = payload.nextCursor || null;
      state.messages.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      state.failures = 0; renderMessages();
      status(payload.partial ? '수신량이 많아 목록을 나누어 확인하고 있어요. 새로고침하면 이어서 확인해요.' : state.messages.length ? '메일이 도착했어요. 목록에서 열어 보세요.' : '주소를 복사해 사용해 보세요. 새 메일을 기다리고 있어요.');
      $('syncText').textContent = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date()) + ' 확인 · 20초마다 자동 확인';
    } catch (error) {
      if (revision !== state.revision || listRevision !== state.listRevision) return;
      state.failures++; state.retry = 'messages';
      if (error.status === 400) state.nextCursor = null;
      if (error.status === 401) { clearMailbox(); state.retry = 'restore'; }
      status(error.message, true);
    }
  }
  function schedule() {
    clearTimeout(state.polling);
    if (state.mailbox && !document.hidden) state.polling = setTimeout(async () => { if (state.retry === 'restore') await restore(); else await loadMessages(); schedule(); }, Math.min(20000 * 2 ** state.failures, 120000));
  }
  function countdown() {
    if (!state.mailbox) return;
    const remaining = state.mailbox.expiresAt - Date.now();
    if (remaining <= 0) { clearMailbox(); status('24시간 이용이 끝났어요. 새 주소로 다시 시작해 주세요.'); return; }
    const minutes = Math.ceil(remaining / 60000);
    $('expiryText').textContent = '남은 시간 ' + Math.floor(minutes / 60) + '시간 ' + minutes % 60 + '분';
    $('expiryProgress').value = remaining;
  }
  function confirmAction(method) {
    const closing = method === 'DELETE';
    $('confirmTitle').textContent = closing ? '메일함을 닫을까요?' : '새 주소를 만들까요?';
    $('confirmAction').textContent = closing ? '메일함 닫기' : '새 주소 만들기';
    $('confirmText').textContent = closing
      ? '현재 주소와 받은 메일을 이 브라우저에서 다시 열 수 없어요. 필요한 내용을 먼저 확인해 주세요. 수신 업체의 원본 메일까지 즉시 삭제되지는 않습니다.'
      : '현재 주소 대신 새 주소를 만들어요. 기존 메일함을 이 브라우저에서 다시 열 수 없으니 필요한 내용을 먼저 확인해 주세요. 수신 업체의 원본 메일까지 즉시 삭제되지는 않습니다.';
    return new Promise(resolve => {
      const dialog = $('confirmDialog'); dialog.returnValue = '';
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }); dialog.showModal();
    });
  }
  async function mutate(method) {
    if (state.busy || !state.ready) return;
    state.busy = true; state.revision++; clearTimeout(state.polling); controls();
    try {
      if (state.mailbox && !(await confirmAction(method))) return;
      const payload = await request('/api/mailbox', method);
      setMailbox(payload.mailbox);
      status(payload.mailbox ? '내 임시 이메일이 준비됐어요. 주소를 복사해 보세요.' : '메일함을 닫았어요. 필요할 때 새 주소를 만들 수 있어요.');
    } catch (error) { state.retry = 'restore'; status(error.message, true); }
    finally {
      state.busy = false; controls(); await loadMessages();
      if (state.mailbox && state.detailLoading && state.selected) openMessage(state.selected);
      schedule();
    }
  }
  async function copyText(value, label, original) {
    const revision = state.revision;
    try {
      await navigator.clipboard.writeText(value);
      if (revision !== state.revision || !state.mailbox) return;
      label.textContent = '복사 완료';
      // Feedback belongs to the clicked control, independently of background polling.
      const restoreLabel = () => { if (label.textContent === '복사 완료') label.textContent = original; };
      label.addEventListener('pointerleave', restoreLabel, { once: true });
      label.addEventListener('blur', restoreLabel, { once: true });
    } catch {
      if (revision !== state.revision || !state.mailbox) return;
      $('manualCopyText').value = value;
      if (!$('copyDialog').open) $('copyDialog').showModal();
      $('manualCopyText').focus(); $('manualCopyText').select();
    }
  }
  async function restore() {
    if (state.busy) return false;
    const revision = ++state.revision;
    try {
      const payload = await request('/api/mailbox');
      if (revision !== state.revision || state.busy) return false;
      // Preserve an open message when returning to the same mailbox.
      if (payload.mailbox?.address !== state.mailbox?.address || !payload.mailbox) setMailbox(payload.mailbox);
      else {
        state.mailbox = payload.mailbox; controls(); countdown();
        if (state.mailbox && state.detailLoading && state.selected) openMessage(state.selected);
      }
      state.ready = true; state.retry = 'messages'; controls();
      status(payload.mailbox ? '메일함을 이어서 사용할 수 있어요.' : '무료 주소 만들기를 눌러 시작하세요.');
      await loadMessages(); schedule();
      return true;
    } catch (error) {
      if (revision === state.revision) { state.ready = false; state.failures++; state.retry = 'restore'; controls(); status(error.message, true); schedule(); }
      return false;
    }
  }
  async function initialize() {
    if (state.booting) return;
    state.booting = true; state.ready = false; controls(); status('메일 서비스를 확인하고 있어요.');
    try {
      const config = await request('/api/config');
      if (!config.apiConfigured) { state.retry = 'initialize'; status('메일 수신 서비스를 준비 중이에요. 잠시 후 다시 확인해 주세요.', true); return; }
      await restore();
    } catch (error) { state.retry = 'initialize'; status(error.message, true); }
    finally { state.booting = false; controls(); }
  }
  $('createBtn').addEventListener('click', () => mutate('POST'));
  $('closeBtn').addEventListener('click', () => mutate('DELETE'));
  $('copyBtn').addEventListener('click', () => state.mailbox && copyText(state.mailbox.address, $('copyLabel'), '주소 복사'));
  $('backBtn').addEventListener('click', backToList);
  $('copyDialog').addEventListener('close', () => { $('manualCopyText').value = ''; });
  $('refreshBtn').addEventListener('click', async () => {
    clearTimeout(state.polling); $('refreshBtn').disabled = true; $('refreshLabel').textContent = '확인 중…';
    await loadMessages(); $('refreshLabel').textContent = '새로고침'; controls(); schedule();
  });
  $('retryBtn').addEventListener('click', async () => {
    $('retryBtn').disabled = true;
    if (state.retry === 'initialize') await initialize();
    else if (state.retry === 'restore') await restore();
    else await loadMessages();
    controls(); schedule();
  });
  document.addEventListener('visibilitychange', () => { clearTimeout(state.polling); if (!document.hidden && !state.booting) { if (state.retry === 'initialize') initialize(); else restore(); } });
  setInterval(countdown, 1000);
  initialize();
})();
