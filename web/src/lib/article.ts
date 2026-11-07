import type { TocItem } from "./types";

export function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "section";
}

/**
 * Server-side body processing shared by every site design:
 *  - give <h2>/<h3> stable ids (for the table-of-contents anchors)
 *  - wrap <table> in .table-wrap for horizontal scroll on mobile
 * Returns the rewritten HTML and the extracted table of contents.
 */
export function processBody(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  let out = html.replace(/<(h2|h3)>([\s\S]*?)<\/\1>/gi, (_m, tag: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const id = slugifyHeading(text);
    toc.push({ id, text, level: tag.toLowerCase() === "h2" ? 2 : 3 });
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });
  out = out
    .replace(/<table/gi, '<div class="table-wrap"><table')
    .replace(/<\/table>/gi, "</table></div>");
  return { html: out, toc };
}

// First path segments that are real routes (app/s/[site]/*) or public folders — links
// into these are never treated as dead article links.
const ROUTES = new Set(
  ("about api archive bangladesh-map best-ai-tools calculators card compare contact countries country cricket " +
    "crypto currency-converter disclaimer guides jobs match models passport passport-index pin privacy saff scores " +
    "search terms today tools top10 topic travel-map visa-check visa-checker visit-bangladesh " +
    "brand coxsbazar geo og tanguar rss.xml pins.xml sitemap.xml llms.txt").split(" "),
);

/**
 * Unwrap internal links that point at no article (writer-invented slugs → 404).
 * Search Console counts every 404 link as a crawl wasted; the reader loses nothing
 * because the anchor text stays. Links to known slugs, routes and other sites are kept.
 */
export function dropDeadLinks(html: string, domain: string, slugs: Set<string>): string {
  const host = domain.replace(/^www\./, "").toLowerCase();
  return html.replace(/<a\b([^>]*?)href="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi, (m, _pre, href: string, _post, inner) => {
    let path: string;
    if (href.startsWith("/") && !href.startsWith("//")) path = href;
    else {
      const u = href.match(/^https?:\/\/(?:www\.)?([^/]+)(\/[^?#]*)?/i);
      if (!u || u[1].toLowerCase() !== host) return m; // external, anchor (#), mailto… — keep
      path = u[2] || "/";
    }
    path = path.split(/[?#]/)[0].replace(/^\/s\/[a-z]+(?=\/|$)/, "");
    const segs = path.split("/").filter(Boolean);
    if (!segs.length || ROUTES.has(segs[0])) return m;
    if (segs.length === 1 && slugs.has(segs[0])) return m;
    return inner;
  });
}
