// কালারস অব বাংলাদেশ auto-newsroom. Runs every 20 min on GitHub Actions (free, works while the PC is off):
//   1. read RSS of major Bangla outlets  2. cluster the same event across outlets  3. rank (outlets, freshness, urgency,
//      and categories that are thin today)  4. an LLM writes an original, SEO-shaped Bangla report from the sources
//      (free model first, paid fallback)  5. featured image: Wikimedia Commons (free licence, credited) → Pixabay → text card
//   6. POST to /api/ingest  7. a category-styled photo card + caption goes to the Facebook page.
// Daily pacing: at least DAILY_MIN (15) and at most DAILY_LIMIT (20) auto stories per Bangladesh day, spread over the day;
// a breaking event always gets through (and opens/updates a live topic page).
// Usage: node run.mjs [--dry] [--max N] [--backfill N] [--no-fb]
//   config (env or .env): INGEST_TOKEN, SITE, OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_FREE_MODEL, DEEPSEEK_API_KEY,
//   PIXABAY_API_KEY, FB_PAGE_ID, FB_PAGE_TOKEN, DAILY_LIMIT, DAILY_MIN, CHROME
import fs from "fs"; import path from "path"; import http from "http"; import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";

const DIR = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(DIR, "..");
const envFile = path.join(DIR, ".env");
const env = Object.fromEntries((fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
for (const k of ["INGEST_TOKEN", "SITE", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "OPENROUTER_FREE_MODEL", "DAILY_LIMIT", "DAILY_MIN", "DEEPSEEK_API_KEY", "PIXABAY_API_KEY", "FB_PAGE_ID", "FB_PAGE_TOKEN", "CHROME"]) if (process.env[k]) env[k] = process.env[k];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] || d : d; };
const DRY = process.argv.includes("--dry"), NO_FB = process.argv.includes("--no-fb");
const MAX_RUN = arg("--max", 3), BACKFILL = arg("--backfill", 0);
const LIMIT = +(env.DAILY_LIMIT || 20), MIN = +(env.DAILY_MIN || 15);
const SITE_PUBLIC = "https://coloursofbangladesh.com";
const UA = "Mozilla/5.0 (compatible; ColoursOfBangladeshBot/1.0; +https://coloursofbangladesh.com)";
const log = (...a) => { const line = `[${new Date().toISOString()}] ${a.join(" ")}`; console.log(line); try { fs.appendFileSync(path.join(DIR, "log.txt"), line + "\n"); } catch {} };

