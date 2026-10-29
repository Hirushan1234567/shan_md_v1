import { session, accounts, guard } from "./_lib/auth.js";

const BOOL = ["publicMode", "ownerOnly", "alwaysOnline", "autoSeen", "autoReact", "autoTyping", "autoReply", "welcome", "goodbye",
  "antiLink", "antiSpam", "antiDelete", "antiViewOnce", "autoSticker", "autoDownload", "autoCrop", "debugMode"];
const CHAT_MODES = ["all", "groups", "private"];

export default async function handler(req, res) {
  if (!guard(req, res, ["POST"])) return;
  try {
    const s = await session(req); // number comes from the signed session only — never from the request body
    if (!s) return res.status(401).json({ error: "Not logged in" });
    const inp = req.body?.settings || {}, set = {};
    for (const k of BOOL) if (typeof inp[k] === "boolean") set["settings." + k] = inp[k];
    if (typeof inp.prefix === "string" && /^[^\s\w]{1,3}$|^[a-z]$/i.test(inp.prefix)) set["settings.prefix"] = inp.prefix;
    if (CHAT_MODES.includes(inp.chatMode)) set["settings.chatMode"] = inp.chatMode;
    if (typeof req.body?.name === "string") set.name = req.body.name.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 30);
    if (!Object.keys(set).length) return res.status(400).json({ error: "Nothing valid to save." });
    set.settingsUpdatedAt = new Date();
    const r = await (await accounts()).findOneAndUpdate({ _id: s.number }, { $set: set }, { returnDocument: "after" });
    const doc = r && r.value !== undefined ? r.value : r; // mongodb v5 / v6
    res.json({ ok: true, settings: doc?.settings || {}, name: doc?.name || "" }); // bot applies it within ~15s
  } catch (e) { res.status(500).json({ error: "Server error" }); }
}
