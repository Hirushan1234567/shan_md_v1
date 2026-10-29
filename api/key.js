import { session, accounts, guard, newKey, hashKey, keyText, queueMsg, limited } from "./_lib/auth.js";

// Regenerate API key: the new key is sent ONLY to the bot's own WhatsApp (never in the HTTP response).
// Old key keeps working until the new one is used for the first login.
export default async function handler(req, res) {
  if (!guard(req, res, ["POST"])) return;
  try {
    const s = await session(req);
    if (!s) return res.status(401).json({ error: "Not logged in" });
    if (await limited("key:" + s.number, 3, 60 * 60e3)) return res.status(429).json({ error: "Max 3 key changes per hour." });
    const key = newKey();
    await (await accounts()).updateOne({ _id: s.number }, { $set: { pendingKeyHash: hashKey(key) } });
    await queueMsg(s.number, keyText(s.number, key), 24 * 3600e3);
    res.json({ ok: true, message: "New API key sent to your bot's WhatsApp." });
  } catch (e) { res.status(500).json({ error: "Server error" }); }
}
