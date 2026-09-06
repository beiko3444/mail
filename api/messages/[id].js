const { json, methodNotAllowed, getSingleQuery } = require('../_lib/http');
const { requireMailbox, belongsToMailbox } = require('../_lib/mailbox');
const { getReceivedMessage } = require('../_lib/resend');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);
  try {
    const mailbox = requireMailbox(req);
    const id = getSingleQuery(req.query?.id);
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return json(res, 400, { error: '올바르지 않은 메일입니다.' });
    const message = await getReceivedMessage(id);
    requireMailbox(req);
    if (!belongsToMailbox(message, mailbox)) return json(res, 404, { error: '메일을 찾을 수 없습니다.' });
    const { from, subject, text, createdAt } = message;
    json(res, 200, { id, from, subject, text, createdAt, address: mailbox.address });
  } catch (error) { json(res, error.status || 503, { error: error.status ? error.message : '메일을 열지 못했습니다. 잠시 후 다시 시도해 주세요.' }); }
};
