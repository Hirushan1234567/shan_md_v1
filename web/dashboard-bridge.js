/* Connects the SHAN dashboard HTML to the real backend (/api/*).  Load AFTER the page's own <script>:
   <script src="/dashboard-bridge.js"></script>  (just before </body>) */
(function () {
  "use strict";
  const q = id => document.getElementById(id);
  const say = m => (typeof toast === "function" ? toast(m) : alert(m));
  async function J(url, method, body) {
    let d = {};
    try {
      const r = await fetch(url, { method: method || "GET", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      d = await r.json().catch(() => ({})); d._status = r.status;
    } catch { d = { error: "Network error", _status: 0 }; }
    return d;
  }

  const TOGGLES = [["publicMode","🌍 Public Mode",1],["ownerOnly","👑 Owner Only"],["alwaysOnline","🟢 Always Online"],["autoSeen","👁️ Auto Seen"],
    ["autoReact","❤️ Auto React"],["autoTyping","⌨️ Auto Typing"],["autoReply","💬 Auto Reply"],["welcome","👋 Welcome"],["goodbye","🚪 Goodbye"],
    ["antiLink","🔗 Anti Link"],["antiSpam","🚫 Anti Spam"],["antiDelete","🗑️ Anti Delete"],["antiViewOnce","👁️ Anti View-Once"],
    ["autoSticker","🖼️ Auto Sticker"],["autoDownload","⬇️ Auto Download"],["autoCrop","✂️ Auto Crop"],["debugMode","🐞 Debug Mode"]];
  let me = null;

  /* ---------- remove fake / admin bits from the DOM (also delete them from the HTML file!) ---------- */
  ["v-admin", "navAdminBtn"].forEach(id => q(id)?.remove());
  document.querySelectorAll("#v-settings .card").forEach(c => {
    if (/GENERAL & PROTECTION|CUSTOM COMMAND/.test(c.querySelector("h3")?.textContent || "")) c.remove();
  });

  window.closeDash = () => (location.href = "/");

  window.regenerateApiKey = async function () {
    if (!confirm("Generate a new API key? It will be sent to your bot's WhatsApp.")) return;
    const d = await J("/api/key", "POST", {});
    say(d.error || d.message);
  };

  window.resetRegistration = async function () {
    await J("/api/login", "DELETE", {});
    state.isRegistered = false; state.userData = null; me = null;
    location.href = "/login";
  };

  /* ---------- live settings card ---------- */
  function buildSettings() {
    const sec = q("v-settings"); if (!sec || q("liveCfg")) return;
    const card = document.createElement("div"); card.className = "card"; card.id = "liveCfg"; card.style.borderColor = "#00aaff";
    card.innerHTML = '<h3 style="color:#00aaff">⚙️ LIVE BOT SETTINGS</h3><label>BOT NAME</label><input id="cfgName" type="text" maxlength="30">' +
      '<label>PREFIX</label><input id="cfgPrefix" type="text" maxlength="3" placeholder="."><label>CHAT MODE</label>' +
      '<select id="cfgMode"><option value="all">All chats</option><option value="private">Private only</option><option value="groups">Groups only</option></select>' +
      '<div id="cfgToggles"></div><button class="btn btn-green" id="cfgSave" style="margin-top:12px">SAVE TO BOT 💾</button>' +
      '<p style="font-size:10px;color:var(--text-muted)">Applies to your bot within ~15 seconds.</p>';
    sec.querySelector("h2")?.after(card);
    const box = q("cfgToggles");
    TOGGLES.forEach(([k, label]) => {
      const row = document.createElement("div"); row.className = "checkbox-row";
      const l = document.createElement("label"); l.textContent = label;
      const c = document.createElement("input"); c.type = "checkbox"; c.dataset.k = k;
      row.append(l, c); box.append(row);
    });
    q("cfgSave").onclick = async () => {
      const settings = { prefix: q("cfgPrefix").value.trim() || undefined, chatMode: q("cfgMode").value };
      box.querySelectorAll("input").forEach(c => (settings[c.dataset.k] = c.checked));
      const d = await J("/api/settings", "POST", { settings, name: q("cfgName").value });
      say(d.error || "Saved — bot updates in ~15s ✅");
      if (d.settings) me.settings = d.settings;
    };
  }
  function fillSettings() {
    const s = me.settings || {};
    document.querySelectorAll("#cfgToggles input").forEach(c => {
      const def = TOGGLES.find(t => t[0] === c.dataset.k)[2] ? true : false;
      c.checked = s[c.dataset.k] === undefined ? def : !!s[c.dataset.k];
    });
    q("cfgName").value = me.name || ""; q("cfgPrefix").value = s.prefix || ""; q("cfgMode").value = s.chatMode || "all";
  }

  /* ---------- admin entry (only the owner number ever sees this) ---------- */
  function addAdminNav() {
    if (q("navAdmin2")) return;
    const b = document.createElement("button"); b.id = "navAdmin2"; b.style.color = "#ffaa00"; b.innerHTML = "<i>👑</i>Admin";
    b.onclick = () => (me.adminUnlocked ? (location.href = "/api/admin?a=page") : askAdminPw());
    document.querySelector("#dash nav")?.append(b);
  }
  function askAdminPw() {
    const o = document.createElement("div"); o.className = "modal-overlay open";
    o.innerHTML = '<div class="modal-box"><h3 style="color:#ffaa00">👑 ADMIN</h3><input type="password" id="admPw" placeholder="Secret password" autocomplete="off">' +
      '<button class="btn btn-green" id="admGo">ENTER</button><button class="btn btn-dark" id="admX">CANCEL</button></div>';
    document.body.append(o);
    q("admX").onclick = () => o.remove();
    q("admGo").onclick = async () => {
      const d = await J("/api/admin?a=login", "POST", { password: q("admPw").value });
      if (d.ok) location.href = "/api/admin?a=page"; else say(d.error || "Denied");
    };
  }

  /* ---------- boot: restore session ---------- */
  async function boot() {
    const d = await J("/api/me");
    if (!d.number) { location.href = "/login"; return; }
    me = d; state.isRegistered = true; state.userData = { username: d.name || d.number, botNumber: d.number };
    q("profileName") && (q("profileName").value = d.name || "");
    q("dashUserWelcome") && (q("dashUserWelcome").textContent = (d.name || d.number).toUpperCase());
    ["sendBotNumber", "pairPhone"].forEach(id => q(id) && (q(id).value = d.number));
    if (q("currentApiKeyDisplay")) q("currentApiKeyDisplay").value = "Sent to your WhatsApp";
    if (d.announcement) { q("announcementText").textContent = d.announcement; q("announcementBox").style.display = "block"; }
    buildSettings(); fillSettings();
    if (d.owner) addAdminNav();
    openDash();
  }
  boot();
})();
