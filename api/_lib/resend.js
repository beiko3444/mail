const pageCache = new Map();
const CACHE_MS = 20000;
let nextRequestAt = 0;
let pendingRequests = 0;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function getAddressList(payload, key) {
  const values = Array.isArray(payload?.[key]) ? payload[key] : payload?.[key] ? [payload[key]] : [];
  return values.map(value => String(value?.address || value?.email || value).trim().toLowerCase());
}
function plainText(html) {
  return String(html || '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(?:br|\/p|\/div|\/tr|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}
function normalizeMessage(payload) {
  return { id: payload.id || payload.email_id, from: String(payload.from?.address || payload.from || ''),
    to: getAddressList(payload,'to'), cc: getAddressList(payload,'cc'), bcc: getAddressList(payload,'bcc'),
    subject: String(payload.subject || '(제목 없음)').slice(0,1000),
    createdAt: payload.created_at || payload.createdAt || '',
    text: String(payload.text || plainText(payload.html) || '').slice(0,200000) };
}
async function resendRequest(pathname) {
  if (!process.env.RESEND_API_KEY) throw new Error('Receiving unavailable');
  // Bound admission and include waiting in the timeout. This throttle is per instance.
  const delay = Math.max(0, nextRequestAt - Date.now());
  if (pendingRequests >= 8 || delay > 3000) throw new Error('Receiving provider busy');
  nextRequestAt = Date.now() + delay + 550;
  pendingRequests++;
  try {
    await wait(delay);
    const response = await fetch('https://api.resend.com' + pathname, {
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY },
      signal: AbortSignal.timeout(Math.max(1, 6000 - delay))
    });
    if (!response.ok) throw new Error('Receiving provider unavailable');
    return JSON.parse(await response.text());
  } finally { pendingRequests--; }
}
function getPage(after) {
  const key = after || '';
  const now = Date.now();
  for (const [id, entry] of pageCache) if (entry.expiresAt <= now) pageCache.delete(id);
  const cached = pageCache.get(key);
  if (cached) return cached.promise;
  if (pageCache.size >= 64) pageCache.delete(pageCache.keys().next().value);
  const entry = { expiresAt: now + CACHE_MS };
  entry.promise = resendRequest('/emails/receiving?limit=100' + (after ? '&after=' + encodeURIComponent(after) : ''))
    .catch(error => { if (pageCache.get(key) === entry) pageCache.delete(key); throw error; });
  pageCache.set(key, entry);
  return entry.promise;
}
async function listReceivedMessages(address, since = 0) {
  const messages = [];
  let after = '', partial = false;
  const started = Date.now();
  for (let page = 0; page < 10; page++) {
    const payload = await getPage(after);
    const data = Array.isArray(payload?.data) ? payload.data : [];
    for (const raw of data) {
      const message = normalizeMessage(raw);
      if ([...message.to,...message.cc,...message.bcc].includes(address.toLowerCase()) && Date.parse(message.createdAt) >= since - 5000) messages.push(message);
    }
    const oldest = data.at(-1);
    if (!payload?.has_more || !oldest || Date.parse(oldest.created_at) < since - 5000) { partial = false; break; }
    partial = true;
    if (Date.now() - started > 6000 || oldest.id === after) break;
    after = oldest.id;
  }
  return { messages: [...new Map(messages.map(m => [m.id,m])).values()].sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt)), partial };
}
async function getReceivedMessage(id) { return normalizeMessage(await resendRequest('/emails/receiving/' + encodeURIComponent(id))); }
function messageTargetsAddress(message,address) { return [...message.to,...message.cc,...message.bcc].includes(address.toLowerCase()); }
module.exports = { listReceivedMessages, getReceivedMessage, messageTargetsAddress };
