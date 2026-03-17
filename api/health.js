const { json, methodNotAllowed } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(req, res, ["GET"]);
    return;
  }

  json(res, 200, {
    ok: true,
    runtime: "vercel-function",
    apiConfigured: Boolean(process.env.RESEND_API_KEY),
  });
};
