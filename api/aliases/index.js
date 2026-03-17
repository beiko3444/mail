const { json, methodNotAllowed, getSingleQuery } = require("../_lib/http");
const { readAliases, addAlias, removeAlias, getStoreInfo } = require("../_lib/aliases-store");

async function parseBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new Error("JSON body 파싱에 실패했습니다.");
    }
  }

  if (typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("JSON body 파싱에 실패했습니다.");
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const aliases = await readAliases();
      json(res, 200, { aliases, store: getStoreInfo() });
    } catch (error) {
      json(res, 500, { error: error.message || "주소 목록을 불러오지 못했습니다.", aliases: [] });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const body = await parseBody(req);
      const aliases = await addAlias(body?.address);
      json(res, 200, { aliases, store: getStoreInfo() });
    } catch (error) {
      json(res, 400, { error: error.message || "주소 추가에 실패했습니다." });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const address = String(getSingleQuery(req.query?.address)).trim().toLowerCase();
      if (!address) {
        json(res, 400, { error: "address 쿼리가 필요합니다." });
        return;
      }

      const aliases = await removeAlias(address);
      json(res, 200, { aliases, store: getStoreInfo() });
    } catch (error) {
      json(res, 400, { error: error.message || "주소 삭제에 실패했습니다." });
    }
    return;
  }

  methodNotAllowed(req, res, ["GET", "POST", "DELETE"]);
};
