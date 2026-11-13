import { getArticles, d1 } from "@/lib/data";
import { activeSite } from "@/lib/site-context";
import { siteBaseUrl } from "@/lib/sites.config";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

// Pinterest feed: same articles as /rss.xml, but every image is the tall 2:3 pin from /pin/<slug>.
// Pinterest business → Settings → Bulk create Pins → Auto-publish → add this URL to a board.
export async function GET() {
  const site = activeSite();
  const base = siteBaseUrl(site);
  const items = (await getArticles(site.id)).slice(0, 50).map((a) => {
    const url = `${base}/${a.slug}`;
    const pin = `${base}/pin/${a.slug}`;
    // Pinterest search reads the title + description: add the focus keyword and topic tags as plain
    // words (Pinterest no longer uses hashtags), kept under its 500-character description limit.
    const base_desc = (a.meta_description || a.excerpt || "").replace(/[  ]/g, " ").trim();
    const topics = [a.keyword, ...(a.tags || [])].filter((t): t is string => !!t && !base_desc.toLowerCase().includes(t.toLowerCase()));
    const desc = (topics.length ? `${base_desc} Topics: ${[...new Set(topics)].slice(0, 5).join(", ")}.` : base_desc).slice(0, 495);
    return `<item><title>${esc(a.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid>` +
      `<pubDate>${new Date(a.created_at).toUTCString()}</pubDate><description>${esc(desc)}</description>` +
      `<media:content url="${esc(pin)}" medium="image" type="image/png" width="1000" height="1500"/><enclosure url="${esc(pin)}" type="image/png" length="0"/></item>`;
  }).join("");
  const db = d1();
  const data = db && ["ninetymins", "countly"].includes(site.id) ? (await db.prepare(site.id === "countly"
    ? "SELECT '/data/'||kind||'/'||slug AS path,title,created_at AS published FROM seo_pages WHERE site_id='countly' ORDER BY created_at DESC LIMIT 1000"
    : "SELECT path,json_extract(ev_json,'$.home.name')||' '||json_extract(ev_json,'$.home.score')||'–'||json_extract(ev_json,'$.away.score')||' '||json_extract(ev_json,'$.away.name')||': result' AS title,result_at AS published FROM seo_matches WHERE state='post' AND result_at IS NOT NULL ORDER BY result_at DESC LIMIT 200").all<{ path: string; title: string; published: string }>()).results : [];
  const dataItems = data.map(p => { const url = base + p.path, image = `${base}/og/${site.id}.png`; return `<item><title>${esc(p.title)}</title><link>${esc(url)}</link><guid isPermaLink="true">${esc(url)}</guid><pubDate>${new Date(p.published).toUTCString()}</pubDate><description>${esc(p.title + " — sourced data, tables and charts.")}</description><media:content url="${image}" medium="image" type="image/png" width="1200" height="630"/><enclosure url="${image}" type="image/png" length="0"/></item>`; }).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>` +
    `<title>${esc(site.name)} — Pins</title><link>${base}</link><description>${esc(site.tagline)}</description>${items}${dataItems}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=1800" } });
}
