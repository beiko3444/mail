const { json, methodNotAllowed } = require("./_lib/http");
const { receivingConfigured, receiver } = require('./_lib/mailbox');

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(req, res, ["GET"]);
    return;
  }

  json(res, 200, {
    ok: true,
    runtime: "vercel-function",
    apiConfigured: receivingConfigured(),
    receiver: receiver(),
  });
};
