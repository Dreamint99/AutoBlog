import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.SEO_VERIFY_BASE || "https://ninetymins.com";
const paths = process.argv.slice(2);
if (!paths.length) throw new Error("Supply paths: pre-match, result, team, league, embed");
const checks = [];
for (const path of paths) {
  const r = await fetch(base + path, { signal: AbortSignal.timeout(30000) });
  const html = await r.text();
  assert.equal(r.status, 200, `${path}: HTTP status`);
  assert(!html.includes("data-dgst="), `${path}: streamed server error`);
  const robots = [...html.matchAll(/<meta\b[^>]*>/g)].find(m => /name="robots"/.test(m[0]))?.[0] || "";
  assert(/follow/.test(robots), `${path}: follow directive`);
  assert((path.startsWith("/embed/") || path.startsWith("/data/embed/")) ? /noindex/.test(robots) : /content="index[, ]/.test(robots), `${path}: index policy`);
  const nodes = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m => {
    const j = JSON.parse(m[1]); return Array.isArray(j) ? j : j["@graph"] || [j];
  });
  const types = nodes.map(n => n["@type"]);
  if (path.startsWith("/match/")) {
    const e = nodes.find(n => n["@type"] === "SportsEvent"); assert(e, "SportsEvent");
    for (const k of ["name", "homeTeam", "awayTeam", "startDate", "eventStatus", "url"]) assert(e[k], `SportsEvent.${k}`);
    assert(Number.isFinite(Date.parse(e.startDate)), "valid event date");
    assert(e.location?.name, "real venue required for Google event eligibility");
    assert(!/TBC|TBD/.test(e.location.name));
    assert(types.includes("BreadcrumbList"));
    assert.equal(e.url, r.url);
  }
  if (/^\/data\/(population|gdp-per-capita|gdp-growth|ranking)\//.test(path)) { assert(types.includes("Dataset")); assert(html.includes("<table") && html.includes("<svg")); }
  if (path.startsWith("/team/")) assert(types.includes("SportsTeam") || types.includes("Person"));
  if (path.startsWith("/league/")) assert(types.includes("ItemList"));
  assert(!types.includes("BroadcastEvent"), "No broadcast markup without an official embedded stream");
  checks.push({ url: r.url, status: r.status, robots, types, bytes: Buffer.byteLength(html) });
}
const index = await fetch(base + "/sitemap.xml"); assert.equal(index.status, 200);
const indexXml = await index.text(); assert(indexXml.includes("<sitemapindex"));
const sitemaps = [...indexXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
for (const u of sitemaps) { const r = await fetch(u); assert.equal(r.status, 200, u); const xml = await r.text(); assert(xml.includes("<urlset"), u); }
const robots = await (await fetch(base + "/robots.txt")).text(); assert(robots.includes(base + "/sitemap.xml"));
await mkdir("work", { recursive: true });
await writeFile("work/seo-verification.json", JSON.stringify({ at: new Date().toISOString(), checks, sitemaps }, null, 2));
console.log(JSON.stringify({ checks, sitemaps }, null, 2));
