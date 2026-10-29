// Admin UI (HTML + CSS + JS). Imported server-side only — never in /public, never sent without the admin cookie.
export const adminPage = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Admin</title><style>
*{box-sizing:border-box;margin:0}body{background:#030409;color:#fff;font:13px system-ui,sans-serif;padding:14px}
h1{font-size:16px;color:#0af;margin-bottom:12px}.row{display:flex;gap:8px;flex-wrap:wrap}.st{flex:1;min-width:90px;background:#0a0e1a;border:1px solid #222;border-radius:10px;padding:10px;text-align:center}.st b{display:block;font-size:20px;color:#fa0}
.card{background:#0a0e1a;border:1px solid #222;border-radius:12px;padding:12px;margin:10px 0}input{width:100%;padding:9px;margin:6px 0;background:#030409;border:1px solid #0af;color:#fff;border-radius:8px}
button{padding:7px 10px;border:0;border-radius:7px;background:#06c;color:#fff;font-weight:700;cursor:pointer;margin:2px}button.r{background:#a02}button.g{background:#087d45}
table{width:100%;border-collapse:collapse}td{padding:7px 4px;border-bottom:1px solid #1a1a1a;vertical-align:middle}.tag{font-size:10px;padding:2px 6px;border-radius:5px;background:#222}.bad{background:#a02}.ok{background:#087d45}#t{position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#0a0e1a;border:1px solid #0af;padding:8px 14px;border-radius:9px;display:none}
</style></head><body><div id="t"></div><h1>👑 SHAN ADMIN <button class="r" id="out">LOCK</button></h1>
<div class="row"><div class="st"><b id="s1">-</b>Bots</div><div class="st"><b id="s2">-</b>Active</div><div class="st"><b id="s3">-</b>Blocked</div></div>
<div class="card"><b>📢 Broadcast (to every bot's WhatsApp)</b><input id="bc" maxlength="500" placeholder="Message..."><button id="bcb">SEND</button></div>
<div class="card"><b>🔔 Site announcement</b><input id="an" maxlength="500" placeholder="Empty = remove"><button class="g" id="anb">SAVE</button></div>
<div class="card"><b>🤖 Bots</b><table id="tb"></table></div>
<script>
const $=i=>document.getElementById(i);
function toast(m){const t=$("t");t.textContent=m;t.style.display="block";setTimeout(()=>t.style.display="none",2500)}
async function api(a,body){const r=await fetch("/api/admin?a="+a,body?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{});if(r.status===401){location.href="/";return {}}return r.json()}
const act=(o)=>api("act",o).then(d=>{toast(d.error||"Done"+(d.queued!=null?" ("+d.queued+")":""));load()});
async function load(){const d=await api("data");if(!d.accounts)return;$("s1").textContent=d.total;$("s2").textContent=d.activated;$("s3").textContent=d.blocked;$("an").value=d.announcement;
const tb=$("tb");tb.textContent="";for(const a of d.accounts){const tr=tb.insertRow();let c=tr.insertCell();c.textContent="+"+a.number+(a.name?" · "+a.name:"")+(a.owner?" 👑":"");
c=tr.insertCell();const s=document.createElement("span");s.className="tag "+(a.blocked?"bad":a.activated?"ok":"");s.textContent=a.blocked?"BLOCKED":a.activated?"ACTIVE":"PENDING";c.append(s);
c=tr.insertCell();if(!a.owner)for(const [l,o,k] of [[a.blocked?"Unblock":"Block",a.blocked?"unblock":"block",a.blocked?"g":"r"],["New key","resetkey",""],["Delete","delete","r"]]){const b=document.createElement("button");b.textContent=l;b.className=k;b.onclick=()=>{if(o==="delete"&&!confirm("Delete +"+a.number+"?"))return;act({op:o,number:a.number})};c.append(b)}}}
$("bcb").onclick=()=>$("bc").value.trim()&&act({op:"broadcast",text:$("bc").value}).then(()=>$("bc").value="");
$("anb").onclick=()=>act({op:"announce",text:$("an").value});
$("out").onclick=async()=>{await api("logout",{});location.href="/"};load();
</script></body></html>`;
