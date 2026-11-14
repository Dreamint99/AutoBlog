import { urlset, xmlResponse, siteAndBase, abs } from "@/lib/gcc-sitemaps";
import { getGold } from "@/lib/gcc";
import { GOLD_CITIES } from "@/sites/gccguide/hub/config";
import { gate } from "@/sites/gccguide/hub/gate";

export async function GET() {
  const { base } = siteAndBase();
  const gold = await getGold();
  const lastmod = gold.updated.slice(0, 10);
  const entries = [
    { loc: abs(base, "/gold-rate"), lastmod, changefreq: "hourly" as const, priority: 1 },
    ...GOLD_CITIES.filter((c) => gate.goldCity(c.slug)).map((c) => ({
      loc: abs(base, `/gold-rate/${c.slug}`),
      lastmod,
      changefreq: "hourly" as const,
      priority: c.primary ? 0.9 : 0.7,
    })),
  ];
  return xmlResponse(urlset(entries));
}