const FEEDS = [
  ["প্রথম আলো", "https://www.prothomalo.com/feed/"],
  ["বিবিসি বাংলা", "https://feeds.bbci.co.uk/bengali/rss.xml"],
  ["বাংলা ট্রিবিউন", "https://www.banglatribune.com/feed/"],
  ["ঢাকা পোস্ট", "https://www.dhakapost.com/rss/rss.xml"],
  ["আজকের পত্রিকা", "https://www.ajkerpatrika.com/feed"],
  ["ইত্তেফাক", "https://www.ittefaq.com.bd/feed/"],
  ["ডয়চে ভেলে", "https://rss.dw.com/rdf/rss-ben-all"],
  ["এনটিভি", "https://www.ntvbd.com/rss.xml"],
  ["ডেইলি স্টার বাংলা", "https://bangla.thedailystar.net/rss.xml"],
  ["চ্যানেল ২৪", "https://www.channel24bd.tv/rss/rss.xml"],
  ["নয়া দিগন্ত", "https://www.dailynayadiganta.com/rss/rss.xml"],
  ["জাগো নিউজ", "https://www.jagonews24.com/rss/rss.xml"],
];
const CATS = ["national", "politics", "country", "international", "economy", "sports", "entertainment", "probash", "tech", "health", "tips", "lifestyle", "travel", "culture", "opinion"];
const CAT_BN = { national: "জাতীয়", politics: "রাজনীতি", country: "সারাদেশ", international: "আন্তর্জাতিক", economy: "অর্থনীতি", sports: "খেলা", entertainment: "বিনোদন", probash: "প্রবাস", tech: "প্রযুক্তি", health: "স্বাস্থ্য", tips: "টিপস ও ট্রিকস", lifestyle: "জীবনযাপন", travel: "ভ্রমণ", culture: "সংস্কৃতি", opinion: "মতামত" };
// how many of each we want in a full day (sums to ~20); thin categories get a ranking boost
const MIX = { national: 3, politics: 2, country: 3, international: 3, economy: 2, sports: 2, entertainment: 1, probash: 1, tech: 1, health: 1, tips: 1 };
const URGENT = /(নিহত|মৃত্যু|মারা গেছেন|বিস্ফোরণ|ভূমিকম্প|অগ্নিকাণ্ড|আগুন|দুর্ঘটনা|হামলা|গুলি|পদত্যাগ|গ্রেপ্তার|ঘোষণা|জরুরি|নিষেধাজ্ঞা|সংঘর্ষ|ঘূর্ণিঝড়|বন্যা|রায়|যুদ্ধ|নির্বাচন)/;
const STOP = new Set("এ ও না থেকে করে করা হয় হয়েছে জন্য সঙ্গে সাথে বলে বললেন একটি এক এই সেই তার তাদের আর বা কি কী যে নিয়ে দিয়ে হবে হলো হল ছিল আছে নেই পর আগে মধ্যে মাঝে কাছে উপর ওপর থেকেই হচ্ছে করেছে দিলেন দিল গেল গেছে".split(" "));

