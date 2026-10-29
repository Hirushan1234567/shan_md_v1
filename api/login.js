import { accounts, hashKey, safeEq, sign, setCookie, limited, ip, guard, isOwner } from "./_lib/auth.js";
import { cleanNumber, validNumber } from "./_lib/db.js";

export default async function handler(req, res) {
  if (!guard(req, res, ["POST", "DELETE"])) return;
  try {
    if (req.method === "DELETE") { // logout
      setCookie(req, res, "shan_s", "", 0); setCookie(req, res, "shan_a", "", 0);
      return res.json({ ok: true });
    }
    const number = cleanNumber(req.body?.number), key = String(req.body?.apiKey || "").trim();
    if (!validNumber(number) || !key) return res.status(400).json({ error: "Enter your bot number and API key." });
    if ((await limited("login:ip:" + ip(req), 15, 10 * 60e3)) || (await limited("login:n:" + number, 8, 10 * 60e3)))
      return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });

    const col = await accounts();
    const a = await col.findOne({ _id: number });
    const h = hashKey(key);
    const isCur = a?.keyHash && safeEq(h, a.keyHash);
    const isNew = a?.pendingKeyHash && safeEq(h, a.pendingKeyHash);
    if (!isCur && !isNew) return res.status(401).json({ error: "Number and API key don't match." });
    if (a.blocked) return res.status(403).json({ error: "This bot is blocked." });

    let kv = a.keyVer || 0;
    if (isNew) { // regenerated key used for the first time -> old key dies now
      kv += 1;
      await col.updateOne({ _id: number }, { $set: { keyHash: a.pendingKeyHash, keyVer: kv, keyCreatedAt: new Date() }, $unset: { pendingKeyHash: "" } });
    }
    if (!a.activated) await col.updateOne({ _id: number }, { $set: { activated: true, activatedAt: new Date() } });

    setCookie(req, res, "shan_s", sign({ n: number, kv }, 7 * 86400), 7 * 86400);
    res.json({ ok: true, number, name: a.name || "", owner: isOwner(number) });
  } catch (e) { console.error("login:", e?.message); res.status(500).json({ error: "Server error" }); }
}
