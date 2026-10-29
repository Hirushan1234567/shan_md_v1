import crypto from "node:crypto";
import { aux, cleanNumber } from "./db.js";

// ---- must match the bot's account.js ----
export const hashKey = k => crypto.createHash("sha256").update(String(k || "").trim().toUpperCase()).digest("hex");
export const newKey = () => "SHAN-" + [0, 1, 2, 3].map(() => crypto.randomBytes(2).toString("hex").toUpperCase()).join("-");

export const OWNER = () => cleanNumber(process.env.OWNER_NUMBER || "94752661225");
export const isOwner = n => String(n).slice(-9) === OWNER().slice(-9);
export const accounts = () => aux("bot_accounts");

const secret = () => {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 24) throw new Error("SESSION_SECRET (24+ chars) is not set");
  return s;
};
const mac = body => crypto.createHmac("sha256", secret()).update(body).digest("base64url");

export function sign(payload, ttlSec) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlSec * 1000 })).toString("base64url");
  return body + "." + mac(body);
}
export function verify(token) {
  try {
    const [body, m] = String(token || "").split(".");
    const ok = mac(body);
    if (!m || m.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(m), Buffer.from(ok))) return null;
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
export const safeEq = (a, b) => {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

export const ip = req => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
export const cookies = req => Object.fromEntries(
  String(req.headers.cookie || "").split(";").map(s => s.trim().split("=")).filter(a => a[0]).map(([k, ...v]) => [k, v.join("=")])
);
export function setCookie(req, res, name, val, maxAge) {
  const https = req.headers["x-forwarded-proto"] === "https" || req.socket?.encrypted;
  const c = `${name}=${val}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${https ? "; Secure" : ""}`;
  res.setHeader("Set-Cookie", [].concat(res.getHeader("Set-Cookie") || [], c));
}

// Shared across serverless invocations (MongoDB)
export async function limited(key, max, windowMs) {
  const col = await aux("web_ratelimit"), now = Date.now();
  const d = await col.findOne({ _id: key });
  if (!d || now - d.start > windowMs) { await col.updateOne({ _id: key }, { $set: { start: now, count: 1 } }, { upsert: true }); return false; }
  if (d.count >= max) return true;
  await col.updateOne({ _id: key }, { $inc: { count: 1 } });
  return false;
}

// POST/DELETE must be same-site JSON (CSRF guard on top of SameSite=Strict)
export function guard(req, res, methods) {
  res.setHeader("Cache-Control", "no-store");
  if (!methods.includes(req.method)) { res.setHeader("Allow", methods.join(", ")); res.status(405).json({ error: "Method not allowed" }); return false; }
  if (req.method !== "GET" && !String(req.headers["content-type"] || "").includes("application/json")) { res.status(415).json({ error: "JSON only" }); return false; }
  return true;
}

// Valid session = signed cookie + account still exists + not blocked + API key not rotated since login
export async function session(req) {
  const t = verify(cookies(req).shan_s);
  if (!t) return null;
  const a = await (await accounts()).findOne({ _id: t.n });
  if (!a || !a.keyHash || a.blocked || (a.keyVer || 0) !== t.kv) return null;
  return { number: t.n, account: a };
}
// Admin = owner's own bot session + secret password cookie
export async function adminSession(req) {
  const s = await session(req);
  const t = verify(cookies(req).shan_a);
  return s && t && t.n === s.number && isOwner(s.number) ? s : null;
}

// Queue a WhatsApp message; the connected bot (account.js outbox) delivers it
export async function queueMsg(number, text, ttlMs = 10 * 60 * 1000, to = number) {
  await (await aux("bot_outbox")).insertOne({ number, to, text, status: "pending", createdAt: new Date(), expireAt: new Date(Date.now() + ttlMs) });
}
export const keyText = (number, key) =>
  `🔐 *SHAN MINI BOT — NEW API KEY*\n\n📱 Bot number: +${number}\n🔑 API Key: *${key}*\n\nLog in to the dashboard with this number + this key.\n🤫 Never share this key.`;
