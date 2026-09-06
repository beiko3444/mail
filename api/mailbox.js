const { json, methodNotAllowed } = require('./_lib/http');
const { issueMailbox, requireMailbox, setCookie, checkOrigin, limitCreation, receivingConfigured } = require('./_lib/mailbox');
module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      try { return json(res, 200, { mailbox: requireMailbox(req) }); }
      catch (error) { if (error.status === 503) throw error; return json(res, 200, { mailbox: null }); }
    }
    if (req.method === 'POST') {
      checkOrigin(req);
      if (!receivingConfigured()) return json(res, 503, { error: '메일 수신 서비스를 준비 중입니다. 잠시 후 다시 방문해 주세요.' });
      limitCreation(req);
      const { mailbox, token } = issueMailbox();
      setCookie(req, res, token);
      return json(res, 201, { mailbox });
    }
    if (req.method === 'DELETE') {
      checkOrigin(req); setCookie(req, res, '');
      return json(res, 200, { mailbox: null });
    }
    methodNotAllowed(req, res, ['GET', 'POST', 'DELETE']);
  } catch (error) { json(res, error.status || 500, { error: error.status ? error.message : '메일함을 열지 못했습니다. 잠시 후 다시 시도해 주세요.' }); }
};
