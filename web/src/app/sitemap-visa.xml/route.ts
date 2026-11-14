import { urlset, xmlResponse, siteAndBase, abs } from "@/lib/gcc-sitemaps";
import { visaItems, visaCountries } from "@/sites/gccguide/hub/directory";
import { gate } from "@/sites/gccguide/hub/gate";

export async function GET() {
  const { base } = siteAndBase();
  const checked = visaItems()[0]?.checked ?? "2026-11-14";
  const entries = [
    { loc: abs(base, "/visa-fees"), lastmod: checked, changefreq: "monthly" as const, priority: 0.9 },
    ...visaCountries()
      .filter(() => gate.visaFees())
      .map((c) => ({ loc: abs(base, `/visa-fees/${c}`), lastmod: visaItems(c)[0]?.checked ?? checked, changefreq: "monthly" as const, priority: 0.7 })),
  ];
  return xmlResponse(urlset(entries));
}
