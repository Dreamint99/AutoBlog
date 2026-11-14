import { monitor } from "./monitor.mjs";
import { stories } from "./stories.mjs";
import { distribute } from "./social.mjs";
import { mentions } from "./mentions.mjs";
import { refreshVisa } from "./visa.mjs";
import baseline from "./search-baseline.json";
import { METRICS, buildPages, digest } from "./data.mjs";
const KEY = "7cb730425493bd6250188aee25110d83";
async function json(url) { let r; try { r = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { accept: "application/json", "user-agent": "CountlyData/1.0 (+https://countly.net/contact)" } }); } catch (e) { throw new Error(`Source request failed: ${url}: ${e}`); } if (!r.ok) throw new Error(`${url}: ${r.status}`); const j = await r.json(); if (!Array.isArray(j) || j.length < 2 || j[0].pages !== 1) throw new Error("Incomplete World Bank response; retaining last good dataset"); return j; }
async function error(env, job, e) { console.error(job, String(e)); await env.SEO_LOG.put(`engine:error:${new Date().toISOString()}:${crypto.randomUUID()}`, JSON.stringify({ job, at: new Date().toISOString(), error: String(e) }), { expirationTtl: 30 * 86400 }); }

export async function refresh(env) {
  const countries = await json("https://api.worldbank.org/v2/country?format=json&per_page=400");
  const series = {};
  for (const [metric, def] of Object.entries(METRICS)) series[metric] = await json(`https://api.worldbank.org/v2/country/all/indicator/${def.indicator}?format=json&per_page=20000&mrnev=6`);
  const pages = buildPages(countries[1], series);
  if (pages.length < 300) throw new Error("Unexpected coverage collapse: refusing to replace existing data");
  const existing = new Map((await env.DB.prepare("SELECT kind,slug,hash FROM seo_pages WHERE site_id='countly'").all()).results.map(p => [`${p.kind}:${p.slug}`, p.hash]));
  const now = new Date().toISOString(); let changed = 0;
  const jobs = [];
  for (const p of pages) {
    const hash = await digest(p.body); if (existing.get(`${p.kind}:${p.slug}`) === hash) continue;
    changed++;
    jobs.push(env.DB.prepare(`INSERT INTO seo_pages(site_id,kind,slug,title,body,hash,created_at,lastmod) VALUES('countly',?,?,?,?,?,?,?) ON CONFLICT(site_id,kind,slug) DO UPDATE SET title=excluded.title,body=excluded.body,hash=excluded.hash,lastmod=excluded.lastmod`).bind(p.kind, p.slug, p.title, JSON.stringify(p.body), hash, now, now));
    jobs.push(env.DB.prepare(`INSERT INTO seo_engine_outbox(site_id,url,version,next_try) VALUES('countly',?,?,?) ON CONFLICT(site_id,url) DO UPDATE SET version=excluded.version,next_try=excluded.next_try,attempts=0,delivered_at=NULL`).bind(`https://countly.net/data/${p.kind}/${p.slug}`, hash, now));
  }
  for (let i = 0; i < jobs.length; i += 80) await env.DB.batch(jobs.slice(i, i + 80));
  await env.SEO_LOG.put("engine:refresh", JSON.stringify({ at: now, pages: pages.length, changed, paidApiUsd: 0, monthlyPaidApiCapUsd: Number(env.MONTHLY_PAID_API_CAP_USD || 0) }));
  return { pages: pages.length, changed };
}

async function notifySite(env, site) {
  if (env.PUBLISH_ENABLED !== "true") return;
  const next = await env.SEO_LOG.get(`engine:indexnow:${site}:next`); if (next && Date.parse(next) > Date.now()) return;
  const rows = (await env.DB.prepare("SELECT url,version,attempts FROM seo_engine_outbox WHERE site_id=? AND delivered_at IS NULL AND next_try<=? ORDER BY next_try LIMIT 100").bind(site, new Date().toISOString()).all()).results;
  if (!rows.length) return;
  const r = await fetch("https://www.bing.com/indexnow", { method: "POST", signal: AbortSignal.timeout(15000), headers: { "content-type": "application/json" }, body: JSON.stringify({ host: site === "countly" ? "countly.net" : "ninetymins.com", key: KEY, keyLocation: `https://${site === "countly" ? "countly.net" : "ninetymins.com"}/${KEY}.txt`, urlList: rows.map(p => p.url) }) });
  const ok = [200, 202].includes(r.status), now = new Date().toISOString();
  const retry = r.status === 429 ? Math.max(3600000, Number(r.headers.get("retry-after") || 0) * 1000) : ok ? 3600000 : 600000;
  await env.SEO_LOG.put(`engine:indexnow:${site}:next`, new Date(Date.now() + retry).toISOString());
  await env.DB.batch(rows.map(p => env.DB.prepare("UPDATE seo_engine_outbox SET attempts=attempts+1,delivered_at=?,next_try=? WHERE site_id=? AND url=? AND version=?").bind(ok ? now : null, new Date(Date.now() + retry).toISOString(), site, p.url, p.version)));
  await env.SEO_LOG.put(`engine:indexnow:${site}:last`, JSON.stringify({ at: now, count: rows.length, status: r.status }));
  if (!ok) throw new Error(`IndexNow ${r.status}`);
}

