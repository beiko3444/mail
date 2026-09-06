import PostalMime from 'postal-mime';

function value(address) {
  if (Array.isArray(address)) return address[0]?.address || address[0]?.email || '';
  return address?.address || address?.email || address || '';
}

export default {
  async email(message, env) {
    if (!env.INGEST_URL || !env.INGEST_SECRET) throw new Error('INGEST_URL and INGEST_SECRET are required');
    const parsed = await PostalMime.parse(message.raw);
    const response = await fetch(env.INGEST_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-haru-email-secret': env.INGEST_SECRET },
      body: JSON.stringify({
        id: crypto.randomUUID().replaceAll('-', ''),
        recipient: String(message.to || '').toLowerCase(),
        from: String(value(parsed.from) || message.from || ''),
        subject: String(parsed.subject || '(제목 없음)'),
        text: String(parsed.text || ''),
        receivedAt: new Date().toISOString()
      })
    });
    if (!response.ok) throw new Error(`Inbox ingest failed (${response.status})`);
  }
};
