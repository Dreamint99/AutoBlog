// বাংলা টাইমলাইন auto-newsroom. Runs every 30 min (Windows Task Scheduler or GitHub Actions):
//   1. read RSS of major Bangla outlets  2. cluster the same event across outlets  3. rank (how many outlets, how fresh)
//   4. DeepSeek (OpenRouter) writes an original Bangla report from the sources  5. featured image: Wikimedia Commons
//   (free licence, credited) or a text thumbnail — watermarked in headless Chrome  6. POST to the site's /api/ingest.
// Usage: node auto/run.mjs [--dry] [--max N]      config: auto/.env (INGEST_TOKEN, SITE, OPENROUTER_API_KEY, OPENROUTER_MODEL, DAILY_LIMIT)
import fs from "fs"; import path from "path"; import http from "http"; import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";

const DIR = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(DIR, "..");
const envFile = path.join(DIR, ".env");
const env = Object.fromEntries((fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
for (const k of ["INGEST_TOKEN", "SITE", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "DAILY_LIMIT", "DEEPSEEK_API_KEY", "PIXABAY_API_KEY", "CHROME"]) if (process.env[k]) env[k] = process.env[k];
const DRY = process.argv.includes("--dry");
const MAX_RUN = +(process.argv[process.argv.indexOf("--max") + 1] || 0) || 2;
const LIMIT = +(env.DAILY_LIMIT || 15);
const UA = "Mozilla/5.0 (compatible; BanglaTimelineBot/1.0; +https://banglatimeline.com)";
const log = (...a) => { const line = `[${new Date().toISOString()}] ${a.join(" ")}`; console.log(line); fs.appendFileSync(path.join(DIR, "log.txt"), line + "\n"); };

const FEEDS = [
  ["প্রথম আলো", "https://www.prothomalo.com/feed/"],
  ["বিবিসি বাংলা", "https://feeds.bbci.co.uk/bengali/rss.xml"],
  ["বাংলা ট্রিবিউন", "https://www.banglatribune.com/feed/"],
  ["ঢাকা পোস্ট", "https://www.dhakapost.com/rss/rss.xml"],
  ["আজকের পত্রিকা", "https://www.ajkerpatrika.com/feed"],
  ["চ্যানেল ২৪", "https://www.channel24bd.tv/rss/rss.xml"],
  ["নয়া দিগন্ত", "https://www.dailynayadiganta.com/rss/rss.xml"],
];
const CATS = ["national", "politics", "country", "international", "economy", "sports", "entertainment", "probash", "tech", "lifestyle", "opinion"];
const CAT_BN = { national: "জাতীয়", politics: "রাজনীতি", country: "সারাদেশ", international: "আন্তর্জাতিক", economy: "অর্থনীতি", sports: "খেলা", entertainment: "বিনোদন", probash: "প্রবাস", tech: "প্রযুক্তি", lifestyle: "জীবনযাপন", opinion: "মতামত" };
const URGENT = /(নিহত|মৃত্যু|মারা গেছেন|বিস্ফোরণ|ভূমিকম্প|অগ্নিকাণ্ড|আগুন|দুর্ঘটনা|হামলা|গুলি|পদত্যাগ|গ্রেপ্তার|ঘোষণা|জরুরি|নিষেধাজ্ঞা|সংঘর্ষ|ঘূর্ণিঝড়|বন্যা|রায়)/;
const STOP = new Set("এ ও না থেকে করে করা হয় হয়েছে জন্য সঙ্গে সাথে বলে বললেন একটি এক এই সেই তার তাদের আর বা কি কী যে নিয়ে দিয়ে হবে হলো হল ছিল আছে নেই পর আগে মধ্যে মাঝে কাছে উপর ওপর থেকেই হচ্ছে করেছে দিলেন দিল গেল গেছে".split(" "));

// ---------- helpers ----------
const strip = (s = "") => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
const tag = (x, t) => (x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || "";
const words = (s) => new Set(s.replace(/[^\u0980-\u09FFa-zA-Z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)));
const jacc = (a, b) => { let i = 0; for (const w of a) if (b.has(w)) i++; return i / Math.max(1, Math.min(a.size, b.size)); };
const api = async (p, opt = {}) => {
  const r = await fetch(env.SITE + p, { ...opt, headers: { authorization: `Bearer ${env.INGEST_TOKEN}`, "content-type": "application/json", ...(opt.headers || {}) } });
  if (!r.ok) throw new Error(`${p} → ${r.status} ${await r.text()}`);
  return r.json();
};
const get = (u, ms = 15000) => fetch(u, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(ms), redirect: "follow" });

async function readFeeds() {
  const items = [], cut = Date.now() - 10 * 3600e3;
  await Promise.all(FEEDS.map(async ([src, url]) => {
    try {
      const x = await (await get(url)).text();
      for (const it of x.split(/<item[\s>]/).slice(1)) {
        const title = strip(tag(it, "title")), link = strip(tag(it, "link")) || (it.match(/<guid[^>]*>([^<]+)/) || [])[1];
        const t = Date.parse(strip(tag(it, "pubDate")) || strip(tag(it, "dc:date")));
        const text = strip(tag(it, "content:encoded") || tag(it, "description")).slice(0, 2500);
        if (/একঝলক|রাশিফল|নামাজের সময়|ছবিতে দেখুন|আজকের খেলা|টিভিতে আজ|সংবাদ সম্মেলনের লাইভ/.test(title)) continue;
        if (title && link && (!t || t > cut)) items.push({ src, title, link: link.trim(), t: t || Date.now(), text, w: words(title) });
      }
    } catch (e) { log("feed fail", src, e.message); }
  }));
  return items;
}
function cluster(items) {
  const cl = [];
  for (const it of items.sort((a, b) => b.t - a.t)) {
    const c = cl.find((c) => jacc(c.w, it.w) >= 0.5 || [...it.w].filter((w) => c.w.has(w) && w.length > 3).length >= 3);
    if (c) { c.items.push(it); for (const w of it.w) c.w.add(w); } else cl.push({ items: [it], w: new Set(it.w) });
  }
  for (const c of cl) {
    c.srcs = new Set(c.items.map((i) => i.src));
    c.newest = Math.max(...c.items.map((i) => i.t));
    const ageH = (Date.now() - c.newest) / 3600e3;
    c.urgent = c.items.some((i) => URGENT.test(i.title));
    c.score = c.srcs.size * 3 + (c.urgent ? 2 : 0) - ageH * 0.6;
    c.breakingHint = (c.srcs.size >= 3 && ageH < 2) || (c.urgent && c.srcs.size >= 2 && ageH < 1.5);
    c.key = c.items.map((i) => i.link);
  }
  return cl.sort((a, b) => b.score - a.score);
}
async function fullText(link) {
  try {
    const h = await (await get(link, 12000)).text();
    const ps = [...h.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => strip(m[1])).filter((p) => p.length > 60 && /[\u0980-\u09FF]/.test(p));
    return ps.slice(0, 18).join("\n").slice(0, 5000);
  } catch { return ""; }
}

// ---------- LLM ----------
const SYSTEM = `তুমি "বাংলা টাইমলাইন" নামের একটি বাংলাদেশি অনলাইন সংবাদপত্রের অভিজ্ঞ সংবাদ সম্পাদক।
নিয়ম (কঠোরভাবে মানবে):
- শুধু দেওয়া সূত্রের তথ্য ব্যবহার করবে। নতুন তথ্য, সংখ্যা, উদ্ধৃতি, নাম বানাবে না। অনিশ্চিত হলে বাদ দেবে।
- সূত্রের বাক্য হুবহু কপি করবে না; নিজের ভাষায়, প্রমিত বাংলায়, সংবাদ-রীতিতে লিখবে (প্রথম অনুচ্ছেদে কে-কী-কোথায়-কখন)।
- অভিযুক্তকে দোষী বলবে না ("অভিযুক্ত", "পুলিশ জানায়" ইত্যাদি)। শিশু, ধর্ষণ বা যৌন নিপীড়নের শিকার ব্যক্তির নাম ও পরিচয় প্রকাশ করবে না।
- মতামত, প্রচারণা বা আবেগপ্রবণ শব্দ নয়; নিরপেক্ষ থাকবে।
- সূত্র যথেষ্ট না হলে বা বিজ্ঞাপন/প্রেস রিলিজ/রাশিফল/বিনোদন-গসিপ হলে skip=true দেবে।
শুধু JSON ফেরত দেবে।`;
async function write(c, topics) {
  const docs = [];
  for (const it of c.items.slice(0, 3)) docs.push(`### সূত্র: ${it.src}\nশিরোনাম: ${it.title}\n${(await fullText(it.link)) || it.text}`);
  const user = `নিচের সূত্রগুলো একই ঘটনার। একটি মৌলিক সংবাদ প্রতিবেদন লেখো।
চলমান টপিকের তালিকা (প্রাসঙ্গিক হলে slug ব্যবহার করো): ${JSON.stringify(topics.map((t) => ({ slug: t.slug, name: t.name })))}
JSON ফরম্যাট:
{"skip":false,"title":"৮–১৪ শব্দের শিরোনাম","subtitle":"২–৪ শব্দের কিকার","summary":"১৬০ অক্ষরের মধ্যে সারাংশ","body":["৪–৭টি অনুচ্ছেদ, প্রতিটি ২–৪ বাক্য"],
"category":"${CATS.join("|")}","tags":["৩–৫টি বাংলা ট্যাগ"],"slug_en":"short-english-url-slug",
"breaking":false,"topic":{"slug":"বিদ্যমান টপিকের slug অথবা নতুন হলে english-slug, প্রযোজ্য না হলে null","name":"টপিকের বাংলা নাম","summary":"টপিকের এক লাইনের বর্ণনা"},
"image":{"wikimedia_query":"মূল ব্যক্তি/স্থানের ইংরেজি নাম (শুধু সুপরিচিত জনব্যক্তিত্ব, দল, শহর বা স্থাপনা হলে; নইলে খালি)","type":"person|place|none","stock_query":"প্রতীকী স্টক ছবির জন্য ২–৩ শব্দের ইংরেজি দৃশ্য (যেমন \"rice sacks warehouse\", \"football stadium\"); হত্যা/ধর্ষণ/শিশু নির্যাতন/আত্মহত্যার খবরে খালি"}}
breaking=true কেবল বড়, জরুরি, সদ্য-ঘটা ঘটনায় (বড় দুর্ঘটনা/প্রাণহানি, সরকার বা বড় প্রতিষ্ঠানের গুরুত্বপূর্ণ ঘোষণা, দুর্যোগ)।${c.breakingHint ? " (একাধিক সংবাদমাধ্যম এই মাত্র খবরটি দিয়েছে।)" : ""}
টপিক কেবল বড় চলমান ঘটনায় (যুদ্ধ, নির্বাচন, বড় মামলা, টুর্নামেন্ট, দুর্যোগ); সাধারণ খবরে topic=null।

${docs.join("\n\n")}`;
  const messages = [{ role: "system", content: SYSTEM }, { role: "user", content: user }];
  const providers = [
    env.OPENROUTER_API_KEY && ["https://openrouter.ai/api/v1/chat/completions", env.OPENROUTER_API_KEY, env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash"],
    env.DEEPSEEK_API_KEY && ["https://api.deepseek.com/chat/completions", env.DEEPSEEK_API_KEY, "deepseek-chat"],
  ].filter(Boolean);
  let j, lastErr;
  for (const [url, key, model] of providers) {
    try {
      const r = await fetch(url, { method: "POST", signal: AbortSignal.timeout(180000),
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "HTTP-Referer": "https://banglatimeline.com", "X-Title": "Bangla Timeline" },
        body: JSON.stringify({ model, temperature: 0.3, response_format: { type: "json_object" }, messages }) });
      j = await r.json();
      if (r.ok && j.choices?.[0]?.message?.content) break;
      lastErr = JSON.stringify(j).slice(0, 300); j = null;
    } catch (e) { lastErr = e.message; }
  }
  if (!j) throw new Error("LLM failed: " + lastErr);
  const txt = j.choices[0].message.content.replace(/^```json|```$/g, "").trim();
  const out = JSON.parse(txt);
  out._cost = j.usage;
  return out;
}

// ---------- images ----------
async function commons(q) {
  if (!q) return null;
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({ action: "query", generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "15", prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "1600", format: "json" }).forEach(([k, v]) => u.searchParams.set(k, v));
  const j = await (await fetch(u, { headers: { "user-agent": UA } })).json();
  const key = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  for (const p of Object.values(j.query?.pages || {}).sort((a, b) => a.index - b.index)) {
    const ii = p.imageinfo?.[0], m = ii?.extmetadata || {}, lic = m.LicenseShortName?.value || "";
    if (!ii || ii.width < 900 || !/CC BY|CC0|Public domain|CC-BY/i.test(lic) || /logo|map|flag|signature|coat_of_arms|\.svg/i.test(p.title)) continue;
    if (!key.some((w) => p.title.toLowerCase().includes(w))) continue;
    const artist = strip(m.Artist?.value || "").slice(0, 60);
    return { url: ii.thumburl, credit: `ছবি: ${artist || "Wikimedia Commons"}, ${lic}, Wikimedia Commons` };
  }
  return null;
}
let browser, pg, srv;
async function renderer() {
  if (pg) return pg;
  srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    if (u === "/") { r.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return r.end(fs.readFileSync(path.join(DIR, "thumb.html"))); }
    const f = [path.join(ROOT, "public", u), path.join(DIR, "public", u)].find((x) => fs.existsSync(x)) || "";
    if (!f) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "content-type": u.endsWith(".js") ? "text/javascript" : u.endsWith(".png") ? "image/png" : "application/octet-stream" }); fs.createReadStream(f).pipe(r);
  }).listen(8792);
  const exe = env.CHROME || ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium-browser"].find((p) => fs.existsSync(p));
  browser = await puppeteer.launch({ executablePath: exe, headless: "new", args: ["--no-sandbox"] });
  pg = await browser.newPage(); await pg.goto("http://localhost:8792/", { waitUntil: "networkidle0" });
  return pg;
}
async function image(a) {
  const p = await renderer();
  const bnDate = new Date(Date.now() + 6 * 3600e3).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  let job = { title: a.title, cat: CAT_BN[a.category] || "সংবাদ", date: bnDate }, caption = "";
  if (a.image?.type !== "none" && a.image?.wikimedia_query) {
    const c = await commons(a.image.wikimedia_query).catch(() => null);
    if (c) { job = { src: c.url }; caption = c.credit; }
  }
  if (!caption && a.image?.stock_query && env.PIXABAY_API_KEY) {
    try {
      const u = `https://pixabay.com/api/?key=${env.PIXABAY_API_KEY}&q=${encodeURIComponent(a.image.stock_query)}&image_type=photo&orientation=horizontal&safesearch=true&min_width=1200&per_page=5`;
      const h = (await (await fetch(u)).json()).hits?.[0];
      if (h) { job = { src: h.largeImageURL }; caption = "প্রতীকী ছবি: Pixabay"; }
    } catch {}
  }
  const b64 = await p.evaluate((j) => window.make(j), job);
  return { b64, caption };
}

