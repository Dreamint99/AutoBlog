import { urlset, xmlResponse, siteAndBase, abs } from "@/lib/gcc-sitemaps";
import { getFxSnapshot, crossRate } from "@/lib/gcc";
import { GULF_CURRENCIES, QUOTE_CURRENCIES } from "@/sites/gccguide/hub/config";
import { gate } from "@/sites/gccguide/hub/gate";

// Only the 84 forward Gulf→quote pairs are indexed; the reverse pairs are
// noindex + canonical and therefore absent here.
export async function GET() {
  const { base } = siteAndBase();
  const snap = await getFxSnapshot();
  const lastmod = snap.updated.slice(0, 10);
  const entries = [
    { loc: abs(base, "/rates"), lastmod, changefreq: "hourly" as const, priority: 1 },
    ...GULF_CURRENCIES.flatMap((g) =>
      QUOTE_CURRENCIES.filter(() => gate.ratesPair(false)).map((q) => ({
        loc: abs(base, `/rates/${g.code.toLowerCase()}-to-${q.code.toLowerCase()}`),
        lastmod,
        changefreq: "hourly" as const,
        priority: crossRate(snap, g.code, q.code) == null ? 0.3 : 0.8,
      })),
    ),
  ];
  return xmlResponse(urlset(entries));
}
