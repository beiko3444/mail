import PostalMime from 'postal-mime';

export default {
  async email(message, env) {
    if (!env.INGEST_URL || !env.INGEST_SECRET) throw new Error('INGEST_URL and INGEST_SECRET are required');
    const raw = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(raw);
    const response = await fetch(env.INGEST_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-haru-email-secret': env.INGEST_SECRET },
      body: JSON.stringify({
        id: crypto.randomUUID().replaceAll('-', ''),
        recipient: String(message.to || '').toLowerCase(),
        from: parsed.from ? (parsed.from.name ? `${parsed.from.name} <${parsed.from.address}>` : parsed.from.address) : String(message.from || ''),
        subject: String(parsed.subject || '(제목 없음)'),
        text: String(parsed.text || parsed.html || ''),
        receivedAt: new Date().toISOString()
      })
    });
    if (!response.ok) throw new Error(`Inbox ingest failed (${response.status})`);
  }
};
