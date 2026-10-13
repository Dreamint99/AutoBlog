import { getArticles } from "@/lib/data";
import { activeSite } from "@/lib/site-context";
import { siteBaseUrl } from "@/lib/sites.config";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

// RSS 2.0 with one image per item (media:content + enclosure): feed readers, Pinterest's
// "auto-publish from RSS", Flipboard and news apps pick up every new article from here.
export async function GET() {
  const site = activeSite();
  const base = siteBaseUrl(site);
  const items = (await getArticles(site.id)).slice(0, 50).map((a) => {
    const url = `${base}/${a.slug}`;
    const img = a.image_url ? (a.image_url.startsWith("http") ? a.image_url : `${base}${a.image_url}`) : `${base}/card/${a.slug}`;
    return `<item><title>${esc(a.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid>` +
      `<pubDate>${new Date(a.created_at).toUTCString()}</pubDate><description>${esc(a.meta_description || a.excerpt || "")}</description>` +
      `<media:content url="${esc(img)}" medium="image" width="1200" height="630"/><enclosure url="${esc(img)}" type="image/jpeg" length="0"/></item>`;
  }).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom"><channel>` +
    `<title>${esc(site.name)}</title><link>${base}</link><description>${esc(site.tagline)}</description><language>en</language>` +
    `<atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=1800" } });
}
