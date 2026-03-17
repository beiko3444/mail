const { json, methodNotAllowed, getSingleQuery } = require("../_lib/http");
const { getReceivedMessage, messageTargetsAddress } = require("../_lib/resend");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(req, res, ["GET"]);
    return;
  }

  const id = String(getSingleQuery(req.query?.id)).trim();
  if (!id) {
    json(res, 400, { error: "id 파라미터가 필요합니다." });
    return;
  }

  const address = String(getSingleQuery(req.query?.address)).trim().toLowerCase();

  try {
    const message = await getReceivedMessage(id);

    if (address && !messageTargetsAddress(message, address)) {
      json(res, 403, { error: "이 주소의 메일이 아닙니다." });
      return;
    }

    json(res, 200, message);
  } catch (error) {
    json(res, 500, { error: error.message || "메일 상세를 조회하지 못했습니다." });
  }
};
