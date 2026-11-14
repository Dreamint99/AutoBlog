import { sitemapIndex, xmlResponse, siteAndBase, abs } from "@/lib/gcc-sitemaps";

// The hub's sitemap index. robots.txt points gccguide here instead of at
// /sitemap.xml, so every family of pages is reported separately and lastmod
// tracks the data rather than the deploy.
export async function GET() {
  const { base } = siteAndBase();
  const today = new Date().toISOString().slice(0, 10);
  const parts = ["rates", "gold", "fuel", "calculators", "prayer", "embassy", "visa", "holidays"];
  const urls = [
    { loc: abs(base, "/sitemap.xml"), lastmod: today },
    ...parts.map((p) => ({ loc: abs(base, `/sitemap-${p}.xml`), lastmod: today })),
  ];
  return xmlResponse(sitemapIndex(urls));
}
