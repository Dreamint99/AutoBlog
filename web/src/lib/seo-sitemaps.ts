import { races } from "@/sites/ninetymins/F1Hub";
import { activeSite } from "./site-context";
import { getArticles, d1 } from "./data";
import { fixtures, hubs, months, prunedSlugs } from "@/sites/ninetymins/engine";
import legacySitemap from "./legacy-sitemap";
import { dataIndex, comparisonLinks } from "@/sites/countly/data-engine";
const BASE = "https://ninetymins.com";
export const xmlEscape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const xml = (body: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=60" } });
const urls = (items: { url: string; lastmod?: string }[]) => xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.map(i => `<url><loc>${xmlEscape(i.url)}</loc>${i.lastmod ? `<lastmod>${xmlEscape(i.lastmod)}</lastmod>` : ""}</url>`).join("")}</urlset>`);

export async function sitemapResponse(name: string): Promise<Response> {
  if (activeSite().id === "countly") return countlySitemap(name);
  if (activeSite().id !== "ninetymins") {
    if (name !== "sitemap.xml") return new Response("Not found", { status: 404 });
    return urls((await legacySitemap()).map(i => ({ url: i.url, lastmod: i.lastModified instanceof Date ? i.lastModified.toISOString() : i.lastModified })));
  }
  if (name === "sitemap.xml") {
    const maps = ["sitemap-hubs.xml", "sitemap-articles.xml", "sitemap-news.xml", ...(await monthMaps())];
    return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${maps.map(m => `<sitemap><loc>${BASE}/${m}</loc></sitemap>`).join("")}</sitemapindex>`);
  }
  if (name === "sitemap-hubs.xml") return urls([{ url: BASE + "/" }, { url: BASE + "/league/f1" }, ...(await races()).map(r => ({ url: BASE + "/race/" + r.slug, lastmod: r.lastmod })), ...(d1() ? (await d1()!.prepare("SELECT slug,lastmod FROM seo_pages WHERE site_id=\'ninetymins\' AND kind=\'stories\'").all<{ slug: string; lastmod: string }>()).results.map(r => ({ url: BASE + "/stories/" + r.slug, lastmod: r.lastmod })) : []), ...["today", "tomorrow", "scores", "widgets", "archive"].map(p => ({ url: `${BASE}/${p}` })), ...(await hubs()).map(h => ({ url: BASE + h.path, lastmod: h.lastmod }))]);
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
    const rows = (await db.prepare("SELECT path,lastmod FROM seo_matches WHERE starts>=? AND starts<? ORDER BY starts LIMIT 50000 OFFSET ?").bind(month + "-01", nextMonth(month), (page - 1) * 50000).all<{ path: string; lastmod: string }>()).results;
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
  if (name === "sitemap-data.xml") return urls([...(await dataIndex()).map(p => ({ url: `${base}/data/${p.kind}/${p.slug}`, lastmod: p.lastmod })), ...(await comparisonLinks()).map(c => ({ url: base + c.path }))]);
  if (name === "sitemap-hubs.xml") {
    const articleUrls = new Set(articles.map(a => `${base}/${a.slug}`));
    return urls([{ url: base + "/data" }, ...(await legacySitemap()).filter(p => !articleUrls.has(p.url)).map(p => ({ url: p.url }))]);
  }
  return new Response("Not found", { status: 404 });
}
function nextMonth(month: string) { const d = new Date(`${month}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString().slice(0, 10); }

async function monthMaps(): Promise<string[]> {
  const db = d1(); if (!db) return [];
  const rows = (await db.prepare("SELECT substr(starts,1,7) AS month,COUNT(*) AS n FROM seo_matches GROUP BY substr(starts,1,7)").all<{ month: string; n: number }>()).results;
  return rows.flatMap(r => Array.from({ length: Math.ceil(r.n / 50000) }, (_, i) => `sitemap-matches-${r.month}${i ? `-${i + 1}` : ""}.xml`));
}
