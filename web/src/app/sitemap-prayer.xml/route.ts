import { urlset, xmlResponse, siteAndBase, abs } from "@/lib/gcc-sitemaps";
import { GULF_CURRENCIES } from "@/sites/gccguide/hub/config";
import { GULF_CURRENCIES as G } from "@/sites/gccguide/hub/config";
import { citiesOf, indexedCities } from "@/sites/gccguide/hub/prayer";
import { gate } from "@/sites/gccguide/hub/gate";

void GULF_CURRENCIES;

// Indexed cities only (population >= the threshold in hub/config.ts). The rest of
// the towns keep working pages but stay out of the sitemap.
export async function GET() {
  const { base } = siteAndBase();
  const lastmod = new Date().toISOString().slice(0, 10);
  const entries: { loc: string; lastmod: string; changefreq: "daily" | "weekly"; priority: number }[] = [
    { loc: abs(base, "/prayer-times"), lastmod, changefreq: "daily", priority: 1 },
  ];
  for (const g of GULF_CURRENCIES) {
    if (!citiesOf(g.country).length) continue;
    entries.push({ loc: abs(base, `/prayer-times/${g.country}`), lastmod, changefreq: "weekly", priority: 0.8 });
  }
  for (const c of indexedCities()) {
    if (!gate.prayerCity(c.pop)) continue;
    entries.push({ loc: abs(base, `/prayer-times/${c.country}/${c.slug}`), lastmod, changefreq: "daily", priority: 0.7 });
  }
  return xmlResponse(urlset(entries));
}
