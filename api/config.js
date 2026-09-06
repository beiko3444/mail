const { json, methodNotAllowed } = require('./_lib/http');
const { receivingConfigured, receiver } = require('./_lib/mailbox');
module.exports = (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);
  json(res, 200, { inboxDomain: process.env.INBOX_DOMAIN || 'haruemail.com', apiConfigured: receivingConfigured(), receiver: receiver(), autoRefreshSeconds: 20, mailboxHours: 24 });
};
