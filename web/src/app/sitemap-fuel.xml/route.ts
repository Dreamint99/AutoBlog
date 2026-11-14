import { urlset, xmlResponse, siteAndBase, abs } from "@/lib/gcc-sitemaps";
import { FUEL_COUNTRIES } from "@/sites/gccguide/hub/config";
import { buildFuelView, fuelMonth } from "@/sites/gccguide/hub/fuel";
import { gate } from "@/sites/gccguide/hub/gate";

export async function GET() {
  const { base } = siteAndBase();
  const lastmod = `${fuelMonth()}-01`;
  const views = FUEL_COUNTRIES.map((c) => buildFuelView(c.slug)).filter((v) => v != null);
  const entries = [
    { loc: abs(base, "/fuel-price"), lastmod, changefreq: "monthly" as const, priority: 0.9 },
    ...views
      .filter((v) => gate.fuelCountry(v.rows.length > 0))
      .map((v) => ({ loc: abs(base, `/fuel-price/${v.country}`), lastmod, changefreq: "monthly" as const, priority: 0.8 })),
  ];
  return xmlResponse(urlset(entries));
}