// ---------- main ----------
async function main() {
  const state = DRY && !env.INGEST_TOKEN ? { recent: [], seen: [], topics: [], today: { n: 0 } } : await api("/api/state");
  const done = state.today?.n || 0;
  const seen = new Set(state.seen), recentW = state.recent.map((r) => words(r.title));
  const items = await readFeeds();
  const clusters = cluster(items).filter((c) => !c.key.some((k) => seen.has(k)) && !recentW.some((w) => jacc(w, c.w) >= 0.45));
  log(`feeds: ${items.length} items → ${clusters.length} new events · today ${done}/${LIMIT}`);
  const picks = clusters.filter((c) => c.breakingHint).slice(0, 1);
  const room = Math.max(0, Math.min(MAX_RUN, LIMIT - done));
  for (const c of clusters) { if (picks.length >= room + (picks[0]?.breakingHint ? 1 : 0)) break; if (!picks.includes(c) && c.srcs.size >= (done < 5 ? 1 : 2)) picks.push(c); }
  if (DRY) { for (const c of clusters.slice(0, 15)) console.log(c.score.toFixed(1), [...c.srcs].join("/"), c.breakingHint ? "BREAKING?" : "", "|", c.items[0].title); return; }
  if (!env.OPENROUTER_API_KEY && !env.DEEPSEEK_API_KEY) return log("no LLM key (OPENROUTER_API_KEY / DEEPSEEK_API_KEY)");
  for (const c of picks) {
    try {
      const a = await write(c, state.topics);
      if (a.skip || !a.title || !Array.isArray(a.body) || a.body.length < 2) { log("skip:", c.items[0].title); await api("/api/seen", { method: "POST", body: JSON.stringify({ keys: c.key }) }); continue; }
      if (!CATS.includes(a.category)) a.category = "national";
      const slug = `${(a.slug_en || "news").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${Date.now().toString(36).slice(-4)}`;
      const img = await image(a);
      const topic = a.topic && a.topic.slug && a.topic.name ? { slug: a.topic.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 50), name: a.topic.name, summary: a.topic.summary || "" } : null;
      const res = await api("/api/ingest", { method: "POST", body: JSON.stringify({
        slug, title: a.title, subtitle: a.subtitle, summary: a.summary, body: a.body, category: a.category, tags: a.tags || [],
        breaking: !!a.breaking && c.srcs.size >= 2, topic, image_b64: img.b64, image_caption: img.caption,
        source_credit: `তথ্যসূত্র: ${[...c.srcs].join(", ")}`, author: "ডেস্ক রিপোর্ট",
      }) });
      await api("/api/seen", { method: "POST", body: JSON.stringify({ keys: c.key }) });
      log(`published${a.breaking ? " [BREAKING]" : ""}${topic ? ` [topic:${topic.name}]` : ""}:`, a.title, "→", res.url, `(tokens ${a._cost?.prompt_tokens}/${a._cost?.completion_tokens})`);
    } catch (e) { log("error:", c.items[0].title, e.message); }
  }
}
main().catch((e) => log("fatal:", e.stack || e.message)).finally(async () => { await browser?.close(); srv?.close(); });
