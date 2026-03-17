const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const MAX_ALIASES = 100;
const FILE_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(FILE_DIR, "aliases.json");
const DEFAULT_DB_KEY = "xtracker:aliases:default";

function normalizeAddress(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAliasList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const output = [];

  for (const item of value) {
    const normalized = normalizeAddress(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
    if (output.length >= MAX_ALIASES) {
      break;
    }
  }

  return output;
}

function getRedisConfig() {
  const url =
    process.env.ALIASES_DB_REST_URL ||
    process.env.VERCEL_KV_REST_API_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    "";

  const token =
    process.env.ALIASES_DB_REST_TOKEN ||
    process.env.VERCEL_KV_REST_API_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";

  const key = process.env.ALIASES_DB_KEY || DEFAULT_DB_KEY;

  return {
    url: String(url || "").trim(),
    token: String(token || "").trim(),
    key: String(key || "").trim() || DEFAULT_DB_KEY,
  };
}

function isRedisConfigured() {
  const { url, token } = getRedisConfig();
  return Boolean(url && token);
}

function getStoreInfo() {
  if (isRedisConfigured()) {
    return { type: "redis-rest", persistent: true };
  }

  return { type: "file", persistent: !Boolean(process.env.VERCEL) };
}

async function redisCommand(parts) {
  const { url, token } = getRedisConfig();
  if (!url || !token) {
    throw new Error("Redis 환경변수가 설정되지 않았습니다.");
  }

  const endpoint = `${url.replace(/\/+$/, "")}/${parts.map((item) => encodeURIComponent(String(item))).join("/")}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { result: text };
    }
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Redis 요청 실패 (${response.status})`);
  }

  if (payload?.error) {
    throw new Error(payload.error);
  }

  return payload?.result ?? null;
}

async function readAliasesFromRedis() {
  const { key } = getRedisConfig();
  const raw = await redisCommand(["get", key]);
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return normalizeAliasList(raw);
  }

  if (typeof raw === "string") {
    try {
      return normalizeAliasList(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  return [];
}

async function writeAliasesToRedis(aliases) {
  const { key } = getRedisConfig();
  const normalized = normalizeAliasList(aliases);
  await redisCommand(["set", key, JSON.stringify(normalized)]);
  return normalized;
}

async function ensureAliasFile() {
  await fsp.mkdir(FILE_DIR, { recursive: true });
  try {
    await fsp.access(FILE_PATH, fs.constants.F_OK);
  } catch {
    await fsp.writeFile(FILE_PATH, JSON.stringify({ aliases: [] }, null, 2), "utf8");
  }
}

async function readAliasesFromFile() {
  await ensureAliasFile();
  const raw = await fsp.readFile(FILE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return normalizeAliasList(parsed?.aliases);
  } catch {
    return [];
  }
}

async function writeAliasesToFile(aliases) {
  const normalized = normalizeAliasList(aliases);
  await ensureAliasFile();
  await fsp.writeFile(FILE_PATH, JSON.stringify({ aliases: normalized }, null, 2), "utf8");
  return normalized;
}

async function readAliases() {
  if (isRedisConfigured()) {
    return readAliasesFromRedis();
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Vercel 배포에서는 aliases 영구 저장용 DB가 필요합니다. KV/Upstash Redis 환경변수를 설정해주세요.",
    );
  }

  return readAliasesFromFile();
}

async function writeAliases(aliases) {
  if (isRedisConfigured()) {
    return writeAliasesToRedis(aliases);
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Vercel 배포에서는 aliases 영구 저장용 DB가 필요합니다. KV/Upstash Redis 환경변수를 설정해주세요.",
    );
  }

  return writeAliasesToFile(aliases);
}

async function addAlias(address) {
  const normalized = normalizeAddress(address);
  if (!normalized) {
    throw new Error("address 값이 비어 있습니다.");
  }

  const aliases = await readAliases();
  const next = [normalized, ...aliases.filter((item) => item !== normalized)].slice(0, MAX_ALIASES);
  return writeAliases(next);
}

async function removeAlias(address) {
  const normalized = normalizeAddress(address);
  const aliases = await readAliases();
  const next = aliases.filter((item) => item !== normalized);
  return writeAliases(next);
}

module.exports = {
  MAX_ALIASES,
  getStoreInfo,
  readAliases,
  addAlias,
  removeAlias,
};

