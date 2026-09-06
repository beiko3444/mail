const crypto = require('node:crypto');
const { decodeWords } = require('postal-mime');

function config() {
  const url = String(process.env.SUPABASE_URL || process.env.ALIASES_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ALIASES_SUPABASE_KEY || '').trim();
  return { url, key, table: String(process.env.MESSAGES_SUPABASE_TABLE || 'mail_messages').trim() || 'mail_messages' };
}

function isConfigured() {
  const { url, key } = config();
  return Boolean(url && key);
}

async function request(pathname, options = {}) {
  const { url, key } = config();
  if (!url || !key) throw new Error('메일 저장소가 설정되지 않았습니다.');
  const response = await fetch(`${url}/rest/v1/${pathname}`, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(6000)
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text }; }
  if (!response.ok) throw new Error(payload?.message || payload?.hint || `메일 저장소 요청 실패 (${response.status})`);
  return payload;
}

function normalize(row) {
  return {
    id: String(row.id),
    from: decodeWords(String(row.from_address || '')),
    to: [String(row.recipient || '').toLowerCase()],
    cc: [], bcc: [],
    subject: decodeWords(String(row.subject || '(제목 없음)')),
    text: String(row.text || ''),
    createdAt: row.received_at || row.created_at || ''
  };
}

async function listReceivedMessages(address, since = 0, before = '') {
  const { table } = config();
  const params = new URLSearchParams({
    select: 'id,recipient,from_address,subject,text,received_at',
    recipient: `eq.${String(address).toLowerCase()}`,
    received_at: `gte.${new Date(since - 5000).toISOString()}`,
    order: 'received_at.desc',
    limit: '100'
  });
  if (before) params.set('received_at', `lt.${before}`);
  const rows = await request(`${table}?${params}`);
  const messages = Array.isArray(rows) ? rows.map(normalize) : [];
  return { messages, partial: false, nextAfter: '' };
}

async function getReceivedMessage(id) {
  const { table } = config();
  const rows = await request(`${table}?${new URLSearchParams({ select: 'id,recipient,from_address,subject,text,received_at', id: `eq.${id}`, limit: '1' })}`);
  if (!Array.isArray(rows) || rows.length !== 1) {
    const error = new Error('메일을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }
  return normalize(rows[0]);
}

function equalSecret(actual, expected) {
  const a = Buffer.from(String(actual || ''));
  const b = Buffer.from(String(expected || ''));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

async function saveIncoming(payload) {
  const { table } = config();
  const id = String(payload?.id || '');
  const recipient = String(payload?.recipient || '').trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+$/.test(recipient) || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error('올바르지 않은 수신 메일입니다.');
  const body = [{
    id,
    recipient,
    from_address: String(payload?.from || '').trim().slice(0, 320),
    subject: String(payload?.subject || '(제목 없음)').slice(0, 1000),
    text: String(payload?.text || '').slice(0, 200000),
    received_at: new Date(payload?.receivedAt || Date.now()).toISOString()
  }];
  try {
    await request(`${table}?on_conflict=id`, { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body });
  } catch (error) {
    if (!String(error.message).includes('duplicate key')) throw error;
  }
}

module.exports = { isConfigured, listReceivedMessages, getReceivedMessage, saveIncoming, equalSecret };
