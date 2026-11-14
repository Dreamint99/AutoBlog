import "server-only";
import { getGold, getGoldHistory, getFxSnapshot, usdPer, type FxSnapshot } from "@/lib/gcc";
import { GOLD_CITIES, GRAMS_PER_OZ, GRAMS_PER_TOLA, KARATS, INDEX } from "./config";
import { changeOver, stats, dpFor, type Pt } from "./series";
import { dateLong, fmt, pct } from "./format";

/* Gold rate pages.
 *
 * The maths is one line: USD per ounce ÷ 31.1034768 × (local currency per USD)
 * × karat purity. Everything else on the page is that number, honestly framed:
 * shops add a making charge, so a souq price is always above this one.
 */

export type GoldCityView = {
  slug: string;
  city: string;
  country: string;
  countryName: string;
  currency: string;
  flag: string;
  primary: boolean;
  usdPerOz: number;
  asOf: string;
  updated: string;
  source: string;
  sourceUrl: string;
  live: boolean;
  fxPerUsd: number | null;
  /** [karat, per gram, 8g, 10g, 1 tola] in local currency */
  rows: { k: number; label: string; note: string; gram: number; eight: number; ten: number; tola: number }[];
  usdRows: { k: number; label: string; gram: number; tola: number }[];
  otherCurrencies: { code: string; gram: number; tola: number }[];
  ch30: { pct: number; from: number; to: number; fromDate: string } | null;
  ch7: { pct: number; from: number; to: number; fromDate: string } | null;
  st30: { min: Pt; max: Pt; avg: number } | null;
  series30: Pt[];
  title: string;
  description: string;
  faq: { q: string; a: string }[];
};

function perGram(usdPerOz: number, fxPerUsd: number | null, purity = 1): number | null {
  if (!fxPerUsd) return null;
  return (usdPerOz / GRAMS_PER_OZ) * fxPerUsd * purity;
}

export function findCity(slug: string) {
  return GOLD_CITIES.find((c) => c.slug === slug.toLowerCase());
}

export async function buildGoldView(citySlug: string): Promise<GoldCityView | null> {
  const city = findCity(citySlug);
  if (!city) return null;
  const [gold, snap, hist] = await Promise.all([getGold(), getFxSnapshot(), getGoldHistory(366)]);
  const fx = usdPer(snap, city.currency);
  const dp = city.currency === "KWD" ? 3 : 2;

  const rows = KARATS.map((k) => {
    const gram = perGram(gold.usdPerOz, fx, k.purity) ?? 0;
    return { k: k.k, label: k.label, note: k.note, gram, eight: gram * 8, ten: gram * 10, tola: gram * GRAMS_PER_TOLA };
  });
  const usdRows = KARATS.map((k) => {
    const gram = perGram(gold.usdPerOz, 1, k.purity) ?? 0;
    return { k: k.k, label: k.label, gram, tola: gram * GRAMS_PER_TOLA };
  });

  // Same gold, priced in the other five Gulf currencies — what an expat in one
  // Gulf state pays when they buy for family in another.
  const otherCurrencies = ["AED", "SAR", "QAR", "KWD", "OMR", "BHD"]
    .filter((c) => c !== city.currency)
    .map((code) => {
      const g = perGram(gold.usdPerOz, usdPer(snap, code)) ?? 0;
      return { code, gram: g, tola: g * GRAMS_PER_TOLA };
    });

  // History is stored in USD/oz; convert with today's FX so the line is what a
  // buyer in this city would have paid (pegged currencies make that exact).
  const series = hist.map((p) => ({ d: p.d, v: (p.v / GRAMS_PER_OZ) * (fx ?? 1) }));
  const cutoff30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const series30 = series.filter((p) => p.d >= cutoff30);
  const ch30r = changeOver(series, 30);
  const ch7r = changeOver(series, 7);
  const st30r = stats(series30);
  const toChange = (c: typeof ch30r) => (c ? { pct: c.pct, from: c.from.v, to: c.to.v, fromDate: c.from.d } : null);

  const g24 = rows[0].gram;
  const g22 = rows[1].gram;
  const tola24 = rows[0].tola;

  const title = `Gold rate in ${city.city} today — 24K ${city.currency} ${fmt(g24, dp)}/g, 22K ${city.currency} ${fmt(g22, dp)}/g (${dateLong(gold.asOf)})`;
  const description =
    `Today's gold rate in ${city.city}, ${city.countryName}: 24K ${city.currency} ${fmt(g24, dp)} per gram, 22K ${city.currency} ${fmt(g22, dp)}, ` +
    `1 tola 24K ${city.currency} ${fmt(tola24, dp)}. Spot-based from ${gold.source}, updated ${dateLong(gold.updated)}. Shops add making charges.`;

  const faq = [
    {
      q: `What is the gold rate in ${city.city} today?`,
      a: `The spot-based rate is ${city.currency} ${fmt(g24, dp)} per gram for 24K, ${city.currency} ${fmt(g22, dp)} for 22K, ${city.currency} ${fmt(rows[2].gram, dp)} for 21K and ${city.currency} ${fmt(rows[3].gram, dp)} for 18K. One tola of 24K is ${city.currency} ${fmt(tola24, dp)}. These are calculated from the spot price of ${fmt(gold.usdPerOz, 2)} US dollars per troy ounce on ${dateLong(gold.asOf)}.`,
    },
    {
      q: `Why is the shop price in ${city.city} higher than this?`,
      a: `This page shows the metal only. Jewellers in ${city.countryName} add a making charge (typically 5–20% depending on design), a small premium over spot, and VAT where it applies. Always ask for the gold weight, purity and making charge separately before you pay.`,
    },
    {
      q: "Is 22K better value than 24K?",
      a: `22K is 91.6% gold and 24K is 99.9%. Per gram of actual gold, 24K is slightly cheaper; 22K is harder and is the Gulf standard for jewellery. At today's rate that is ${city.currency} ${fmt(g22, dp)} for 22K against ${city.currency} ${fmt(g24, dp)} for 24K per gram.`,
    },
    {
      q: "How much is 1 tola of gold?",
      a: `One tola is 11.6638 grams. At today's ${city.city} rate that is ${city.currency} ${fmt(tola24, dp)} for 24K and ${city.currency} ${fmt(rows[1].tola, dp)} for 22K.`,
    },
    {
      q: "How often is the gold price updated?",
      a: `The spot price is fetched hourly by a scheduled job and one daily value is stored for the chart. The price on this page was last stored on ${dateLong(gold.updated)}.`,
    },
  ];

  return {
    slug: city.slug,
    city: city.city,
    country: city.country,
    countryName: city.countryName,
    currency: city.currency,
    flag: city.flag,
    primary: city.primary,
    usdPerOz: gold.usdPerOz,
    asOf: gold.asOf,
    updated: gold.updated,
    source: gold.source,
    sourceUrl: gold.sourceUrl,
    live: gold.live,
    fxPerUsd: fx,
    rows,
    usdRows,
    otherCurrencies,
    ch30: toChange(ch30r),
    ch7: toChange(ch7r),
    st30: st30r ? { min: st30r.min, max: st30r.max, avg: st30r.avg } : null,
    series30,
    title,
    description,
    faq,
  };
}

export function isGoldIndexed(city: { primary: boolean }): boolean {
  if (!INDEX.gold) return false;
  // Every city is indexed at launch (Phase 1); flip this to `city.primary` to
  // narrow the set to one city per country and canonicalise the rest.
  return true;
}

export { pct };
