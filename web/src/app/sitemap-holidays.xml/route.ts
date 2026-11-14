import { urlset, xmlResponse, siteAndBase, abs } from "@/lib/gcc-sitemaps";
import { holidayYears, holidaySlug } from "@/sites/gccguide/hub/directory";
import { gate } from "@/sites/gccguide/hub/gate";

export async function GET() {
  const { base } = siteAndBase();
  const entries = [
    { loc: abs(base, "/public-holidays"), lastmod: "2026-11-14", changefreq: "monthly" as const, priority: 0.9 },
    ...holidayYears()
      .filter(() => gate.holidays())
      .map((h) => ({ loc: abs(base, `/public-holidays/${holidaySlug(h)}`), lastmod: h.checked, changefreq: "monthly" as const, priority: 0.7 })),
  ];
  return xmlResponse(urlset(entries));
}
