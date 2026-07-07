/**
 * Pulse — AutoBlog network analytics dashboard (mobile-first, login-gated).
 *
 * Data flow: the local PC pushes Cloudflare GraphQL snapshots into KV
 * (generator/push_pulse.py, scheduled every 15 min). This worker serves the
 * UI, checks a session cookie, and reads KV — so the dashboard stays up even
 * when the PC is off (numbers just show their sync age). Site health is
 * re-checked live from the edge on every load.
 *
 * Secrets (wrangler secret put): ADMIN_PASS_HASH ("salt$sha256hex"), SESSION_SECRET.
 */

const SESSION_DAYS = 30;

// ── crypto helpers ─────────────────────────────────────
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");

async function sha256Hex(s) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

function timingSafeEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// ── session cookie ─────────────────────────────────────
function getCookie(request, name) {
  const c = request.headers.get("Cookie") || "";
  const m = c.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : "";
}

async function makeSession(env) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  return exp + "." + (await hmacHex(env.SESSION_SECRET, "pulse:" + exp));
}

async function checkSession(env, tok) {
  if (!tok) return false;
  const i = tok.indexOf(".");
  if (i < 1) return false;
  const exp = tok.slice(0, i), sig = tok.slice(i + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return timingSafeEq(sig, await hmacHex(env.SESSION_SECRET, "pulse:" + exp));
}

const json = (o, status = 200, headers = {}) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", ...headers } });
const html = (s) => new Response(s, {
  headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-store" },
});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── auth endpoints ─────────────────────────────────────
// Best-effort per-isolate brute-force throttle (not shared across colos, but
// raises the cost of parallel guessing far above the 1200ms response delay).
const FAILS = new Map(); // ip -> {n, t}
const FAIL_MAX = 6, FAIL_WINDOW = 600e3;

async function handleLogin(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad request" }, 400); }
  const email = String(body.email || "").trim().toLowerCase();
  const pass = String(body.password || "");
  if (email.length > 200 || pass.length > 200) return json({ error: "bad request" }, 400);

  const ip = request.headers.get("cf-connecting-ip") || "?";
  const f = FAILS.get(ip);
  if (f && f.n >= FAIL_MAX && Date.now() - f.t < FAIL_WINDOW)
    return json({ error: "too many attempts — wait 10 minutes" }, 429);

  const [salt, want] = String(env.ADMIN_PASS_HASH || "").split("$");
  const got = await sha256Hex(salt + pass);
  const ok = timingSafeEq(email, String(env.ADMIN_EMAIL || "").toLowerCase()) && timingSafeEq(got, want || "");
  if (!ok) {
    const cur = FAILS.get(ip);
    FAILS.set(ip, { n: (cur && Date.now() - cur.t < FAIL_WINDOW ? cur.n : 0) + 1, t: Date.now() });
    if (FAILS.size > 5000) FAILS.clear();
    await sleep(1200);
    return json({ error: "wrong email or password" }, 401);
  }
  FAILS.delete(ip);

  const tok = await makeSession(env);
  return json({ ok: true }, 200, {
    "set-cookie": `pulse_s=${tok}; Max-Age=${SESSION_DAYS * 86400}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  });
}

const handleLogout = () => json({ ok: true }, 200, {
  "set-cookie": "pulse_s=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
});

// ── data endpoints ─────────────────────────────────────
async function handleData(env, range) {
  const raw = await env.PULSE.get("pulse:all", "json");
  if (!raw) return json({ empty: true });
  const snap = raw.ranges[range] || raw.ranges["7d"] || { sites: [], total: {} };
  snap.syncedAt = raw.updatedAt;
  return json(snap);
}

async function probe(domain, path) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 6000);
    const r = await fetch("https://" + domain + path, {
      redirect: "follow", signal: c.signal,
      headers: { "user-agent": "Mozilla/5.0 (pulse-health)" },
    });
    clearTimeout(t);
    // drain tiny bit then cancel so the subrequest closes cleanly
    try { await r.body?.cancel(); } catch {}
    return r.status;
  } catch { return 0; }
}

async function handleHealth(env) {
  const domains = ["countly.net", "walvi.io", "infkey.com", "ninetymins.com"];
  const out = await Promise.all(domains.map(async (d) => {
    const [home, sm, rb] = await Promise.all([probe(d, "/"), probe(d, "/sitemap.xml"), probe(d, "/robots.txt")]);
    return { domain: d, live: home === 200, status: home, sitemap: sm === 200, robots: rb === 200 };
  }));
  return json({ health: out, checkedAt: new Date().toISOString() });
}

// ── router ─────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === "/api/login" && request.method === "POST") return handleLogin(request, env);
    if (p === "/api/logout" && request.method === "POST") return handleLogout();

    const authed = await checkSession(env, getCookie(request, "pulse_s"));

    if (p.startsWith("/api/")) {
      if (!authed) return json({ error: "unauthorized" }, 401);
      if (p === "/api/data") return handleData(env, url.searchParams.get("range") || "7d");
      if (p === "/api/health") return handleHealth(env);
      return json({ error: "not found" }, 404);
    }
    if (p !== "/") return new Response("not found", { status: 404 });
    return html(authed ? DASH_HTML : LOGIN_HTML);
  },
};

// ═══════════════════════════════════════════════════════
//  SHARED STYLE
// ═══════════════════════════════════════════════════════
const BASE_CSS = `
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:root{
  --bg:#070b14;--card:rgba(255,255,255,.045);--card2:rgba(255,255,255,.07);
  --line:rgba(255,255,255,.09);--txt:#eef1fb;--mut:#8b93b8;--mut2:#5c648a;
  --acc:#818cf8;--acc2:#22d3ee;--good:#34d399;--bad:#fb7185;--warn:#fbbf24;
}
html{color-scheme:dark}
body{
  background:var(--bg);color:var(--txt);min-height:100vh;min-height:100dvh;
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;
}
body::before{
  content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:
    radial-gradient(60% 42% at 12% -8%, rgba(99,102,241,.28), transparent 62%),
    radial-gradient(50% 38% at 95% 2%, rgba(34,211,238,.16), transparent 60%),
    radial-gradient(45% 40% at 55% 110%, rgba(168,85,247,.14), transparent 60%);
}
.font-d{font-family:'Space Grotesk','Inter',sans-serif}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
input{font-family:inherit}
::-webkit-scrollbar{display:none}
`;

const HEAD_COMMON = `
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#070b14">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Pulse">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23818cf8'/><stop offset='1' stop-color='%2322d3ee'/></linearGradient></defs><rect rx='24' width='100' height='100' fill='%23101528'/><path d='M54 12 26 56h20l-8 32 36-48H52z' fill='url(%23g)'/></svg>">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="manifest" href='data:application/json,{"name":"Pulse","short_name":"Pulse","display":"standalone","start_url":"/","background_color":"%23070b14","theme_color":"%23070b14"}'>
`;

// ═══════════════════════════════════════════════════════
//  LOGIN PAGE
// ═══════════════════════════════════════════════════════
const LOGIN_HTML = `<!doctype html>
<html lang="en"><head><title>Pulse — sign in</title>${HEAD_COMMON}
<style>${BASE_CSS}
.wrap{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{
  width:100%;max-width:380px;background:var(--card);border:1px solid var(--line);
  border-radius:24px;padding:38px 30px;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  box-shadow:0 24px 70px rgba(0,0,0,.45);animation:up .5s cubic-bezier(.2,.8,.25,1) both;
}
@keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.logo{display:flex;align-items:center;gap:12px;margin-bottom:6px}
.bolt{
  width:44px;height:44px;border-radius:13px;display:grid;place-items:center;font-size:22px;
  background:linear-gradient(135deg,#818cf8,#22d3ee);box-shadow:0 8px 24px rgba(99,102,241,.4);
}
.logo h1{font-size:26px;font-weight:700;letter-spacing:-.5px}
.sub{color:var(--mut);font-size:13.5px;margin-bottom:28px}
label{display:block;font-size:12px;font-weight:600;color:var(--mut);letter-spacing:.06em;text-transform:uppercase;margin:0 0 7px 2px}
input{
  width:100%;padding:13px 15px;border-radius:13px;border:1px solid var(--line);
  background:rgba(255,255,255,.05);color:var(--txt);font-size:16px;outline:none;
  transition:border-color .2s, box-shadow .2s;margin-bottom:18px;
}
input:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(129,140,248,.18)}
.btn{
  width:100%;padding:14px;border-radius:13px;font-size:15.5px;font-weight:700;color:#fff;
  background:linear-gradient(135deg,#6366f1,#22d3ee);box-shadow:0 10px 26px rgba(99,102,241,.35);
  transition:transform .15s, filter .2s;
}
.btn:active{transform:scale(.98)}
.btn[disabled]{filter:grayscale(.5) brightness(.7)}
.err{
  display:none;background:rgba(251,113,133,.1);border:1px solid rgba(251,113,133,.3);color:#fda4af;
  padding:11px 14px;border-radius:12px;font-size:13.5px;margin-bottom:18px;
}
.shake{animation:sh .4s}
@keyframes sh{0%,100%{transform:none}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
.foot{margin-top:24px;text-align:center;color:var(--mut2);font-size:12px}
</style></head><body>
<div class="wrap"><form class="card" id="f">
  <div class="logo"><div class="bolt">⚡</div><h1 class="font-d">Pulse</h1></div>
  <p class="sub">AutoBlog network — private dashboard</p>
  <div class="err" id="err"></div>
  <label>Email</label>
  <input id="em" type="email" autocomplete="username" inputmode="email" required>
  <label>Password</label>
  <input id="pw" type="password" autocomplete="current-password" required>
  <button class="btn" id="go" type="submit">Sign in →</button>
  <p class="foot">countly · walvi · infkey · ninetymins</p>
</form></div>
<script>
var f=document.getElementById('f'),err=document.getElementById('err'),go=document.getElementById('go');
f.addEventListener('submit',function(ev){
  ev.preventDefault();
  go.disabled=true;go.textContent='Checking…';err.style.display='none';
  fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({email:document.getElementById('em').value,password:document.getElementById('pw').value})})
  .then(function(r){if(r.ok){location.reload();return;}
    err.textContent='Wrong email or password';err.style.display='block';
    f.classList.remove('shake');void f.offsetWidth;f.classList.add('shake');
    go.disabled=false;go.textContent='Sign in →';})
  .catch(function(){err.textContent='Network error — try again';err.style.display='block';
    go.disabled=false;go.textContent='Sign in →';});
});
</script></body></html>`;

// ═══════════════════════════════════════════════════════
//  DASHBOARD  (client JS uses NO template literals on purpose)
// ═══════════════════════════════════════════════════════
const DASH_HTML = `<!doctype html>
<html lang="en"><head><title>Pulse</title>${HEAD_COMMON}
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js"></script>
<style>${BASE_CSS}
.app{max-width:1080px;margin:0 auto;padding:0 16px calc(40px + env(safe-area-inset-bottom))}
/* topbar */
.top{
  position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;
  padding:calc(12px + env(safe-area-inset-top)) 2px 12px;
  background:linear-gradient(180deg,rgba(7,11,20,.92),rgba(7,11,20,.75) 70%,transparent);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
}
.bolt{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;font-size:17px;
  background:linear-gradient(135deg,#818cf8,#22d3ee);box-shadow:0 6px 18px rgba(99,102,241,.4);flex:none}
.top h1{font-size:20px;font-weight:700;letter-spacing:-.4px}
.sync{margin-left:auto;text-align:right;font-size:11px;color:var(--mut);line-height:1.5}
.sync b{color:var(--good);font-weight:600}
.icon{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;font-size:15px;
  background:var(--card);border:1px solid var(--line);transition:transform .4s;flex:none}
.icon:active{transform:rotate(180deg) scale(.94)}
/* pills */
.row{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 2px;scrollbar-width:none}
.pill{
  flex:none;padding:8px 15px;border-radius:999px;font-size:13px;font-weight:600;color:var(--mut);
  background:var(--card);border:1px solid var(--line);transition:all .2s;
}
.pill.on{color:#fff;background:linear-gradient(135deg,#6366f1,#4f46e5);border-color:transparent;
  box-shadow:0 6px 18px rgba(99,102,241,.35)}
.tabs{margin-top:10px}
.tab{flex:none;display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:999px;
  font-size:12.5px;font-weight:600;color:var(--mut);background:var(--card);border:1px solid var(--line)}
.tab .dot{width:7px;height:7px;border-radius:50%}
.tab.on{color:var(--txt);background:var(--card2);border-color:rgba(129,140,248,.5)}
/* stat cards */
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:16px}
@media(min-width:760px){.stats{grid-template-columns:repeat(4,1fr)}}
.stat{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 16px 14px;
  position:relative;overflow:hidden}
.stat::after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(129,140,248,.07),transparent 55%);pointer-events:none}
.stat small{font-size:11px;font-weight:600;color:var(--mut);letter-spacing:.07em;text-transform:uppercase}
.stat b{display:block;font-size:26px;font-weight:800;letter-spacing:-.8px;margin-top:5px}
.stat .xs{font-size:11px;color:var(--mut2);margin-top:3px;display:block}
.up{color:var(--good)}.dn{color:var(--bad)}
/* panels */
.panel{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:18px;margin-top:14px}
.panel h3{font-size:14.5px;font-weight:700;display:flex;align-items:center;gap:8px;margin-bottom:14px}
.panel h3 small{font-weight:500;color:var(--mut2);font-size:11px;margin-left:auto}
.grid2{display:grid;gap:14px}
@media(min-width:860px){.grid2{grid-template-columns:1.25fr 1fr}}
/* site cards */
.sites{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:14px}
@media(min-width:760px){.sites{grid-template-columns:repeat(4,1fr)}}
.site{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:13px 14px;text-align:left;transition:border-color .2s}
.site.on{border-color:rgba(129,140,248,.55);background:var(--card2)}
.site .nm{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--txt)}
.site .nm .dot{width:7px;height:7px;border-radius:50%;flex:none}
.site b{display:block;font-size:19px;font-weight:800;margin:6px 0 2px}
.site svg{width:100%;height:26px;margin-top:4px}
.site .st{font-size:10px;font-weight:700;letter-spacing:.05em}
/* lists */
.li{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px}
.li:last-child{border-bottom:none}
.li .lbl{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#cfd6ee}
.li .lbl em{font-style:normal;color:var(--mut2);font-size:11px}
.li .bar{flex:none;width:74px;height:5px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden}
.li .bar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,#6366f1,#22d3ee)}
.li .n{flex:none;min-width:36px;text-align:right;font-weight:700;font-size:12.5px;font-variant-numeric:tabular-nums}
.flag{font-size:16px;flex:none}
/* health */
.hrow{display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);flex-wrap:wrap}
.hrow:last-child{border-bottom:none}
.hrow .dm{font-size:13px;font-weight:600;flex:1;min-width:110px}
.hp{padding:4px 10px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.04em}
.hp.ok{background:rgba(52,211,153,.13);color:var(--good)}
.hp.no{background:rgba(251,113,133,.13);color:var(--bad)}
.hp.wt{background:rgba(255,255,255,.06);color:var(--mut2)}
/* forecast */
.frow{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px}
.frow:last-child{border-bottom:none}
.frow b{font-variant-numeric:tabular-nums}
.note{color:var(--mut2);font-size:11.5px;line-height:1.7;margin-top:16px;padding:0 4px}
.skel{opacity:.45;pointer-events:none;filter:saturate(.6)}
#load{position:fixed;inset:0;display:grid;place-items:center;background:var(--bg);z-index:50;transition:opacity .4s}
#load.off{opacity:0;pointer-events:none}
.spin{width:38px;height:38px;border-radius:50%;border:3px solid rgba(129,140,248,.2);border-top-color:#818cf8;animation:rot .8s linear infinite}
@keyframes rot{to{transform:rotate(360deg)}}
.empty{padding:20px;text-align:center;color:var(--mut);font-size:13px}
</style></head><body>
<div id="load"><div class="spin"></div></div>
<div class="app">
  <div class="top">
    <div class="bolt">⚡</div><h1 class="font-d">Pulse</h1>
    <div class="sync" id="sync">—</div>
    <button class="icon" id="rf" title="Refresh">⟳</button>
    <button class="icon" id="out" title="Sign out">⏻</button>
  </div>

  <div class="row" id="ranges">
    <button class="pill" data-r="24h">24 h</button>
    <button class="pill on" data-r="7d">1 week</button>
    <button class="pill" data-r="14d">2 weeks</button>
    <button class="pill" data-r="30d">1 month</button>
    <button class="pill" data-r="1y">1 year</button>
  </div>
  <div class="row tabs" id="tabs"></div>

  <div id="main" class="skel">
    <div class="stats" id="stats"></div>
    <div class="sites" id="sitecards"></div>
    <div class="panel"><h3>📈 Visitors <small id="chart-cap"></small></h3><canvas id="ch" height="150"></canvas></div>
    <div class="grid2">
      <div class="panel"><h3>🔥 Top pages <small>last 24 h · sampled</small></h3><div id="paths"></div></div>
      <div>
        <div class="panel"><h3>🌍 Countries</h3><div id="ctry"></div></div>
        <div class="panel"><h3>💚 Health <small id="hcap">checking live…</small></h3><div id="hlth"></div></div>
        <div class="panel"><h3>🔮 Next 7 days <small>trend guess</small></h3><div id="fc"></div></div>
      </div>
    </div>
    <p class="note" id="notes"></p>
  </div>
</div>
<script>
var RANGE='7d', SITE='all', DATA=null, HEALTH=null, CHART=null;
var COLORS={countly:'#818cf8',walvi:'#34d399',infkey:'#fbbf24',ninetymins:'#fb7185'};
var ISO={'Bangladesh':'BD','India':'IN','United States':'US','United States of America':'US','United Kingdom':'GB','Germany':'DE','France':'FR','Canada':'CA','Australia':'AU','Pakistan':'PK','Saudi Arabia':'SA','United Arab Emirates':'AE','Qatar':'QA','Kuwait':'KW','Oman':'OM','Bahrain':'BH','Singapore':'SG','Malaysia':'MY','Indonesia':'ID','Netherlands':'NL','Italy':'IT','Spain':'ES','Brazil':'BR','Japan':'JP','China':'CN','South Korea':'KR','Turkey':'TR','Russia':'RU','Russian Federation':'RU','Poland':'PL','Sweden':'SE','Norway':'NO','Finland':'FI','Denmark':'DK','Ireland':'IE','Serbia':'RS','Greece':'GR','South Africa':'ZA','Nigeria':'NG','Egypt':'EG','Vietnam':'VN','Philippines':'PH','Thailand':'TH','Hong Kong':'HK','Taiwan':'TW','Ukraine':'UA','Romania':'RO','Portugal':'PT','Mexico':'MX','Argentina':'AR','Switzerland':'CH','Austria':'AT','Belgium':'BE','Czechia':'CZ','Hungary':'HU','Israel':'IL','Nepal':'NP','Sri Lanka':'LK','Myanmar':'MM','Morocco':'MA','Kenya':'KE','New Zealand':'NZ','Croatia':'HR','Bulgaria':'BG','Slovakia':'SK','Lithuania':'LT'};
function flag(name){var c=ISO[name];if(!c)return '🌐';
  return String.fromCodePoint(127397+c.charCodeAt(0),127397+c.charCodeAt(1));}
function fmt(n){n=n||0;if(n>=1e6)return (n/1e6).toFixed(1)+'M';if(n>=1e4)return (n/1e3).toFixed(1)+'k';return n.toLocaleString();}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function ago(iso){if(!iso)return '—';var m=Math.round((Date.now()-new Date(iso).getTime())/60000);
  if(m<1)return 'now';if(m<60)return m+' min ago';var h=Math.floor(m/60);
  if(h<48)return h+' h ago';return Math.floor(h/24)+' d ago';}

function load(){
  fetch('/api/data?range='+RANGE).then(function(r){
    if(r.status===401){location.reload();return null;}return r.json();
  }).then(function(d){
    if(!d)return;DATA=d;
    document.getElementById('load').classList.add('off');
    document.getElementById('main').classList.remove('skel');
    render();
  }).catch(function(){document.getElementById('load').classList.add('off');
    document.getElementById('main').classList.remove('skel');});
}
function loadHealth(){
  fetch('/api/health').then(function(r){return r.ok?r.json():null;}).then(function(h){
    if(h){HEALTH=h;renderHealth();}
  }).catch(function(){});
}

function sel(){if(SITE==='all')return null;
  for(var i=0;i<(DATA.sites||[]).length;i++)if(DATA.sites[i].id===SITE)return DATA.sites[i];return null;}

function render(){
  if(!DATA||DATA.empty){document.getElementById('stats').innerHTML='<div class="empty" style="grid-column:1/-1">No snapshot yet — PC pusher runs every 15 min.</div>';return;}
  var s=sel(), sites=DATA.sites||[];
  var tot=s?{uniques:s.uniques||0,pageviews:s.pageviews||0,requests:s.requests||0}:DATA.total||{};
  document.getElementById('sync').innerHTML='<b>●</b> synced '+ago(DATA.syncedAt);

  // tabs
  var tabs='<button class="tab'+(SITE==='all'?' on':'')+'" data-s="all">✦ All sites</button>';
  sites.forEach(function(x){
    tabs+='<button class="tab'+(SITE===x.id?' on':'')+'" data-s="'+x.id+'"><span class="dot" style="background:'+COLORS[x.id]+'"></span>'+esc(x.domain)+'</button>';
  });
  document.getElementById('tabs').innerHTML=tabs;

  // stat cards
  var fcAll=0,fcKnown=false;
  sites.forEach(function(x){var f=(x.forecast||{}).next7d;if(f!=null){fcAll+=f;fcKnown=true;}});
  var fcv=s?((s.forecast||{}).next7d):(fcKnown?fcAll:null);
  var tp=s?(s.forecast||{}).trendPct:null;
  document.getElementById('stats').innerHTML=
    '<div class="stat"><small>Visitors</small><b>'+fmt(tot.uniques)+'</b><span class="xs">unique</span></div>'+
    '<div class="stat"><small>Pageviews</small><b>'+fmt(tot.pageviews)+'</b><span class="xs">'+RANGE+'</span></div>'+
    '<div class="stat"><small>Requests</small><b>'+fmt(tot.requests)+'</b><span class="xs">edge total</span></div>'+
    '<div class="stat"><small>Next 7 days</small><b>'+(fcv!=null?'~'+fmt(fcv):'—')+'</b><span class="xs">'+
      (tp!=null?('<span class="'+(tp>=0?'up':'dn')+'">'+(tp>=0?'▲ ':'▼ ')+Math.abs(tp)+'%</span> trend'):'needs 3+ days data')+'</span></div>';

  // site mini-cards (All view only)
  var sc='';
  if(!s){sites.forEach(function(x){
    var pts=(x.series||[]).map(function(p){return p.uniques;});
    sc+='<button class="site" data-s="'+x.id+'"><span class="nm"><span class="dot" style="background:'+COLORS[x.id]+'"></span>'+esc(x.domain.replace(/\\..*$/,''))+'</span>'+
      '<b>'+fmt(x.uniques)+'</b>'+spark(pts,COLORS[x.id])+'</button>';
  });}
  document.getElementById('sitecards').innerHTML=sc;

  try{renderChart(s?[s]:sites);}catch(e){}

  // top pages
  var rows=merged(s?[s]:sites,'topPaths','path','views',12);
  document.getElementById('paths').innerHTML=rows.length?rows.map(function(r){
    return '<div class="li"><span class="lbl">'+esc(r.label)+(r.tag?' <em>'+esc(r.tag)+'</em>':'')+'</span>'+
      '<span class="bar"><i style="width:'+r.pct+'%"></i></span><span class="n">'+fmt(r.v)+'</span></div>';
  }).join(''):'<div class="empty">No page data yet</div>';

  // countries
  var cs=merged(s?[s]:sites,'countries','country','requests',8);
  document.getElementById('ctry').innerHTML=cs.length?cs.map(function(r){
    return '<div class="li"><span class="flag">'+flag(r.label)+'</span><span class="lbl">'+esc(r.label)+'</span>'+
      '<span class="bar"><i style="width:'+r.pct+'%"></i></span><span class="n">'+fmt(r.v)+'</span></div>';
  }).join(''):'<div class="empty">No data</div>';

  renderHealth();

  // forecast list
  document.getElementById('fc').innerHTML=sites.map(function(x){
    var f=x.forecast||{};
    var t=f.trendPct==null?'':' <span class="'+(f.trendPct>=0?'up':'dn')+'">'+(f.trendPct>=0?'▲':'▼')+Math.abs(f.trendPct)+'%</span>';
    return '<div class="frow"><span>'+esc(x.domain)+'</span><b>'+(f.next7d!=null?'~'+fmt(f.next7d):'soon')+t+'</b></div>';
  }).join('');

  document.getElementById('notes').innerHTML=(DATA.notes||[]).map(function(n){return 'ⓘ '+esc(n);}).join('<br>');
}

function merged(list,key,k1,k2,top){
  var m={},tag={};
  list.forEach(function(x){(x[key]||[]).forEach(function(it){
    var l=it[k1];m[l]=(m[l]||0)+it[k2];
    if(list.length>1)tag[l]=tag[l]&&tag[l]!==x.id?'multi':x.id;
  });});
  var arr=Object.keys(m).map(function(k){return {label:k,v:m[k],tag:list.length>1&&tag[k]!=='multi'?tag[k]:''};});
  arr.sort(function(a,b){return b.v-a.v;});arr=arr.slice(0,top);
  var mx=arr.length?arr[0].v:1;
  arr.forEach(function(r){r.pct=Math.max(4,Math.round(r.v/mx*100));});
  return arr;
}

function spark(pts,color){
  if(pts.length<2)return '<svg></svg>';
  var w=100,h=26,mx=Math.max.apply(null,pts.concat([1]));
  var pp=pts.map(function(v,i){return (i/(pts.length-1)*w).toFixed(1)+','+(h-3-(v/mx*(h-6))).toFixed(1);}).join(' ');
  return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><polyline points="'+pp+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round" opacity=".9"/></svg>';
}

function renderChart(list){
  if(typeof Chart==='undefined')return;
  // CF omits zero-traffic buckets, so series lengths differ per site —
  // join on the time key instead of aligning by array index.
  var seen={};list.forEach(function(x){(x.series||[]).forEach(function(p){seen[p.t]=1;});});
  var keys=Object.keys(seen).sort();
  var labels=keys.map(function(t){return t.length>10?t.slice(11,16):t.slice(5);});
  var ds=list.map(function(x){
    var m={};(x.series||[]).forEach(function(p){m[p.t]=p.uniques;});
    return {label:x.domain,data:keys.map(function(t){return m[t]||0;}),
      borderColor:COLORS[x.id],backgroundColor:COLORS[x.id]+'22',fill:list.length===1,
      tension:.35,borderWidth:2,pointRadius:0,pointHitRadius:14};
  });
  document.getElementById('chart-cap').textContent=RANGE==='24h'?'hourly':'daily';
  if(CHART)CHART.destroy();
  CHART=new Chart(document.getElementById('ch'),{type:'line',data:{labels:labels,datasets:ds},
    options:{responsive:true,maintainAspectRatio:true,interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:list.length>1,labels:{color:'#8b93b8',boxWidth:8,boxHeight:8,usePointStyle:true,font:{size:11}}}},
      scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#5c648a',maxTicksLimit:7,font:{size:10}}},
        y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#5c648a',font:{size:10},precision:0},beginAtZero:true}}}});
}

function renderHealth(){
  var sites=(DATA&&DATA.sites)||[];
  var live=HEALTH&&HEALTH.health;
  document.getElementById('hcap').textContent=live?('live · '+ago(HEALTH.checkedAt)):'from last sync';
  document.getElementById('hlth').innerHTML=sites.map(function(x){
    var h=x.health||{};
    if(live){for(var i=0;i<live.length;i++)if(live[i].domain===x.domain&&live[i].status>0)h=live[i];}
    return '<div class="hrow"><span class="dm">'+esc(x.domain)+'</span>'+
      '<span class="hp '+(h.live?'ok':'no')+'">'+(h.live?'● LIVE':'● DOWN'+(h.status?' '+h.status:''))+'</span>'+
      '<span class="hp '+(h.sitemap?'ok':'no')+'">sitemap</span>'+
      '<span class="hp '+(h.robots?'ok':'no')+'">robots</span></div>';
  }).join('');
}

// events
document.getElementById('ranges').addEventListener('click',function(e){
  var b=e.target.closest('[data-r]');if(!b)return;RANGE=b.dataset.r;
  document.querySelectorAll('#ranges .pill').forEach(function(x){x.classList.toggle('on',x===b);});
  load();
});
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-s]');if(!b)return;SITE=b.dataset.s;render();
});
document.getElementById('rf').addEventListener('click',function(){load();loadHealth();});
document.getElementById('out').addEventListener('click',function(){
  fetch('/api/logout',{method:'POST'}).then(function(){location.reload();});
});
load();loadHealth();
setInterval(load,120000);setInterval(loadHealth,180000);
</script></body></html>`;