// ---------- helpers ----------
const strip = (s = "") => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
const tag = (x, t) => (x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || "";
const words = (s) => new Set(s.replace(/[^\u0980-\u09FFa-zA-Z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)));
const jacc = (a, b) => { let i = 0; for (const w of a) if (b.has(w)) i++; return i / Math.max(1, Math.min(a.size, b.size)); };
const api = async (p, opt = {}) => {
  const r = await fetch(env.SITE + p, { ...opt, headers: { authorization: `Bearer ${env.INGEST_TOKEN}`, "content-type": "application/json", ...(opt.headers || {}) } });
  if (!r.ok) throw new Error(`${p} → ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};
const get = (u, ms = 15000) => fetch(u, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(ms), redirect: "follow" });
const bdNow = () => new Date(Date.now() + 6 * 3600e3); // wall clock in Dhaka, read with getUTC*

// rough category from the outlet's URL path / headline, used only for ranking (the LLM decides the final one)
function guessCat(link, title) {
  const s = (link + " " + title).toLowerCase();
  if (/(টিপস|কৌশল|উপায়|যেভাবে|কীভাবে|সহজে|ঘরোয়া)/.test(title)) return "tips";
  const m = [["health", /health|স্বাস্থ্য|ডেঙ্গু|হাসপাতাল|চিকিৎস/], ["sports", /sport|khela|cricket|football|খেলা|ক্রিকেট|ফুটবল/], ["entertainment", /entertain|binodon|showbiz|বিনোদন|চলচ্চিত্র|অভিনেত/],
    ["international", /international|world|bishwa|বিশ্ব|আন্তর্জাতিক/], ["economy", /economy|business|banijjo|arthoniti|অর্থনীতি|বাণিজ্য|শেয়ার|টাকা/], ["politics", /politic|rajniti|রাজনীতি|বিএনপি|আওয়ামী|জামায়াত|এনসিপি/],
    ["tech", /tech|science|projukti|প্রযুক্তি|এআই|মোবাইল/], ["probash", /probash|expat|migration|প্রবাস|রেমিট্যান্স/], ["country", /country|sarades|district|saradesh|সারাদেশ|জেলা|উপজেলা/]];
  for (const [k, re] of m) if (re.test(s)) return k;
  return "national";
}

async function readFeeds() {
  const items = [], cut = Date.now() - 10 * 3600e3;
  await Promise.all(FEEDS.map(async ([src, url]) => {
    try {
      const x = await (await get(url)).text();
      for (const it of x.split(/<item[\s>]/).slice(1)) {
        const title = strip(tag(it, "title")), link = strip(tag(it, "link")) || (it.match(/<guid[^>]*>([^<]+)/) || [])[1] || (it.match(/rdf:about="([^"]+)"/) || [])[1];
        const t = Date.parse(strip(tag(it, "pubDate")) || strip(tag(it, "dc:date")));
        const text = strip(tag(it, "content:encoded") || tag(it, "description")).slice(0, 2500);
        if (/একঝলক|রাশিফল|নামাজের সময়|ছবিতে দেখুন|আজকের খেলা|টিভিতে আজ|সংবাদ সম্মেলনের লাইভ|লাইভ ব্লগ/.test(title)) continue;
        if (title && link && (!t || t > cut)) items.push({ src, title, link: link.trim(), t: t || Date.now(), text, w: words(title) });
      }
    } catch (e) { log("feed fail", src, e.message); }
  }));
  return items;
}
function cluster(items, catToday) {
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
    c.cat = guessCat(c.items[0].link, c.items[0].title);
    const want = MIX[c.cat] || 0.5, have = catToday[c.cat] || 0;
    c.score = c.srcs.size * 3 + (c.urgent ? 2 : 0) - ageH * 0.6 + (have < want ? 2.5 : -1.5 * (have - want + 1));
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
const SYSTEM = `তুমি "কালারস অব বাংলাদেশ" নামের একটি বাংলাদেশি অনলাইন সংবাদপত্রের অভিজ্ঞ সংবাদ সম্পাদক ও এসইও বিশেষজ্ঞ।
নিয়ম (কঠোরভাবে মানবে):
- শুধু দেওয়া সূত্রের তথ্য ব্যবহার করবে। নতুন তথ্য, সংখ্যা, উদ্ধৃতি, নাম বানাবে না। অনিশ্চিত হলে বাদ দেবে।
- সূত্রের বাক্য হুবহু কপি করবে না; নিজের ভাষায়, প্রমিত বাংলায়, সংবাদ-রীতিতে লিখবে (প্রথম অনুচ্ছেদে কে-কী-কোথায়-কখন)।
- এসইও: মানুষ যে শব্দে গুগলে খোঁজে (ব্যক্তি/স্থান/ঘটনার নাম) সেটি শিরোনামের শুরুর দিকে ও প্রথম অনুচ্ছেদে রাখবে; ক্লিকবেইট নয়, স্পষ্ট শিরোনাম।
- অভিযুক্তকে দোষী বলবে না ("অভিযুক্ত", "পুলিশ জানায়" ইত্যাদি)। শিশু, ধর্ষণ বা যৌন নিপীড়নের শিকার ব্যক্তির নাম ও পরিচয় প্রকাশ করবে না।
- স্বাস্থ্য বা টিপস বিষয়ে কেবল সূত্রে থাকা পরামর্শ লিখবে; চিকিৎসার সিদ্ধান্তে চিকিৎসকের পরামর্শ নিতে বলবে।
- মতামত, প্রচারণা বা আবেগপ্রবণ শব্দ নয়; নিরপেক্ষ থাকবে।
- সূত্র যথেষ্ট না হলে বা বিজ্ঞাপন/প্রেস রিলিজ/রাশিফল/বিনোদন-গসিপ হলে skip=true দেবে।
শুধু JSON ফেরত দেবে।`;
async function llm(messages, { json = true, maxTokens = 2500 } = {}) {
  const providers = [
    env.OPENROUTER_API_KEY && ["openrouter-free", "https://openrouter.ai/api/v1/chat/completions", env.OPENROUTER_API_KEY, env.OPENROUTER_FREE_MODEL || "google/gemma-4-31b-it:free"],
    env.OPENROUTER_API_KEY && ["openrouter", "https://openrouter.ai/api/v1/chat/completions", env.OPENROUTER_API_KEY, env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash"],
    env.DEEPSEEK_API_KEY && ["deepseek", "https://api.deepseek.com/chat/completions", env.DEEPSEEK_API_KEY, "deepseek-chat"],
  ].filter(Boolean);
  let lastErr = "no LLM key";
  for (const [name, url, key, model] of providers) {
    try {
      const r = await fetch(url, { method: "POST", signal: AbortSignal.timeout(180000),
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "HTTP-Referer": SITE_PUBLIC, "X-Title": "Colours of Bangladesh" },
        body: JSON.stringify({ model, temperature: 0.3, max_tokens: maxTokens, ...(json ? { response_format: { type: "json_object" } } : {}), messages }) });
      const j = await r.json();
      const txt = j.choices?.[0]?.message?.content;
      if (!r.ok || !txt) { lastErr = `${name}: ${JSON.stringify(j).slice(0, 200)}`; continue; }
      if (!json) return { out: txt, usage: j.usage, via: name };
      const m = txt.replace(/^[\s\S]*?```(?:json)?/, "").replace(/```[\s\S]*$/, "").trim() || txt;
      const s = m.slice(m.indexOf("{"), m.lastIndexOf("}") + 1);
      return { out: JSON.parse(s), usage: j.usage, via: name };
    } catch (e) { lastErr = `${name}: ${e.message}`; }
  }
  throw new Error("LLM failed: " + lastErr);
}
async function write(c, topics) {
  const docs = [];
  for (const it of c.items.slice(0, 3)) docs.push(`### সূত্র: ${it.src}\nশিরোনাম: ${it.title}\n${(await fullText(it.link)) || it.text}`);
  const user = `নিচের সূত্রগুলো একই ঘটনার। একটি মৌলিক, এসইও-বান্ধব সংবাদ প্রতিবেদন লেখো।
চলমান টপিকের তালিকা (প্রাসঙ্গিক হলে এই slug-ই ব্যবহার করো): ${JSON.stringify(topics.map((t) => ({ slug: t.slug, name: t.name })))}
JSON ফরম্যাট:
{"skip":false,"title":"৮–১৪ শব্দের শিরোনাম, মূল কিওয়ার্ড শুরুতে","subtitle":"২–৪ শব্দের কিকার","summary":"১৫০ অক্ষরের মধ্যে সারাংশ (মেটা ডেসক্রিপশন)","points":["৩–৪টি এক লাইনের মূল তথ্য"],"body":["৫–৮টি অনুচ্ছেদ, প্রতিটি ২–৪ বাক্য"],
"category":"${CATS.join("|")}","tags":["৪–৬টি বাংলা ট্যাগ: ব্যক্তি, স্থান, প্রতিষ্ঠান, বিষয়"],"slug_en":"short-english-keyword-slug",
"breaking":false,"topic":{"slug":"বিদ্যমান টপিকের slug অথবা নতুন হলে english-slug; প্রযোজ্য না হলে পুরো topic=null","name":"টপিকের বাংলা নাম","summary":"টপিকের এক লাইনের বর্ণনা","points":["টপিক নিয়ে এখন পর্যন্ত জানা ৩–৫টি মূল তথ্য, সর্বশেষ তথ্যসহ"]},
"fb_caption":"ফেসবুকের জন্য ২–৩ লাইনের আকর্ষণীয় কিন্তু সত্যনিষ্ঠ ক্যাপশন (ইমোজি ১–২টি, ক্লিকবেইট নয়)","hashtags":["৩–৪টি বাংলা/ইংরেজি হ্যাশট্যাগ, # ছাড়া"],
"image":{"wikimedia_query":"মূল ব্যক্তি/স্থানের ইংরেজি নাম (শুধু সুপরিচিত জনব্যক্তিত্ব, দল, শহর বা স্থাপনা হলে; নইলে খালি)","type":"person|place|none","stock_query":"প্রতীকী স্টক ছবির জন্য ২–৩ শব্দের ইংরেজি দৃশ্য (যেমন \\"rice sacks warehouse\\", \\"football stadium\\"); হত্যা/ধর্ষণ/শিশু নির্যাতন/আত্মহত্যার খবরে খালি"}}
category: স্বাস্থ্যবিষয়ক খবর হলে health; ব্যবহারিক পরামর্শ/কৌশল/কীভাবে-করবেন ধরনের লেখা হলে tips; প্রবাসী বাংলাদেশিদের খবর হলে probash।
breaking=true কেবল বড়, জরুরি, সদ্য-ঘটা ঘটনায় (বড় দুর্ঘটনা/প্রাণহানি, সরকার বা বড় প্রতিষ্ঠানের গুরুত্বপূর্ণ ঘোষণা, দুর্যোগ)।${c.breakingHint ? " (একাধিক সংবাদমাধ্যম এই মাত্র খবরটি দিয়েছে।)" : ""}
টপিক কেবল বড় চলমান ঘটনায় (যুদ্ধ, নির্বাচন, বড় মামলা, টুর্নামেন্ট, দুর্যোগ, বড় আন্দোলন); ব্রেকিং খবর হলে টপিক অবশ্যই দেবে; সাধারণ খবরে topic=null।

${docs.join("\n\n")}`;
  const r = await llm([{ role: "system", content: SYSTEM }, { role: "user", content: user }]);
  r.out._cost = r.usage; r.out._via = r.via;
  return r.out;
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
async function pixabay(q) {
  if (!q || !env.PIXABAY_API_KEY) return null;
  try {
    const u = `https://pixabay.com/api/?key=${env.PIXABAY_API_KEY}&q=${encodeURIComponent(q)}&image_type=photo&orientation=horizontal&safesearch=true&min_width=1200&per_page=5`;
    const h = (await (await fetch(u)).json()).hits?.[0];
    return h ? { url: h.largeImageURL, credit: "প্রতীকী ছবি: Pixabay" } : null;
  } catch { return null; }
}
let browser, pg, srv;
async function renderer() {
  if (pg) return pg;
  srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    const page = { "/": "thumb.html", "/card": "card.html" }[u];
    if (page) { r.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return r.end(fs.readFileSync(path.join(DIR, page))); }
    const f = [path.join(ROOT, "public", u), path.join(DIR, "public", u)].find((x) => fs.existsSync(x)) || "";
    if (!f) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "content-type": u.endsWith(".js") ? "text/javascript" : u.endsWith(".png") ? "image/png" : u.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream" }); fs.createReadStream(f).pipe(r);
  }).listen(8792);
  const exe = env.CHROME || ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium-browser"].find((p) => fs.existsSync(p));
  browser = await puppeteer.launch({ executablePath: exe, headless: "new", args: ["--no-sandbox"] });
  pg = await browser.newPage(); await pg.goto("http://localhost:8792/", { waitUntil: "networkidle0" });
  return pg;
}
const bnDateStr = () => bdNow().toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
// featured image for the site (16:9, watermarked) → { b64, caption, photo }
async function image(a) {
  const p = await renderer();
  let found = null;
  if (a.image?.type !== "none" && a.image?.wikimedia_query) found = await commons(a.image.wikimedia_query).catch(() => null);
  if (!found && a.image?.stock_query) found = await pixabay(a.image.stock_query);
  const job = found ? { src: found.url } : { title: a.title, cat: CAT_BN[a.category] || "সংবাদ", date: bnDateStr() };
  const b64 = await p.evaluate((j) => window.make(j), job);
  return { b64, caption: found?.credit || "", photo: found?.url || "" };
}
// Facebook photo card (1080×1350, category-styled) → PNG buffer
async function card(a, photo) {
  await renderer();
  const cp = await browser.newPage();
  await cp.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
  await cp.goto("http://localhost:8792/card", { waitUntil: "networkidle0" });
  await cp.evaluate((j) => window.fill(j), { title: a.title, summary: a.summary || "", cat: a.category, catBn: CAT_BN[a.category] || "সংবাদ", photo, date: bnDateStr(), breaking: !!a.breaking, credit: photo ? (a._credit || "") : "" });
  await cp.waitForFunction("window.ready === true", { timeout: 20000 });
  const buf = await cp.screenshot({ type: "jpeg", quality: 90 });
  await cp.close();
  return buf;
}
async function postFacebook(a, url, buf) {
  if (NO_FB || !env.FB_PAGE_ID || !env.FB_PAGE_TOKEN) return null;
  const tags = (a.hashtags || []).slice(0, 4).map((h) => "#" + String(h).replace(/^#/, "").replace(/\s+/g, "")).join(" ");
  const msg = `${a.breaking ? "🔴 ব্রেকিং | " : ""}${a.title}\n\n${a.fb_caption || a.summary || ""}\n\n📰 বিস্তারিত পড়ুন: ${url}\n\n${tags} #কালারসঅববাংলাদেশ #ColoursOfBangladesh`;
  const fd = new FormData();
  fd.append("source", new Blob([buf], { type: "image/jpeg" }), "card.jpg");
  fd.append("caption", msg); fd.append("access_token", env.FB_PAGE_TOKEN);
  const r = await fetch(`https://graph.facebook.com/v21.0/${env.FB_PAGE_ID}/photos`, { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error("facebook: " + JSON.stringify(j.error || j).slice(0, 200));
  return j.post_id || j.id;
}

// ---------- pacing ----------
// how many to publish in this run so the day ends between MIN and LIMIT, spread out (runs every 20 min)
function quota(done) {
  const now = bdNow(), h = now.getUTCHours() + now.getUTCMinutes() / 60;
  const runsLeft = Math.max(1, Math.round((24 - h) * 3));
  const target = Math.min(LIMIT, Math.max(MIN, done)); // aim for MIN, allow up to LIMIT when news is heavy
  const due = Math.ceil(LIMIT * Math.min(1, (h - 6) / 17)); // by this hour of the day we should be near this count
  let n = h < 6 ? 0 : Math.max(0, Math.min(MAX_RUN, due - done)); // 00–06: breaking only
  if (target - done >= runsLeft) n = Math.max(n, Math.min(MAX_RUN, Math.ceil((target - done) / runsLeft))); // catching up late in the day
  return { n: Math.min(n, LIMIT - done), lagging: MIN - done > runsLeft * 0.8 };
}

// ---------- backfill: give old text-card stories a real photo ----------
async function backfill(n) {
  const list = await api(`/api/text-thumbs?n=${n}`);
  log(`backfill: ${list.length} stories without a photo`);
  for (const a of list) {
    try {
      const q = (await llm([{ role: "system", content: "তুমি ছবি সম্পাদক। শুধু JSON দাও।" }, { role: "user", content: `এই খবরের জন্য ছবির খোঁজ শব্দ দাও।\nশিরোনাম: ${a.title}\nসারাংশ: ${a.summary}\nট্যাগ: ${a.tags}\nJSON: {"wikimedia_query":"সুপরিচিত ব্যক্তি/স্থান/প্রতিষ্ঠানের ইংরেজি নাম, নইলে খালি","stock_query":"২–৩ শব্দের ইংরেজি প্রতীকী দৃশ্য; হত্যা/ধর্ষণ/শিশু নির্যাতন/আত্মহত্যার খবরে খালি"}` }], { maxTokens: 200 })).out;
      const found = (await commons(q.wikimedia_query).catch(() => null)) || (await pixabay(q.stock_query));
      if (!found) { log("  no photo:", a.title); continue; }
      const p = await renderer();
      const b64 = await p.evaluate((j) => window.make(j), { src: found.url });
      await api("/api/article-image", { method: "POST", body: JSON.stringify({ slug: a.slug, image_b64: b64, image_caption: found.credit }) });
      log("  photo set:", a.title, "←", found.credit);
    } catch (e) { log("  backfill error:", a.title, e.message); }
  }
}

// ---------- main ----------
async function main() {
  if (BACKFILL) return backfill(BACKFILL);
  const state = DRY && !env.INGEST_TOKEN ? { recent: [], seen: [], topics: [], today: { n: 0 }, cats: {} } : await api("/api/state");
  const done = state.today?.n || 0, catToday = state.cats || {};
  const seen = new Set(state.seen), recentW = state.recent.map((r) => words(r.title));
  const items = await readFeeds();
  const clusters = cluster(items, catToday).filter((c) => !c.key.some((k) => seen.has(k)) && !recentW.some((w) => jacc(w, c.w) >= 0.45));
  const q = quota(done);
  log(`feeds: ${items.length} items → ${clusters.length} new events · today ${done}/${MIN}–${LIMIT} · this run ${q.n}${q.lagging ? " (catching up)" : ""}`);
  const picks = clusters.filter((c) => c.breakingHint).slice(0, 1); // breaking always goes, even past the daily cap
  for (const c of clusters) {
    if (picks.filter((x) => !x.breakingHint).length >= q.n) break;
    if (!picks.includes(c) && c.srcs.size >= (q.lagging || done < 6 ? 1 : 2)) picks.push(c);
  }
  if (DRY) { for (const c of clusters.slice(0, 20)) console.log(c.score.toFixed(1), c.cat.padEnd(13), [...c.srcs].join("/"), c.breakingHint ? "BREAKING?" : "", "|", c.items[0].title); return; }
  if (!env.OPENROUTER_API_KEY && !env.DEEPSEEK_API_KEY) return log("no LLM key (OPENROUTER_API_KEY / DEEPSEEK_API_KEY)");
  for (const c of picks) {
    try {
      const a = await write(c, state.topics);
      if (a.skip || !a.title || !Array.isArray(a.body) || a.body.length < 2) { log("skip:", c.items[0].title); await api("/api/seen", { method: "POST", body: JSON.stringify({ keys: c.key }) }); continue; }
      if (!CATS.includes(a.category)) a.category = c.cat;
      a.breaking = !!a.breaking && c.srcs.size >= 2;
      const slug = `${(a.slug_en || "news").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${Date.now().toString(36).slice(-4)}`;
      const img = await image(a);
      a._credit = img.caption;
      const topic = a.topic && a.topic.slug && a.topic.name ? { slug: a.topic.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 50), name: a.topic.name, summary: a.topic.summary || "", points: Array.isArray(a.topic.points) ? a.topic.points : [] } : null;
      const res = await api("/api/ingest", { method: "POST", body: JSON.stringify({
        slug, title: a.title, subtitle: a.subtitle, summary: a.summary, points: a.points || [], body: a.body, category: a.category, tags: a.tags || [],
        breaking: a.breaking, topic, image_b64: img.b64, image_caption: img.caption,
        source_credit: `তথ্যসূত্র: ${[...c.srcs].join(", ")}`, author: "ডেস্ক রিপোর্ট",
      }) });
      await api("/api/seen", { method: "POST", body: JSON.stringify({ keys: c.key }) });
      const url = `${SITE_PUBLIC}/news/${slug}`;
      log(`published${a.breaking ? " [BREAKING]" : ""}${topic ? ` [topic:${topic.name}]` : ""} [${a.category}] via ${a._via}:`, a.title, "→", url);
      try { const id = await postFacebook(a, url, await card(a, img.photo)); if (id) log("  facebook:", id); } catch (e) { log("  facebook error:", e.message); }
    } catch (e) { log("error:", c.items[0].title, e.message); }
  }
}
main().catch((e) => { log("fatal:", e.stack || e.message); process.exitCode = 1; }).finally(async () => { await browser?.close(); srv?.close(); });
