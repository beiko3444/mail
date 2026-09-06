function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, nosnippet");
  res.setHeader("Vary", "Cookie");
  res.end(JSON.stringify(payload, null, 2));
}

function methodNotAllowed(req, res, methods) {
  res.setHeader("Allow", methods.join(", "));
  json(res, 405, { error: `허용되지 않은 메서드입니다. (${req.method})` });
}

function getSingleQuery(value) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
}

module.exports = {
  json,
  methodNotAllowed,
  getSingleQuery,
};
