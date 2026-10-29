import { session, guard, isOwner, cookies, verify } from "./_lib/auth.js";
import { aux } from "./_lib/db.js";

export default async function handler(req, res) {
  if (!guard(req, res, ["GET"])) return;
  try {
    const s = await session(req);
    if (!s) return res.status(401).json({ error: "Not logged in" });
    const a = s.account;
    const ann = await (await aux("site_config")).findOne({ _id: "announcement" });
    res.json({
      number: s.number, name: a.name || "", activated: !!a.activated, settings: a.settings || {},
      owner: isOwner(s.number), adminUnlocked: !!verify(cookies(req).shan_a),
      announcement: ann?.text || ""
    });
  } catch (e) { res.status(500).json({ error: "Server error" }); }
}
