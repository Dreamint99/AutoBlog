import "server-only";
import { activeSite } from "@/lib/site-context";
import { siteBaseUrl } from "@/lib/sites.config";
import { indexableLoc } from "@/lib/indexable-url";

/* Sitemap helpers for the hub.
 *
 * The network's /sitemap.xml (app/sitemap.ts) stays the article sitemap. The hub
 * adds one sitemap per page type so Google can see which families changed, and
 * lists them from /sitemap-index.xml. Only INDEXED pages are ever listed — the
 * gate in sites/gccguide/hub/gate.ts is the single decision point.
 */

export type Entry = {
  loc: string;
  lastmod?: string;
  changefreq?: "daily" | "hourly" | "weekly" | "monthly" | "yearly";
  priority?: number;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function urlset(entries: Entry[]): string {
  const clean = entries.filter((e) => indexableLoc(e.loc));
  const body = clean
    .map(
      (e) =>
        `  <url><loc>${esc(e.loc)}</loc>` +
        (e.lastmod ? `<lastmod>${esc(e.lastmod)}</lastmod>` : "") +
        (e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : "") +
        (e.priority != null ? `<priority>${e.priority.toFixed(1)}</priority>` : "") +
        `</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function sitemapIndex(urls: { loc: string; lastmod?: string }[]): string {
  const body = urls
    .map((u) => `  <sitemap><loc>${esc(u.loc)}</loc>` + (u.lastmod ? `<lastmod>${esc(u.lastmod)}</lastmod>` : "") + `</sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      // 30 min at the edge, matching cache-worker.js; the data job runs 3×/day.
      "cache-control": "public, max-age=1800, s-maxage=1800",
    },
  });
}

export function siteAndBase(): { id: string; base: string } {
  const site = activeSite();
  return { id: site.id, base: siteBaseUrl(site) };
}

/** Absolute URL for a site-relative path. */
export function abs(base: string, path: string): string {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Hub sitemaps describe gccguide.com only. Other sites 404 them so Google
 *  never receives /rates, /gold-rate, … URLs that do not exist there. */
export function gccOnly(): Response | null {
  if (activeSite().id === "gccguide") return null;
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" },
  });
}
