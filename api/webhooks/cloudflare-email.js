const { json, methodNotAllowed } = require('../_lib/http');
const { saveIncoming, equalSecret } = require('../_lib/messages-store');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);
  const expected = process.env.CLOUDFLARE_EMAIL_WEBHOOK_SECRET;
  if (!expected || !equalSecret(req.headers['x-haru-email-secret'], expected)) return json(res, 401, { error: 'Unauthorized' });
  try {
    await saveIncoming(req.body || {});
    return json(res, 202, { accepted: true });
  } catch (error) {
    return json(res, 503, { error: '메일 저장에 실패했습니다.' });
  }
};
