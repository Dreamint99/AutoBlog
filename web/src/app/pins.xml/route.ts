import { getArticles } from "@/lib/data";
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
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>` +
    `<title>${esc(site.name)} — Pins</title><link>${base}</link><description>${esc(site.tagline)}</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=1800" } });
}
