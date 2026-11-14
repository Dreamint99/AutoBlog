import { digest } from "./data.mjs";
async function save(env, site, month, title, body) {
  const hash = await digest(body), now = new Date().toISOString();
  const path = site === "countly" ? `/data/stories/${month}` : `/stories/${month}`;
  const host = site === "countly" ? "countly.net" : "ninetymins.com";
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO seo_pages(site_id,kind,slug,title,body,hash,created_at,lastmod) VALUES(?,'stories',?,?,?,?,?,?) ON CONFLICT(site_id,kind,slug) DO UPDATE SET title=excluded.title,body=excluded.body,hash=excluded.hash,lastmod=excluded.lastmod WHERE seo_pages.hash!=excluded.hash`).bind(site, month, title, JSON.stringify(body), hash, now, now),
    env.DB.prepare(`INSERT INTO seo_engine_outbox(site_id,url,version,next_try) VALUES(?,?,?,?) ON CONFLICT(site_id,url) DO UPDATE SET version=excluded.version,next_try=excluded.next_try,attempts=0,delivered_at=NULL WHERE seo_engine_outbox.version!=excluded.version`).bind(site, `https://${host}${path}`, hash, now),
  ]);
  await env.SEO_LOG.put(`engine:press:${site}:${month}`, JSON.stringify({ title, url: `https://${host}${path}`, summary: body.analysis, methodology: body.methodology, source: body.source, at: now, pitching: "Human approval required for each email; no pitches are sent." }));
}
export const newMonthlyData = (previous, month, fingerprint) => !previous || previous.slug === month || previous.fingerprint !== fingerprint;
export async function stories(env) {
  const month = new Date().toISOString().slice(0, 7), label = new Date().toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const growth = await env.DB.prepare("SELECT body FROM seo_pages WHERE site_id='countly' AND kind='ranking' AND slug='gdp-growth'").first();
  if (growth) {
    const d = JSON.parse(growth.body), values = d.rows.map(r => r.value).sort((a, b) => a - b), n = values.length;
    if (n >= 50) {
      const median = n % 2 ? values[(n - 1) / 2] : (values[n / 2 - 1] + values[n / 2]) / 2;
      const top = d.rows.slice(0, 10), avg = top.reduce((a, r) => a + r.value, 0) / top.length;
      const analysis = `In the ${label} data review, the ten fastest-growing economies in the available ${d.year} World Bank cohort averaged ${avg.toFixed(2)}% real GDP growth, compared with a median of ${median.toFixed(2)}% across ${n} economies: a gap of ${(avg - median).toFixed(2)} percentage points. ${values.filter(v => v < 0).length} economies recorded a contraction. These are annual ${d.year} observations, not growth during ${label}.`;
      const sourceFingerprint = await digest({ year: d.year, rows: d.rows.map(r => ({ code: r.countryCode, value: r.value })) });
      const old = await env.DB.prepare("SELECT slug,body FROM seo_pages WHERE site_id='countly' AND kind='stories' ORDER BY slug DESC LIMIT 1").first();
      const previous = old ? { slug: old.slug, fingerprint: JSON.parse(old.body).sourceFingerprint } : null;
      if (newMonthlyData(previous, month, sourceFingerprint)) await save(env, "countly", month, `Growth gap: top ten vs median — ${label} data review`, { ...d, rows: top, coverage: n, analysis, sourceFingerprint, methodology: d.methodology + " Countly calculated the unweighted country median, top-ten arithmetic mean and gap in percentage points; these are not global GDP growth estimates." });
      else await env.SEO_LOG.put("engine:stories:countly", JSON.stringify({ status: "unchanged_source", month, reason: "No new annual observations or revisions; avoid an otherwise duplicate monthly page." }));
    }
  }
  const scores = (await env.DB.prepare(`SELECT league, json_extract(ev_json,'$.leagueName') AS label, COUNT(*) AS matches,
    SUM(CAST(json_extract(ev_json,'$.home.score') AS INTEGER)+CAST(json_extract(ev_json,'$.away.score') AS INTEGER)) AS goals
    FROM seo_matches WHERE state='post' AND json_extract(ev_json,'$.sport')='football' AND starts>=? AND starts<?
    AND json_extract(ev_json,'$.home.score')!='' AND json_extract(ev_json,'$.away.score')!=''
    AND json_extract(ev_json,'$.home.score') NOT GLOB '*[^0-9]*' AND json_extract(ev_json,'$.away.score') NOT GLOB '*[^0-9]*'
    GROUP BY league HAVING COUNT(*)>=3 ORDER BY CAST(goals AS REAL)/matches DESC`).bind(month + "-01", month + "-32").all()).results;
  if (scores.reduce((n, r) => n + r.matches, 0) >= 10) {
    const n = scores.reduce((n, r) => n + r.matches, 0), goals = scores.reduce((n, r) => n + r.goals, 0);
    const analysis = `${n} completed football matches recorded in the NinetyMins catalogue for ${label} contain ${goals} goals, averaging ${(goals / n).toFixed(2)} per match. This is a partial catalogue sample, not complete league coverage; competitions with fewer than three recorded results are excluded.`;
    await save(env, "ninetymins", month, `Goals per recorded match — ${label}`, { analysis, month, rows: scores.map(r => ({ label: r.label, value: r.goals / r.matches, matches: r.matches, goals: r.goals, league: r.league })), source: "https://www.espn.com/", methodology: "NinetyMins calculation from persisted ESPN completed-match scores. Extra-time totals are included as reported; shootout tallies are excluded. Partial sample from catalogue coverage; not a comparison of entire seasons." });
  } else await env.SEO_LOG.put("engine:stories:sports", JSON.stringify({ status: "insufficient_sample", required: 10, recorded: scores.reduce((n, r) => n + r.matches, 0) }));
}
