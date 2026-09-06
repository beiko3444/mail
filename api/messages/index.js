const { json, methodNotAllowed } = require('../_lib/http');
const { requireMailbox, belongsToMailbox } = require('../_lib/mailbox');
const { listReceivedMessages } = require('../_lib/resend');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);
  try {
    const mailbox = requireMailbox(req);
    const result = await listReceivedMessages(mailbox.address, mailbox.createdAt);
    requireMailbox(req);
    const messages = result.messages.filter(message => belongsToMailbox(message, mailbox)).map(({id, from, subject, createdAt}) => ({id, from, subject, createdAt}));
    json(res, 200, { messages, address: mailbox.address, partial: result.partial });
  } catch (error) { json(res, error.status || 503, { error: error.status ? error.message : '메일 수신함에 연결하지 못했습니다. 잠시 후 새로고침해 주세요.' }); }
};
