import { getFxSnapshot, crossRate, getGold } from "@/lib/gcc";
import { GRAMS_PER_OZ, GULF_CURRENCIES, QUOTE_CURRENCIES } from "@/sites/gccguide/hub/config";
import { buildFuelView } from "@/sites/gccguide/hub/fuel";
import { fmt } from "@/sites/gccguide/hub/format";

// Daily rate digest as RSS 2.0 — one item per Gulf→quote pair plus gold and fuel,
// regenerated on every request so a reader's feed shows today's numbers.
//   https://gccguide.com/feed-rates.xml
export const dynamic = "force-dynamic";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function GET() {
  const site = "https://gccguide.com";
  const [snap, gold] = await Promise.all([getFxSnapshot(), getGold()]);
  const pub = new Date(snap.updated).toUTCString();
  const date = snap.updated.slice(0, 10);

  const items: { title: string; link: string; description: string }[] = [];

  for (const g of GULF_CURRENCIES) {
    for (const q of QUOTE_CURRENCIES) {
      const r = crossRate(snap, g.code, q.code);
      if (r == null) continue;
      items.push({
        title: `1 ${g.code} = ${fmt(r, r > 100 ? 2 : 4)} ${q.code} (${date})`,
        link: `${site}/rates/${g.code.toLowerCase()}-to-${q.code.toLowerCase()}`,
        description: `${g.name} to ${q.name}: ${fmt(r, r > 100 ? 2 : 4)} on ${date}. Mid-market rate, source ${g.code === "KWD" ? "live feed" : "pegged plus quote currency"}.`,
      });
    }
  }

  const aed = snap.byCode.AED?.rate ?? 3.6725;
  const g22 = (gold.usdPerOz / GRAMS_PER_OZ) * aed * 0.916;
  items.push({
    title: `Gold 22K in Dubai: AED ${fmt(g22, 2)} per gram (${date})`,
    link: `${site}/gold-rate/dubai`,
    description: `Spot-based 22K gold in Dubai is AED ${fmt(g22, 2)}/g today, from ${fmt(gold.usdPerOz, 2)} USD/oz. Shops add making charges.`,
  });

  const uae = buildFuelView("uae");
  const p95 = uae?.rows.find((r) => /95/.test(r.grade));
  if (p95) {
    items.push({
      title: `UAE petrol 95-octane: AED ${fmt(p95.price, 3)}/litre (${uae!.monthLabel})`,
      link: `${site}/fuel-price/uae`,
      description: `Official UAE fuel prices for ${uae!.monthLabel}, effective ${p95.effective_from || uae!.month}.`,
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>GCCGuide — Gulf rates today</title>
    <link>${site}/rates</link>
    <description>Daily mid-market exchange rates, gold and fuel prices for the six Gulf states.</description>
    <language>en</language>
    <lastBuildDate>${pub}</lastBuildDate>
    <docs>https://www.rssboard.org/rss-specification</docs>
${items
  .map(
    (i) => `    <item>
      <title>${esc(i.title)}</title>
      <link>${esc(i.link)}</link>
      <guid isPermaLink="true">${esc(i.link)}</guid>
      <pubDate>${pub}</pubDate>
      <description>${esc(i.description)}</description>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=900, s-maxage=900" },
  });
}
