// Serves pages from ./web (NOT public). Local <link href="x.css"> and <script src="x.js"> are INLINED into the HTML at request time,
// so the URL returns one HTML document only — there is no /style.css or /script.js address to open.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { session } from "./_lib/auth.js";

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "web");
const PAGES = { index: { auth: false }, login: { auth: false }, dashboard: { auth: true } }; // auth:true = needs bot login session

const read = f => { const p = path.join(WEB, path.basename(f)); return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null; };
const local = u => u && !/^([a-z]+:)?\/\//i.test(u) && !u.includes(":");
const minCss = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{};,])\s*/g, "$1").replace(/:\s+/g, ":").replace(/;}/g, "}").trim();

function inline(html) {
  html = html.replace(/<link\b[^>]*>/gi, tag => {
    if (!/rel=["']stylesheet["']/i.test(tag)) return tag;
    const u = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
    const c = local(u) ? read(u) : null;
    return c == null ? tag : `<style>${minCss(c)}</style>`;
  });
  const deferred = [];
  html = html.replace(/<script\b([^>]*)><\/script>/gi, (tag, attrs) => {
    const u = (attrs.match(/src=["']([^"']+)["']/i) || [])[1];
    const c = local(u) ? read(u) : null;
    if (c == null) return tag;
    const out = `<script>${c.replace(/<\/script/gi, "<\\/script")}</script>`;
    if (/\bdefer\b/i.test(attrs)) { deferred.push(out); return ""; } // deferred = runs after parsing -> end of body
    return out;
  });
  return deferred.length ? html.replace(/<\/body>/i, deferred.join("") + "</body>") : html;
}

export default async function handler(req, res) {
  const nf = () => { res.status(404); res.setHeader("Content-Type", "text/plain"); res.end("Not found"); };
  const p = String(req.query?.p || "index").toLowerCase(), cfg = PAGES[p];
  if (!cfg || !["GET", "HEAD"].includes(req.method)) return nf();
  try {
    if (cfg.auth && !(await session(req))) { res.status(302); res.setHeader("Location", "/login"); return res.end(); }
    const html = read(p + ".html");
    if (html == null) return nf();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", cfg.auth ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300");
    if (cfg.auth) res.setHeader("X-Robots-Tag", "noindex");
    res.status(200); res.end(inline(html));
  } catch (e) { console.error("site:", e?.message); res.status(500); res.end("Server error"); }
}
