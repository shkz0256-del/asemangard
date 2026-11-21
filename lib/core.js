import crypto from "node:crypto";
import { promisify } from "node:util";
import { put, get, list } from "@vercel/blob";

const scrypt = promisify(crypto.scrypt);
const ROOT = "v2/";
const mem = new Map(); // only used when LOCAL_TEST=1 (no Blob token)
const LOCAL = () => process.env.LOCAL_TEST === "1";
const SECRET = () => process.env.AUTH_SECRET || "";

export const fail = (status, code, message, fields) => Object.assign(new Error(message), { status, code, fields });

export function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Cache-Control", "no-store");
}

export function handler(methods, fn) {
  return async (req, res) => {
    cors(res);
    if (req.method === "OPTIONS") return res.status(204).end();
    if (!methods.includes(req.method)) return res.status(405).json({ error: "method_not_allowed", message: "درخواست نامعتبر است." });
    if (!SECRET()) return res.status(500).json({ error: "server_not_configured", message: "خطای سرور؛ لطفا دوباره تلاش کنید." });
    try {
      await fn(req, res);
    } catch (e) {
      if (e && e.status) return res.status(e.status).json({ error: e.code, message: e.message, fields: e.fields });
      console.error("api error", e && e.message);
      res.status(500).json({ error: "server_error", message: "خطای سرور؛ لطفا دوباره تلاش کنید." });
    }
  };
}

/* ---------- storage (Vercel Blob, private) ---------- */
export async function readJson(path) {
  if (LOCAL()) return mem.has(ROOT + path) ? JSON.parse(mem.get(ROOT + path)) : null;
  const r = await get(ROOT + path, { access: "private", useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}
export async function writeJson(path, obj, { overwrite = true } = {}) {
  if (LOCAL()) {
    if (!overwrite && mem.has(ROOT + path)) throw fail(409, "exists", "exists");
    mem.set(ROOT + path, JSON.stringify(obj));
    return;
  }
  try {
    await put(ROOT + path, JSON.stringify(obj), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: overwrite });
  } catch (e) {
    if (!overwrite && /exist/i.test(String(e && e.message))) throw fail(409, "exists", "exists");
    throw e;
  }
}
export async function listPrefix(prefix) {
  if (LOCAL()) return { blobs: [...mem.keys()].filter((k) => k.startsWith(ROOT + prefix)).sort().map((pathname) => ({ pathname })) };
  const { blobs } = await list({ prefix: ROOT + prefix, limit: 1000 });
  return { blobs };
}
export const readByPathname = async (pathname) => readJson(pathname.slice(ROOT.length));

/* ---------- helpers ---------- */
const FA = "۰۱۲۳۴۵۶۷۸۹", AR = "٠١٢٣٤٥٦٧٨٩";
export const digits = (s) => String(s ?? "").replace(/[۰-۹]/g, (d) => FA.indexOf(d)).replace(/[٠-٩]/g, (d) => AR.indexOf(d));
export const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function normMobile(v) {
  let d = digits(v).replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (d.startsWith("0098")) d = d.slice(4);
  else if (d.startsWith("98") && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("9")) d = "0" + d;
  return /^09\d{9}$/.test(d) ? d : null;
}

export function validNationalId(v) {
  const s = digits(v);
  if (!/^\d{10}$/.test(s) || /^(\d)\1{9}$/.test(s)) return false;
  const sum = [...s.slice(0, 9)].reduce((a, c, i) => a + +c * (10 - i), 0) % 11;
  return +s[9] === (sum < 2 ? sum : 11 - sum);
}

export const body = (req) => {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  return b && typeof b === "object" ? b : {};
};

/* ---------- passwords ---------- */
export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `s1$${salt.toString("hex")}$${key.toString("hex")}`;
}
export async function verifyPassword(pw, stored) {
  const [v, salt, hash] = String(stored || "").split("$");
  if (v !== "s1" || !salt || !hash) return false;
  const key = await scrypt(String(pw), Buffer.from(salt, "hex"), 64);
  const a = Buffer.from(hash, "hex");
  return a.length === key.length && crypto.timingSafeEqual(a, key);
}

/* ---------- tokens (HMAC-SHA256, 7 days) ---------- */
const b64 = (b) => Buffer.from(b).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", SECRET()).update(data).digest("base64url");
export function makeToken(mobile) {
  const p = b64(JSON.stringify({ sub: mobile, exp: Date.now() + 7 * 864e5 }));
  return `${p}.${sign(p)}`;
}
export function authMobile(req) {
  const h = String(req.headers.authorization || "");
  if (!h.startsWith("Bearer ")) throw fail(401, "unauthorized", "ابتدا وارد حساب خود شوید.");
  const [p, s] = h.slice(7).split(".");
  const ok = p && s && s.length === sign(p).length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(sign(p)));
  if (!ok) throw fail(401, "invalid_token", "نشست نامعتبر است؛ دوباره وارد شوید.");
  let d; try { d = JSON.parse(Buffer.from(p, "base64url").toString()); } catch { d = null; }
  if (!d || !/^09\d{9}$/.test(d.sub)) throw fail(401, "invalid_token", "نشست نامعتبر است؛ دوباره وارد شوید.");
  if (d.exp < Date.now()) throw fail(401, "expired", "نشست منقضی شده؛ دوباره وارد شوید.");
  return d.sub;
}

/* ---------- best-effort throttle (per instance) ---------- */
const hits = new Map();
export function throttle(req, key, max, windowMs) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  const k = key + ":" + ip, now = Date.now();
  const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) throw fail(429, "rate_limited", "تعداد تلاش‌ها زیاد است؛ کمی بعد دوباره امتحان کنید.");
  arr.push(now); hits.set(k, arr);
  if (hits.size > 5000) hits.clear();
}

export const publicUser = (u) => ({ firstName: u.firstName, lastName: u.lastName, mobile: u.mobile });
