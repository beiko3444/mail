function header(raw, name) {
  const match = raw.match(new RegExp(`^${name}:\\s*([^\\r\\n]*(?:\\r?\\n[ \\t]+[^\\r\\n]*)*)`, 'im'));
  return match ? match[1].replace(/\r?\n[ \t]+/g, ' ').trim() : '';
}

function decodeQuotedPrintable(value) {
  return value.replace(/=\r?\n/g, '').replace(/=([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function textFromRaw(raw) {
  const body = raw.split(/\r?\n\r?\n/, 2)[1] || '';
  const encoding = header(raw, 'content-transfer-encoding').toLowerCase();
  if (encoding === 'base64') {
    try { return atob(body.replace(/\s/g, '')); } catch { return body; }
  }
  return encoding === 'quoted-printable' ? decodeQuotedPrintable(body) : body;
}

export default {
  async email(message, env) {
    if (!env.INGEST_URL || !env.INGEST_SECRET) throw new Error('INGEST_URL and INGEST_SECRET are required');
    const raw = await new Response(message.raw).text();
    const response = await fetch(env.INGEST_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-haru-email-secret': env.INGEST_SECRET },
      body: JSON.stringify({
        id: crypto.randomUUID().replaceAll('-', ''),
        recipient: String(message.to || '').toLowerCase(),
        from: String(header(raw, 'from') || message.from || ''),
        subject: String(header(raw, 'subject') || '(제목 없음)'),
        text: String(textFromRaw(raw)),
        receivedAt: new Date().toISOString()
      })
    });
    if (!response.ok) throw new Error(`Inbox ingest failed (${response.status})`);
  }
};
