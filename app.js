(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { mailbox: null, messages: [], revision: 0, detailRevision: 0, listRevision: 0, busy: false, ready: false, polling: null, failures: 0, selected: '' };
  const formatDate = value => new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
  function status(message,error=false) { $('statusText').textContent=message; $('statusText').classList.toggle('is-error',error); }
  async function request(path,method='GET') {
    const response=await fetch(path,{method,credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok) throw Object.assign(new Error(payload.error || '연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.'),{status:response.status});
    return payload;
  }
  function controls() {
    $('createBtn').disabled=state.busy || !state.ready;
    $('createBtn').textContent=state.busy?'처리 중…':state.mailbox?'새 주소 만들기 ↗':'무료 주소 만들기 ↗';
    for(const id of ['copyBtn','refreshBtn','closeBtn']) $(id).disabled=state.busy || !state.mailbox;
    $('emailAddress').value=state.mailbox?.address || '';
  }
  function empty(target,title,text) {
    target.replaceChildren();
    const box=document.createElement('div'); box.className='empty-state';
    const heading=document.createElement('h3'); heading.textContent=title;
    const paragraph=document.createElement('p'); paragraph.textContent=text;
    box.append(heading,paragraph); target.append(box);
  }
  function clearMailbox() {
    state.revision++; state.detailRevision++; state.mailbox=null; state.messages=[]; state.selected='';
    clearTimeout(state.polling); controls(); renderMessages();
    empty($('messageDetail'),'메일을 선택해 주세요','메일 본문은 외부 이미지를 불러오지 않고 텍스트로 보여드립니다.');
    $('expiryText').textContent='주소 발급 후 24시간 이용';
  }
  function setMailbox(mailbox) { clearMailbox(); state.mailbox=mailbox; controls(); countdown(); }
  function renderMessages() {
    $('messageCount').textContent=String(state.messages.length);
    if(!state.messages.length) return empty($('messageList'),'아직 메일이 없어요',state.mailbox?'메일이 도착하면 이곳에 표시됩니다.':'무료 주소를 만든 뒤 필요한 곳에 입력해 주세요.');
    $('messageList').replaceChildren();
    for(const message of state.messages) {
      const button=document.createElement('button'); button.type='button'; button.className='message-item'+(state.selected===message.id?' selected':'');
      button.setAttribute('aria-pressed',String(state.selected===message.id));
      const subject=document.createElement('strong'); subject.textContent=message.subject;
      const sender=document.createElement('span'); sender.textContent=message.from;
      const time=document.createElement('time'); time.dateTime=message.createdAt; time.textContent=formatDate(message.createdAt);
      button.append(sender,subject,time); button.addEventListener('click',()=>openMessage(message.id)); $('messageList').append(button);
    }
  }
  async function openMessage(id) {
    const revision=state.revision, detailRevision=++state.detailRevision;
    state.selected=id; renderMessages(); empty($('messageDetail'),'메일을 여는 중…','잠시 기다려 주세요.');
    try {
      const message=await request('/api/messages/'+encodeURIComponent(id));
      if(revision!==state.revision || detailRevision!==state.detailRevision) return;
      if(message.address!==state.mailbox?.address) return restore();
      const target=$('messageDetail'); target.replaceChildren();
      const title=document.createElement('h3'); title.textContent=message.subject;
      const meta=document.createElement('p'); meta.className='detail-meta'; meta.textContent=message.from+' · '+formatDate(message.createdAt);
      const body=document.createElement('pre'); body.textContent=message.text || '표시할 텍스트 본문이 없습니다. 이 무료 버전은 HTML 원문과 첨부파일을 열지 않습니다.';
      target.append(title,meta,body);
      const code=message.text?.match(/(?:인증(?:번호|코드)|verification code|passcode|OTP)[^\d]{0,30}(\d{4,8})\b/i)?.[1];
      if(code) {
        const copy=document.createElement('button');copy.type='button';copy.className='code-copy';copy.textContent='인증번호 '+code+' 복사';
        copy.addEventListener('click',()=>copyText(code));target.insertBefore(copy,body);
      }
    } catch(error) { if(revision===state.revision && detailRevision===state.detailRevision) { empty($('messageDetail'),'메일을 열지 못했습니다',error.message); if(error.status===401) {clearMailbox();status(error.message,true);} } }
  }
  async function loadMessages() {
    if(!state.mailbox || state.busy || document.hidden) return;
    const revision=state.revision, listRevision=++state.listRevision;
    try {
      const payload=await request('/api/messages');
      if(revision!==state.revision || listRevision!==state.listRevision) return;
      if(payload.address!==state.mailbox?.address) return restore();
      state.messages=payload.partial?[...new Map([...state.messages,...payload.messages].map(m=>[m.id,m])).values()]:payload.messages;
      state.messages.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
      state.failures=0; renderMessages();
      status(payload.partial?'메일이 많아 일부 목록만 확인했습니다. 잠시 후 다시 새로고침해 주세요.':state.messages.length?'받은 메일을 확인했습니다.':'새 메일을 기다리고 있습니다.');
    } catch(error) {
      if(revision!==state.revision || listRevision!==state.listRevision) return;
      state.failures++; if(error.status===401) clearMailbox();
      status(error.message,true);
    }
  }
  function schedule() {
    clearTimeout(state.polling);
    if(state.mailbox && !document.hidden) state.polling=setTimeout(async()=>{await loadMessages();schedule();},Math.min(20000*2**state.failures,120000));
  }
  function countdown() {
    if(!state.mailbox) return;
    const remaining=state.mailbox.expiresAt-Date.now();
    if(remaining<=0) {clearMailbox();status('메일함 이용기간이 끝났습니다. 새 주소를 만들어 주세요.');return;}
    const minutes=Math.ceil(remaining/60000);
    $('expiryText').textContent='남은 시간 '+Math.floor(minutes/60)+'시간 '+minutes%60+'분';
  }
  function confirmAction(title) {
    $('confirmTitle').textContent=title;
    return new Promise(resolve=>{
      const dialog=$('confirmDialog');
      dialog.returnValue='';
      dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true});
      dialog.showModal();
    });
  }
  async function mutate(method) {
    if(state.busy) return;
    state.busy=true;state.revision++;clearTimeout(state.polling);controls();
    try {
      if(state.mailbox && !(await confirmAction(method==='DELETE'?'메일함을 닫을까요?':'새 주소를 만들까요?'))) return;
      const payload=await request('/api/mailbox',method);
      setMailbox(payload.mailbox);
      status(payload.mailbox?'주소를 복사해 사용해 보세요.':'이 브라우저에서 메일함 접근 정보를 지웠습니다.');
    } catch(error) {status(error.message,true);}
    finally {state.busy=false;controls();await loadMessages();schedule();}
  }
  async function copyText(value) {
    try {await navigator.clipboard.writeText(value);status('복사했습니다.');}
    catch { $('emailAddress').focus();$('emailAddress').select();status('복사가 허용되지 않았습니다. 선택된 주소를 직접 복사해 주세요.',true); }
  }
  async function restore() {
    if(state.busy) return;
    const revision=++state.revision;
    try {const payload=await request('/api/mailbox');if(revision!==state.revision || state.busy)return;setMailbox(payload.mailbox);status(payload.mailbox?'메일함을 다시 열었습니다.':'무료 주소 만들기를 눌러 시작하세요.');await loadMessages();schedule();}
    catch(error) {if(revision===state.revision)status(error.message,true);}
  }
  $('createBtn').addEventListener('click',()=>mutate('POST'));
  $('closeBtn').addEventListener('click',()=>mutate('DELETE'));
  $('copyBtn').addEventListener('click',()=>state.mailbox && copyText(state.mailbox.address));
  $('refreshBtn').addEventListener('click',async()=>{clearTimeout(state.polling);$('refreshBtn').disabled=true;await loadMessages();controls();schedule();});
  document.addEventListener('visibilitychange',()=>{clearTimeout(state.polling);if(!document.hidden) restore();});
  setInterval(countdown,1000);
  request('/api/config').then(async config=>{if(config.apiConfigured){await restore();state.ready=true;controls();}else status('메일 수신 서비스를 준비 중입니다. 잠시 후 다시 방문해 주세요.');}).catch(error=>status(error.message,true));
})();
