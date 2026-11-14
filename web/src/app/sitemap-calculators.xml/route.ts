import { urlset, xmlResponse, siteAndBase, abs } from "@/lib/gcc-sitemaps";
import { GULF_CURRENCIES } from "@/sites/gccguide/hub/config";
import { allRules } from "@/sites/gccguide/hub/rules";
import { gate, INDEXED_EXAMPLE_YEARS } from "@/sites/gccguide/hub/gate";
import { exampleSlug } from "@/sites/gccguide/hub/gratuity";

// Only verified countries, and only the example combinations people search for.
const EXAMPLE_WAGES = [3000, 5000, 8000, 10000];

export async function GET() {
  const { base } = siteAndBase();
  const lastmod = "2026-11-14";
  const entries: { loc: string; lastmod: string; changefreq: "monthly" | "weekly"; priority: number }[] = [
    { loc: abs(base, "/calculators"), lastmod, changefreq: "monthly", priority: 0.9 },
  ];
  for (const g of GULF_CURRENCIES) {
    const rule = allRules().find((r) => r.country === g.country)?.gratuity;
    if (!rule || !gate.calculator(rule.confirmed)) continue;
    entries.push({ loc: abs(base, `/gratuity/${g.country}`), lastmod, changefreq: "monthly", priority: 0.9 });
    for (const kind of ["overtime", "annual-leave", "notice-period"]) {
      entries.push({ loc: abs(base, `/${kind}/${g.country}`), lastmod, changefreq: "monthly", priority: 0.8 });
    }
    for (const wage of EXAMPLE_WAGES) {
      for (const years of INDEXED_EXAMPLE_YEARS) {
        if (!gate.calculatorExample(years, rule.confirmed)) continue;
        entries.push({
          loc: abs(base, `/gratuity/${g.country}/${exampleSlug(wage, g.code, years)}`),
          lastmod,
          changefreq: "monthly",
          priority: 0.6,
        });
      }
    }
  }
  return xmlResponse(urlset(entries));
}
