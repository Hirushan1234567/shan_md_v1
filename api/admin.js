import { adminSession, session, accounts, guard, safeEq, sign, setCookie, limited, ip, isOwner, newKey, hashKey, keyText, queueMsg } from "./_lib/auth.js";
import { aux } from "./_lib/db.js";
import { adminPage } from "./_lib/adminPage.js";

const notFound = res => { res.status(404); res.setHeader("Content-Type", "text/plain"); res.end("Not found"); };

export default async function handler(req, res) {
  const a = String(req.query?.a || "");
  try {
    // 1) page: HTML + CSS exist ONLY in this response, and only for the unlocked owner. Everyone else gets a plain 404.
    if (a === "page") {
      res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Robots-Tag", "noindex");
      if (!(await adminSession(req))) return notFound(res);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src data:");
      return res.status(200).end(adminPage);
    }
    if (!guard(req, res, a === "data" ? ["GET"] : ["POST"])) return;

    // 2) unlock: owner's logged-in bot session + secret password (ADMIN_PASSWORD env var)
    if (a === "login") {
      const s = await session(req);
      if (!s || !isOwner(s.number)) return res.status(401).json({ error: "Denied" });
      if ((await limited("adm:ip:" + ip(req), 5, 15 * 60e3)) || (await limited("adm:all", 20, 60 * 60e3)))
        return res.status(429).json({ error: "Locked. Try later." });
      const pw = process.env.ADMIN_PASSWORD || "";
      if (pw.length < 8) return res.status(500).json({ error: "ADMIN_PASSWORD is not configured." });
      if (!safeEq(req.body?.password || "", pw)) return res.status(401).json({ error: "Wrong password" });
      setCookie(req, res, "shan_a", sign({ n: s.number }, 2 * 3600), 2 * 3600);
      return res.json({ ok: true });
    }

    const adm = await adminSession(req);
    if (!adm) return res.status(401).json({ error: "Denied" });
    const col = await accounts();

    if (a === "logout") { setCookie(req, res, "shan_a", "", 0); return res.json({ ok: true }); }

    if (a === "data") {
      const list = await col.find({}, { projection: { keyHash: 0, pendingKeyHash: 0 } }).sort({ createdAt: -1 }).limit(500).toArray();
      const ann = await (await aux("site_config")).findOne({ _id: "announcement" });
      return res.json({
        total: list.length, blocked: list.filter(x => x.blocked).length, activated: list.filter(x => x.activated).length,
        announcement: ann?.text || "",
        accounts: list.map(x => ({ number: x._id, name: x.name || "", activated: !!x.activated, blocked: !!x.blocked, owner: isOwner(x._id),
          createdAt: x.createdAt || null, settingsUpdatedAt: x.settingsUpdatedAt || null }))
      });
    }

    if (a === "act") {
      const { op } = req.body || {}; const n = String(req.body?.number || "").replace(/\D/g, "");
      const text = String(req.body?.text || "").slice(0, 500);
      if (["block", "unblock", "activate", "delete", "resetkey"].includes(op)) {
        if (!/^\d{8,15}$/.test(n)) return res.status(400).json({ error: "Bad number" });
        if (isOwner(n) && ["block", "delete"].includes(op)) return res.status(400).json({ error: "Owner is protected" });
      }
      if (op === "block" || op === "unblock") await col.updateOne({ _id: n }, { $set: { blocked: op === "block" } });
      else if (op === "activate") await col.updateOne({ _id: n }, { $set: { activated: true } });
      else if (op === "delete") await col.deleteOne({ _id: n });
      else if (op === "resetkey") { const k = newKey(); await col.updateOne({ _id: n }, { $set: { pendingKeyHash: hashKey(k) } }); await queueMsg(n, keyText(n, k), 24 * 3600e3); }
      else if (op === "announce") await (await aux("site_config")).updateOne({ _id: "announcement" }, { $set: { text, at: new Date() } }, { upsert: true });
      else if (op === "broadcast") {
        if (!text) return res.status(400).json({ error: "Empty message" });
        let c = 0;
        for await (const x of col.find({ keyHash: { $exists: true }, blocked: { $ne: true } }, { projection: { _id: 1 } })) { await queueMsg(x._id, "📢 *SHAN MINI BOT*\n\n" + text, 3600e3); c++; }
        return res.json({ ok: true, queued: c });
      } else return res.status(400).json({ error: "Unknown action" });
      return res.json({ ok: true });
    }
    notFound(res);
  } catch (e) { console.error("admin:", e?.message); res.status(500).json({ error: "Server error" }); }
}
