const { createHmac, randomInt, timingSafeEqual } = require('node:crypto');
const TTL = 86400000;
const COOKIE = 'xtmail_session';
const creationWindows = new Map();
const issuedAddresses = new Map();
const WORDS = ['amber','apple','bloom','cedar','cloud','coral','daisy','dawn','ember','field','flame','forest','fox','glow','harbor','hazel','ivory','lake','lemon','lunar','maple','meadow','mint','mist','moss','ocean','olive','pearl','pine','plum','river','rose','sage','shell','sky','solar','stone','sunny','tiger','violet','wave','willow','wind'];
function failure(message, status = 401) { return Object.assign(new Error(message), { status }); }
function secret() {
  const key = process.env.MAILBOX_SECRET || process.env.RESEND_API_KEY;
  if (!key) throw failure('메일 수신 서비스를 준비 중입니다. 잠시 후 다시 방문해 주세요.', 503);
  return createHmac('sha256', key).update('xtmail:mailbox:v1').digest();
}
function signature(payload) { return createHmac('sha256', secret()).update(payload).digest(); }
function randomWord() { return WORDS[randomInt(WORDS.length)]; }
function mailboxLocalPart() { return `${randomWord()}${randomWord()}${randomWord()}`; }
function isMailboxAddress(address) { return /^[a-z]{9,18}@[a-z0-9.-]+$/.test(address || ''); }
function issueMailbox(now = Date.now()) {
  const domain = process.env.INBOX_DOMAIN || 'inbox.xtracker.co.kr';
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw failure('메일 서비스를 준비 중입니다.', 503);
  for (const [address, expiresAt] of issuedAddresses) if (expiresAt <= now) issuedAddresses.delete(address);
  let address;
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `${mailboxLocalPart()}@${domain.toLowerCase()}`;
    if (!issuedAddresses.has(candidate)) { address = candidate; break; }
  }
  if (!address) throw failure('주소를 준비하지 못했습니다. 다시 시도해 주세요.', 503);
  issuedAddresses.set(address, now + TTL);
  const mailbox = { address, createdAt: now, expiresAt: now + TTL };
  const payload = Buffer.from(JSON.stringify(mailbox)).toString('base64url');
  return { mailbox, token: `${payload}.${signature(payload).toString('base64url')}` };
}
function verifyToken(token, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 2048) throw failure('메일함 이용기간이 끝났습니다. 새 주소를 만들어 주세요.');
  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))) throw failure('메일함을 확인할 수 없습니다.');
  const expected = signature(parts[0]);
  const actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw failure('메일함을 확인할 수 없습니다.');
  let mailbox;
  try { mailbox = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); } catch { throw failure('메일함을 확인할 수 없습니다.'); }
  if (!isMailboxAddress(mailbox.address) || !Number.isFinite(mailbox.createdAt) || !Number.isFinite(mailbox.expiresAt) || mailbox.expiresAt - mailbox.createdAt !== TTL || mailbox.createdAt > now + 5000 || mailbox.expiresAt <= now) throw failure('메일함 이용기간이 끝났습니다. 새 주소를 만들어 주세요.');
  return mailbox;
}
function requireMailbox(req) {
  const cookie = String(req.headers?.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='));
  if (!cookie) throw failure('주소를 먼저 만들어 주세요.');
  return verifyToken(cookie.slice(COOKIE.length + 1));
}
function issueScanCursor(after, mailbox) {
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(after)) throw failure('수신 목록을 이어서 확인하지 못했습니다.', 503);
  const payload = Buffer.from(JSON.stringify({ after, address:mailbox.address, createdAt:mailbox.createdAt, expiresAt:mailbox.expiresAt })).toString('base64url');
  return payload + '.' + signature('cursor:' + payload).toString('base64url');
}
function verifyScanCursor(token, mailbox) {
  if (token === undefined || token === '') return '';
  const invalid = () => failure('수신 목록의 조회 정보가 유효하지 않습니다. 다시 확인해 주세요.', 400);
  if (typeof token !== 'string' || token.length > 2048) throw invalid();
  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))) throw invalid();
  const expected = signature('cursor:' + parts[0]), actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw invalid();
  let cursor;
  try { cursor = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); } catch { throw invalid(); }
  if (!cursor || cursor.address !== mailbox.address || cursor.createdAt !== mailbox.createdAt || cursor.expiresAt !== mailbox.expiresAt || cursor.expiresAt <= Date.now() || !/^[a-zA-Z0-9_-]{1,200}$/.test(cursor.after)) throw invalid();
  return cursor.after;
}
function checkOrigin(req) {
  if (req.headers?.['sec-fetch-site'] === 'cross-site') throw failure('다른 사이트에서 보낸 요청은 허용되지 않습니다.', 403);
  if (req.headers?.origin) {
    let host;
    try { host = new URL(req.headers.origin).host; } catch { throw failure('요청 출처를 확인할 수 없습니다.', 403); }
    if (host !== req.headers.host) throw failure('다른 사이트에서 보낸 요청은 허용되지 않습니다.', 403);
  }
}
function setCookie(req, res, token) {
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers?.host || '');
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${token ? TTL / 1000 : 0}${local ? '' : '; Secure'}`);
}
function limitCreation(req) {
  // Per-instance burst protection; use a platform WAF for distributed limits.
  const address = process.env.VERCEL ? String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() : req.socket?.remoteAddress || 'local';
  const id = createHmac('sha256', secret()).update(address).digest('hex');
  const now = Date.now();
  for (const [key, value] of creationWindows) if (value.reset <= now) creationWindows.delete(key);
  let entry = creationWindows.get(id);
  if (!entry) {
    if (creationWindows.size >= 5000) throw failure('요청이 많습니다. 잠시 후 다시 시도해 주세요.', 429);
    entry = { reset: now + 60000, count: 0 }; creationWindows.set(id, entry);
  }
  if (++entry.count > 10) throw failure('주소를 너무 자주 만들고 있습니다. 1분 뒤 다시 시도해 주세요.', 429);
}
function belongsToMailbox(message, mailbox) {
  const time = Date.parse(message.createdAt);
  return [...(message.to || []), ...(message.cc || []), ...(message.bcc || [])].some(value => value.toLowerCase() === mailbox.address) && Number.isFinite(time) && time >= mailbox.createdAt - 5000 && time < mailbox.expiresAt;
}
module.exports = { issueMailbox, verifyToken, requireMailbox, setCookie, checkOrigin, limitCreation, belongsToMailbox, failure, issueScanCursor, verifyScanCursor };