async function report(env) {
  const budget = await env.DB.prepare("SELECT reserved_usd FROM seo_budget WHERE month=?").bind(new Date().toISOString().slice(0, 7)).first();
  const counts = (await env.DB.prepare("SELECT site_id,kind,COUNT(*) AS pages,SUM(created_at>=?) AS created_last7days,MAX(lastmod) AS last_change FROM seo_pages GROUP BY site_id,kind").bind(new Date(Date.now() - 7 * 86400000).toISOString()).all()).results;
  const visaCounts = (await env.DB.prepare("SELECT COUNT(DISTINCT passport) as passports, COUNT(*) as pairs FROM visa_matrix").first()) || {};
  const value = { at: new Date().toISOString(), counts, visa: { ...visaCounts, refresh: await env.SEO_LOG.get("engine:visa", "json") }, refresh: await env.SEO_LOG.get("engine:refresh", "json"), indexnow: { countly: await env.SEO_LOG.get("engine:indexnow:countly:last", "json"), ninetymins: await env.SEO_LOG.get("engine:indexnow:ninetymins:last", "json") }, baseline, liveSearch: await env.SEO_LOG.get("engine:search", "json"), social: await env.SEO_LOG.get("engine:social", "json"), mentions: await env.SEO_LOG.get("engine:mentions", "json"), sportsStory: await env.SEO_LOG.get("engine:stories:sports", "json"), countlyStory: await env.SEO_LOG.get("engine:stories:countly", "json"), paidApiReservedUsd: Number(budget?.reserved_usd || 0), costMethod: "Conservative maximum reservation before each X call; not an invoice total", paidApiUsd: Number(budget?.reserved_usd || 0), monthlyPaidApiCapUsd: Number(env.MONTHLY_PAID_API_CAP_USD || 0), indexedShare: null, indexedShareReason: "Requires actual URL Inspection coverage, not inferred from search performance" };
  await env.SEO_LOG.put("engine:report", JSON.stringify(value));
  if (new Date().getUTCDay() === 1) await env.SEO_LOG.put(`engine:weekly:${new Date().toISOString().slice(0, 10)}`, JSON.stringify(value), { expirationTtl: 365 * 86400 });
  return value;
}

async function authorized(req, env) {
  const key = req.headers.get("x-admin-key"); if (!key) return false;
  if (env.BOOTSTRAP_KEY && key === env.BOOTSTRAP_KEY) return true;
  // Reuse the existing owner's password without copying or resetting it.
  const r = await fetch("https://api.ninetymins.com/admin/seo", { headers: { "x-admin-key": key }, signal: AbortSignal.timeout(10000) }); return r.ok;
}
export default {
  async fetch(req, env) {
    const path = new URL(req.url).pathname;
    if (path === "/health") return Response.json({ ok: true });
    if (!await authorized(req, env)) return new Response("Unauthorized", { status: 401, headers: { "cache-control": "no-store" } });
    if (path === "/run" && req.method === "POST") { try { const result = await refresh(env); await stories(env); await report(env); return Response.json(result); } catch (e) { await error(env, "refresh", e); return Response.json({ error: String(e) }, { status: 502 }); } }
    if (path === "/visa" && req.method === "POST") { try { const result = await refreshVisa(env); await report(env); return Response.json(result); } catch (e) { await error(env, "visa", e); return Response.json({ error: String(e) }, { status: 502 }); } }
    if (path === "/operations" && req.method === "POST") { await stories(env); await monitor(env).catch(e => error(env, "monitor", e)); await mentions(env).catch(e => error(env, "mentions", e)); await distribute(env).catch(e => error(env, "social", e)); return Response.json(await report(env)); }
    if (path.startsWith("/press/")) { const key = path.slice(7).replaceAll("/", ":"); const body = await env.SEO_LOG.get(`engine:press:${key}`); return new Response(body || "Not found", { status: body ? 200 : 404, headers: { "content-type": "application/json", "cache-control": "no-store" } }); }
    if (path === "/report") {
      const keys = await env.SEO_LOG.list({ prefix: "engine:error:", limit: 30 });
      return Response.json({ report: await report(env), errors: await Promise.all(keys.keys.map(k => env.SEO_LOG.get(k.name, "json"))) }, { headers: { "cache-control": "no-store" } });
    }
    return new Response("Not found", { status: 404 });
  },
  async scheduled(event, env) {
    if (event.cron === "41 4 * * 1") { await monitor(env).catch(e => error(env, "monitor", e)); await mentions(env).catch(e => error(env, "mentions", e)); await refreshVisa(env).catch(e => error(env, "visa", e)); }
    if (event.cron === "17 3 * * *") { await refresh(env).catch(e => error(env, "refresh", e)); await stories(env).catch(e => error(env, "stories", e)); }
    if (event.cron === "23 * * * *") {
      for (const site of ["countly", "ninetymins"]) await notifySite(env, site).catch(e => error(env, `indexnow:${site}`, e));
      await distribute(env).catch(e => error(env, "social", e));
    }
    await report(env).catch(e => error(env, "report", e));
  },
};
