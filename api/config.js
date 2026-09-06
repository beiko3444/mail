const { json, methodNotAllowed } = require('./_lib/http');
module.exports = (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);
  json(res, 200, { inboxDomain: process.env.INBOX_DOMAIN || 'inbox.xtracker.co.kr', apiConfigured: Boolean(process.env.RESEND_API_KEY), autoRefreshSeconds: 20, mailboxHours: 24 });
};
