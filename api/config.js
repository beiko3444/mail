const { json, methodNotAllowed } = require("./_lib/http");
const { getStoreInfo } = require("./_lib/aliases-store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(req, res, ["GET"]);
    return;
  }

  json(res, 200, {
    inboxDomain: process.env.INBOX_DOMAIN || "inbox.xtracker.co.kr",
    apiConfigured: Boolean(process.env.RESEND_API_KEY),
    webhookSecretConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    webhookPath: "/api/webhooks/resend",
    sourceMode: process.env.RESEND_API_KEY ? "resend-api" : "disabled",
    autoRefreshSeconds: 15,
    aliasStore: getStoreInfo(),
  });
};
