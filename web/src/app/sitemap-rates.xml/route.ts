import { urlset, xmlResponse, siteAndBase, abs, gccOnly } from "@/lib/gcc-sitemaps";
import { getFxSnapshot, crossRate } from "@/lib/gcc";
import { GULF_CURRENCIES, QUOTE_CURRENCIES } from "@/sites/gccguide/hub/config";
import { gate } from "@/sites/gccguide/hub/gate";
import { buildRemitHub } from "@/sites/gccguide/hub/remittance";

// Only the 84 forward Gulf→quote pairs are indexed; the reverse pairs are
// noindex + canonical and therefore absent here.
export async function GET() {
  const denied = gccOnly();
  if (denied) return denied;
  const { base } = siteAndBase();
  const [snap, remit] = await Promise.all([getFxSnapshot(), buildRemitHub()]);
  const lastmod = snap.updated.slice(0, 10);
  const entries = [
    { loc: abs(base, "/rates"), lastmod, changefreq: "hourly" as const, priority: 1 },
    // Monthly remittance reports: the hub + one page per month (current month = "so far").
    ...(remit
      ? [
          { loc: abs(base, "/reports/remittance"), lastmod: remit.items[0]?.lastDate ?? lastmod, changefreq: "daily" as const, priority: 0.9 },
          ...remit.items.map((it) => ({
            loc: abs(base, `/reports/remittance/${it.ym}`),
            lastmod: it.lastDate,
            changefreq: (it.complete ? "monthly" : "daily") as "monthly" | "daily",
            priority: 0.7,
          })),
        ]
      : []),
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
