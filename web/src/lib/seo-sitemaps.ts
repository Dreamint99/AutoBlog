import { indexableLoc, indexableEntries } from "./indexable-url";
import { races } from "@/sites/ninetymins/F1Hub";
import { activeSite } from "./site-context";
import { getArticles, d1 } from "./data";
import { fixtures, hubs, prunedSlugs, sitemapPlayers } from "@/sites/ninetymins/engine";
import { NM_COMPS } from "@/sites/ninetymins/comps";
import { getCricket } from "@/sites/ninetymins/cricket";
import { sitemapHighlights, hlPath, cleanTitle, HL_SPORTS } from "@/sites/ninetymins/highlights";
import { allPairs } from "@/sites/ninetymins/h2h";
import { EVENT_PATHS } from "@/sites/ninetymins/events/catalog";
import { sitemapEventPages } from "@/sites/ninetymins/events/directory";
import { eventLastmod, eventFeedPaths } from "@/sites/ninetymins/events/feed";
import legacySitemap from "./legacy-sitemap";
import { dataIndex, comparisonLinks } from "@/sites/countly/data-engine";
const BASE = "https://ninetymins.com";
export const xmlEscape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const xml = (body: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=60" } });
const urls = (items: { url: string; lastmod?: string }[]) => {
  const clean = indexableEntries(items);
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${clean.map(i => `<url><loc>${xmlEscape(i.url)}</loc>${i.lastmod ? `<lastmod>${xmlEscape(i.lastmod)}</lastmod>` : ""}</url>`).join("")}</urlset>`);
};

export async function sitemapResponse(name: string): Promise<Response> {
  if (activeSite().id === "countly") return countlySitemap(name);
  if (activeSite().id !== "ninetymins") {
    if (name !== "sitemap.xml") return new Response("Not found", { status: 404 });
    return urls((await legacySitemap()).map(i => ({ url: i.url, lastmod: i.lastModified instanceof Date ? i.lastModified.toISOString() : i.lastModified })));
  }
  if (name === "sitemap.xml") {
    const maps = ["sitemap-hubs.xml", "sitemap-articles.xml", "sitemap-news.xml", "sitemap-videos.xml", "sitemap-matches-window.xml"];
    return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${maps.map(m => `<sitemap><loc>${BASE}/${m}</loc></sitemap>`).join("")}</sitemapindex>`);
  }
  if (name === "sitemap-hubs.xml") {
    // Every indexable hub: /league/<x> pages from hubs() all have stored fixtures (the page is only
    // noindex when a known league has none), F1, competition topics, cricket/SAFF centres, today's
    // cricket match pages (UUID ids only; the page 404s otherwise) and the static trust pages.
    const eventTimes = await eventLastmod();
    const eventStamp = Object.values(eventTimes).sort().at(-1);
    const feedPages = await eventFeedPaths();
    const slug = (x: string) => x.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const cricket = (await getCricket().catch(() => [])).filter(m => /^[0-9a-f-]{36}$/i.test(m.id) && m.teams?.length >= 2)
      .map(m => ({ url: `${BASE}/cricket/${m.id}-${`${slug(m.teams[0].name)}-vs-${slug(m.teams[1].name)}`.slice(0, 80)}` }));
    return urls([{ url: BASE + "/" }, { url: BASE + "/league/f1" }, ...(await races()).map(r => ({ url: BASE + "/race/" + r.slug, lastmod: r.lastmod })), ...(d1() ? (await d1()!.prepare("SELECT slug,lastmod FROM seo_pages WHERE site_id=\'ninetymins\' AND kind=\'stories\'").all<{ slug: string; lastmod: string }>()).results.map(r => ({ url: BASE + "/stories/" + r.slug, lastmod: r.lastmod })) : []), ...["today", "tomorrow", "scores", "widgets", "archive", "live-tv", "cricket", "saff", "highlights", ...HL_SPORTS.filter(([k]) => k).map(([k]) => `highlights/${k}`)].map(p => ({ url: `${BASE}/${p}` })), ...[...new Set(NM_COMPS.map(c => c.slug))].map(c => ({ url: `${BASE}/topic/${c}` })), ...(await sitemapHubs()).map(h => ({ url: BASE + h.path, lastmod: h.lastmod })), ...cricket, ...["about", "contact", "privacy", "terms", "disclaimer"].map(p => ({ url: `${BASE}/${p}` })), { url: BASE + "/event", ...(eventStamp ? { lastmod: eventStamp } : {}) }, ...EVENT_PATHS.map(p => ({ url: BASE + p, ...(eventTimes[p.split("/").pop()!] ? { lastmod: eventTimes[p.split("/").pop()!] } : {}) })), ...sitemapEventPages().map(p => ({ url: BASE + p.path })), ...feedPages.map(p => ({ url: BASE + p.path, ...(p.lastmod ? { lastmod: p.lastmod } : {}) }))]);
  }
  // Plan 2 (26 Nov 2026): player and h2h templates are noindex,follow (cache-worker), so their sitemaps are empty.
  if (name === "sitemap-players.xml" || name === "sitemap-h2h.xml") return urls([]);
  if (name === "sitemap-matches-window.xml") {
    const db = d1(); if (!db) return urls([]);
    const rows = (await db.prepare("SELECT path,lastmod FROM seo_matches WHERE starts>=? AND starts<? AND path LIKE '/match/%' ORDER BY starts").bind(new Date(Date.now() - 2 * 864e5).toISOString(), new Date(Date.now() + 7 * 864e5).toISOString()).all<{ path: string; lastmod: string }>()).results;
    return urls(rows.map(r => ({ url: BASE + r.path, lastmod: r.lastmod })));
  }
  if (name === "sitemap-players-legacy.xml") return urls((await sitemapPlayers()).map(p => ({ url: BASE + p.path, lastmod: p.lastmod })));
  if (name === "sitemap-h2h.xml") return urls((await allPairs()).map(p => ({ url: `${BASE}/h2h/${p.slug}`, lastmod: p.lastmod })));
  if (name === "sitemap-videos.xml") {
    // Google video sitemap: one watch page per official highlight (player = YouTube embed).
    const vidCut = Date.now() - 90 * 864e5;
    const vids = (await sitemapHighlights()).filter(v => Date.parse(v.date) >= vidCut);
    return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${vids.map(v => `<url><loc>${xmlEscape(BASE + hlPath(v))}</loc><lastmod>${xmlEscape(v.date)}</lastmod><video:video><video:thumbnail_loc>${xmlEscape(v.thumb)}</video:thumbnail_loc><video:title>${xmlEscape(cleanTitle(v.title).slice(0, 100))}</video:title><video:description>${xmlEscape(`Official highlights from ${v.channel.trim()}.`)}</video:description><video:player_loc>${xmlEscape(`https://www.youtube.com/embed/${v.id}`)}</video:player_loc><video:duration>${Math.max(1, v.dur | 0)}</video:duration><video:publication_date>${xmlEscape(v.date)}</video:publication_date><video:family_friendly>yes</video:family_friendly></video:video></url>`).join("")}</urlset>`);
  }
  const pruned = await prunedSlugs("ninetymins");
  const articles = (await getArticles("ninetymins")).filter(a => !pruned.has(a.slug));
  if (name === "sitemap-articles.xml") return urls(articles.map(a => ({ url: `${BASE}/${a.slug}`, lastmod: a.created_at })));
  if (name === "sitemap-news.xml") {
    const cutoff = Date.now() - 48 * 3600000;
    const resultPages = await fixtures("state='post' AND result_at>=? AND starts>=?", [new Date(cutoff).toISOString(), new Date(cutoff).toISOString()], 1000);
    const items = [...articles.filter(a => Date.parse(a.created_at) >= cutoff).map(a => ({ url: `${BASE}/${a.slug}`, date: a.created_at, title: a.title })), ...resultPages.map(f => ({ url: BASE + f.path, date: f.result_at!, title: `${f.ev.home.name} ${f.ev.home.score}–${f.ev.away.score} ${f.ev.away.name}: result` }))].slice(0, 1000);
    return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items.map(i => `<url><loc>${xmlEscape(i.url)}</loc><news:news><news:publication><news:name>NinetyMins</news:name><news:language>en</news:language></news:publication><news:publication_date>${xmlEscape(i.date)}</news:publication_date><news:title>${xmlEscape(i.title)}</news:title></news:news></url>`).join("")}</urlset>`);
  }
  const parsed = name.match(/^sitemap-matches-(\d{4}-\d{2})(?:-(\d+))?\.xml$/);
  const month = parsed?.[1], page = Number(parsed?.[2] || 1);
  if (month && page >= 1 && (await monthMaps()).includes(name)) {
    const db = d1()!;
    const rows = (await db.prepare("SELECT path,lastmod FROM seo_matches WHERE starts>=? AND starts<? AND path LIKE '/match/%' ORDER BY starts LIMIT 50000 OFFSET ?").bind(month + "-01", nextMonth(month), (page - 1) * 50000).all<{ path: string; lastmod: string }>()).results;
    return urls(rows.map(r => ({ url: BASE + r.path, lastmod: r.lastmod })));
  }
  return new Response("Not found", { status: 404 });
}
async function countlySitemap(name: string): Promise<Response> {
  const base = "https://countly.net";
  if (name === "sitemap.xml") return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["sitemap-hubs.xml", "sitemap-data.xml", "sitemap-articles.xml"].map(m => `<sitemap><loc>${base}/${m}</loc></sitemap>`).join("")}</sitemapindex>`);
  const hidden = await prunedSlugs("countly");
  const articles = await getArticles("countly");
  if (name === "sitemap-articles.xml") return urls(articles.filter(a => !hidden.has(a.slug)).map(a => ({ url: `${base}/${a.slug}`, lastmod: a.created_at })));
  if (name === "sitemap-data.xml") return urls([...(await dataIndex()).filter(p => p.kind !== "embed" && p.kind !== "compare").map(p => ({ url: `${base}/data/${p.kind}/${p.slug}`, lastmod: p.lastmod })), ...(await comparisonLinks()).map(c => ({ url: base + c.path }))]);
  if (name === "sitemap-hubs.xml") {
    const articleUrls = new Set(articles.map(a => `${base}/${a.slug}`));
    return urls([{ url: base + "/data" }, ...(await legacySitemap()).filter(p => !articleUrls.has(p.url) && indexableLoc(p.url)).map(p => ({ url: indexableLoc(p.url)! }))]);
  }
  return new Response("Not found", { status: 404 });
}
function nextMonth(month: string) { const d = new Date(`${month}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString().slice(0, 10); }

async function monthMaps(): Promise<string[]> {
  const db = d1(); if (!db) return [];
  const rows = (await db.prepare("SELECT substr(starts,1,7) AS month,COUNT(*) AS n FROM seo_matches GROUP BY substr(starts,1,7)").all<{ month: string; n: number }>()).results;
  return rows.flatMap(r => Array.from({ length: Math.ceil(r.n / 50000) }, (_, i) => `sitemap-matches-${r.month}${i ? `-${i + 1}` : ""}.xml`));
}

/** Plan 2: league hubs stay; /team/ pages only for flagship-league clubs with a fixture in the rolling window. Tennis/MMA athletes never. */
const PRIORITY_LEAGUES = ["eng-1", "esp-1", "ita-1", "ger-1", "fra-1", "uefa-champions", "uefa-europa", "ksa-1", "nba", "nfl"];
async function sitemapHubs(): Promise<{ path: string; lastmod: string }[]> {
  const all = await hubs();
  const db = d1(); if (!db) return all.filter(h => !h.path.startsWith("/team/"));
  const a = new Date(Date.now() - 7 * 864e5).toISOString(), b = new Date(Date.now() + 14 * 864e5).toISOString();
  const ph = PRIORITY_LEAGUES.map(() => "?").join(",");
  const rows = (await db.prepare(`SELECT DISTINCT s FROM (SELECT home_slug s FROM seo_matches WHERE starts>=? AND starts<? AND league IN (${ph}) UNION ALL SELECT away_slug s FROM seo_matches WHERE starts>=? AND starts<? AND league IN (${ph}))`).bind(a, b, ...PRIORITY_LEAGUES, a, b, ...PRIORITY_LEAGUES).all<{ s: string }>()).results;
  const keep = new Set(rows.map(r => "/team/" + r.s));
  return all.filter(h => !h.path.startsWith("/team/") || (keep.has(h.path) && !/-(tennis|mma)-\d+$/.test(h.path)));
}
