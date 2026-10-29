// Panel / VPS runner: serves public/ and mounts the same api/*.js handlers that Vercel uses.  Start: node server.js
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const alias = { status: "statu" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  res.status = c => { res.statusCode = c; return res; };
  res.json = o => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
  res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("X-Frame-Options", "DENY");

  if (url.pathname.startsWith("/api/")) {
    let name = url.pathname.slice(5).replace(/\/$/, ""); name = alias[name] || name;
    const file = path.join(root, "api", name + ".js");
    if (!/^[a-z0-9-]+$/i.test(name) || !fs.existsSync(file)) return res.status(404).json({ error: "Not found" });
    req.query = Object.fromEntries(url.searchParams);
    let raw = ""; for await (const c of req) { raw += c; if (raw.length > 1e6) return res.status(413).end(); }
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    try { return await (await import(pathToFileURL(file).href)).default(req, res); }
    catch (e) { console.error(e); return res.status(500).json({ error: "Server error" }); }
  }
  const pages = { "/": "index", "/login": "login", "/dashboard": "dashboard" };
  const p = pages[url.pathname.replace(/(.)\/$/, "$1")];
  if (!p) return res.status(404).end("Not found");
  req.query = { p };
  return (await import("./api/site.js")).default(req, res);
}).listen(process.env.PORT || 3000, () => console.log("SHAN web on :" + (process.env.PORT || 3000)));
