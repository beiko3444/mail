const { json, methodNotAllowed } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(req, res, ["POST"]);
    return;
  }

  // Vercel stateless 환경에서는 webhook payload를 장기 저장하지 않기 때문에
  // 수신 ACK만 반환하고, 메일 본문은 조회 시점에 Resend API에서 가져옵니다.
  json(res, 200, {
    ok: true,
    accepted: true,
    note: "Webhook accepted. Mail data is fetched from Resend API on demand.",
  });
};
