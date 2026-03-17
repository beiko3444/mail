const { json, methodNotAllowed, getSingleQuery } = require("../_lib/http");
const { listReceivedMessages } = require("../_lib/resend");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(req, res, ["GET"]);
    return;
  }

  const address = String(getSingleQuery(req.query?.address)).trim().toLowerCase();
  if (!address) {
    json(res, 400, { error: "address 쿼리가 필요합니다." });
    return;
  }

  try {
    const messages = await listReceivedMessages(address);
    json(res, 200, {
      address,
      source: "resend-api",
      messages,
    });
  } catch (error) {
    json(res, 500, {
      error: error.message || "메일 목록을 조회하지 못했습니다.",
      address,
      messages: [],
    });
  }
};
