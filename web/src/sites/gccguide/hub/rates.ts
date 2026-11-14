import "server-only";
import { getFxSnapshot, getFxHistory, crossRate, usdPer, type FxSnapshot } from "@/lib/gcc";
import { GULF_CURRENCIES, QUOTE_CURRENCIES, QUOTE_NAME, GULF_NAME } from "./config";
import { changeOver, joinPair, stats, dpFor, type Pt, type Change } from "./series";
import { dateLong, fmt, pct } from "./format";

/* View models for the rate pages.
 *
 * One builder feeds BOTH the HTML and the structured data, so the FAQ text in the
 * JSON-LD is literally the FAQ text on the page — Google requires structured data
 * to mirror visible content, and this makes that impossible to get wrong.
 *
 * Every sentence is assembled from this page's own numbers (current rate, 30-day
 * range, week/month/year change), which is what keeps 168 pair pages from reading
 * like 168 copies of the same template.
 */

export type Pair = { from: string; to: string; reverse: boolean; canonical: string };

/** The five hard USD pegs. These are treaty-level facts, not feed values. */
const PEGS: Record<string, number> = { AED: 3.6725, SAR: 3.75, QAR: 3.64, OMR: 0.3845, BHD: 0.376 };

/** Accepts /rates/aed-to-inr and /rates/inr-to-aed. Returns null for anything
 *  outside the curated catalogue (so we never publish a pair no one searches). */
export function parsePair(pairSlug: string): Pair | null {
  const m = /^([a-z]{3})-to-([a-z]{3})$/.exec(pairSlug.toLowerCase());
  if (!m) return null;
  const A = m[1].toUpperCase();
  const B = m[2].toUpperCase();
  if (A === B) return null;
  const gulf = (c: string) => GULF_CURRENCIES.some((g) => g.code === c);
  const quote = (c: string) => QUOTE_CURRENCIES.some((q) => q.code === c);
  if (gulf(A) && (quote(B) || gulf(B))) {
    return { from: A, to: B, reverse: false, canonical: `/rates/${A.toLowerCase()}-to-${B.toLowerCase()}` };
  }
  if (quote(A) && gulf(B)) {
    return { from: A, to: B, reverse: true, canonical: `/rates/${B.toLowerCase()}-to-${A.toLowerCase()}` };
  }
  return null;
}

export function pairSlug(from: string, to: string): string {
  return `${from.toLowerCase()}-to-${to.toLowerCase()}`;
}

export type RateView = {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  reverse: boolean;
  canonical: string;
  rate: number | null;
  dp: number;
  headline: string;
  updated: string;
  asOf: string;
  source: string;
  sourceUrl: string;
  live: boolean;
  series30: Pt[];
  series365: Pt[];
  ch7: Change | null;
  ch30: Change | null;
  ch365: Change | null;
  st30: { min: Pt; max: Pt; avg: number; n: number } | null;
  peg: number | null;
  /** Gulf currency → the six most-sent quote currencies, same snapshot. */
  matrix: { code: string; name: string; values: (number | null)[] }[];
  title: string;
  description: string;
  intro: string;
  moveSentence: string;
  faq: { q: string; a: string }[];
};

function nameOf(code: string): string {
  return GULF_NAME[code] ?? QUOTE_NAME[code] ?? code;
}

export async function buildRateView(pair: Pair): Promise<RateView | null> {
  const snap: FxSnapshot = await getFxSnapshot();
  const rate = crossRate(snap, pair.from, pair.to);
  if (rate == null) return null;

  const [hf, ht] = await Promise.all([getFxHistory(pair.from, 366), getFxHistory(pair.to, 366)]);
  const series365 = joinPair(hf, ht);
  const cutoff30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const series30 = series365.filter((p) => p.d >= cutoff30);
  const ch7 = changeOver(series365, 7);
  const ch30 = changeOver(series365, 30);
  const ch365 = changeOver(series365, 365);
  const st30 = stats(series30);
  const dp = dpFor(rate);

  const asOf = snap.updated.slice(0, 10);
  const fromName = nameOf(pair.from);
  const toName = nameOf(pair.to);
  const headline = `1 ${pair.from} = ${fmt(rate, dp)} ${pair.to}`;
  const peg = PEGS[pair.from] ?? null;

  const title = `${pair.from} to ${pair.to} today: 1 ${pair.from} = ${fmt(rate, dp)} ${pair.to} (${dateLong(asOf)})`;

  const description =
    `Live ${pair.from}/${pair.to} rate on ${dateLong(asOf)}: 1 ${pair.from} = ${fmt(rate, dp)} ${pair.to}. ` +
    (ch30 ? `That is ${pct(ch30.pct)} ${ch30.pct >= 0 ? "higher" : "lower"} than 30 days ago. ` : "") +
    `30-day and 1-year charts, a full amount table and what moves this pair. Source: ${snap.byCode[pair.from]?.source ?? "live feed"}.`;

  const intro = peg
    ? `The ${fromName} is pegged at ${peg} to the US dollar, so ${pair.from}→${pair.to} changes only when the ${toName} moves against the dollar — the ${pair.from} side of this rate is fixed by law.`
    : `The ${fromName} floats, so this pair reflects two moving dollar crosses: ${pair.from} and ${toName}.`;

  const moveSentence = st30
    ? `Over the last 30 days the ${pair.from}/${pair.to} rate has ranged from ${fmt(st30.min.v, dp)} to ${fmt(st30.max.v, dp)} ${pair.to}, averaging ${fmt(st30.avg, dp)}. ` +
      (ch7 ? `A week ago it was ${fmt(ch7.from.v, dp)} (${pct(ch7.pct)}). ` : "") +
      (ch30 ? `A month ago it was ${fmt(ch30.from.v, dp)} (${pct(ch30.pct)}). ` : "") +
      (ch365 ? `A year ago it was ${fmt(ch365.from.v, dp)} (${pct(ch365.pct)}).` : "")
    : `This pair has been tracked since ${dateLong(asOf)}. The 30-day range and the week/month/year sentences appear automatically once there are at least two days of history — until then the page shows today's rate only. Today: ${headline}.`;

  const quotes6 = QUOTE_CURRENCIES.slice(0, 6);
  const matrix = GULF_CURRENCIES.map((g) => ({
    code: g.code,
    name: g.short,
    values: quotes6.map((q) => crossRate(snap, g.code, q.code)),
  }));

  const faq: { q: string; a: string }[] = [
    {
      q: `How much is 1 ${pair.from} in ${pair.to} today?`,
      a: `1 ${pair.from} = ${fmt(rate, dp)} ${pair.to} at the mid-market rate on ${dateLong(asOf)}. This is a reference rate, not a cash rate: banks and exchange houses in the Gulf typically add a margin of 0.5–2%, so the amount you actually receive will be slightly lower.`,
    },
    {
      q: `What is ${fmt(rate, dp)} ${pair.to} in ${pair.from}?`,
      a: `The inverse is 1 ${pair.to} = ${fmt(1 / rate, dpFor(1 / rate))} ${pair.from}. The full reverse table is on this page, and the reverse direction has its own page linked at the bottom.`,
    },
    {
      q: `Is the ${pair.from}/${pair.to} rate fixed?`,
      a: peg
        ? `Only one side is fixed. The ${fromName} is pegged at ${peg} per US dollar, so the ${pair.from} does not move on its own. Everything you see here is the ${toName} moving.`
        : `No. Both ${pair.from} and ${pair.to} float against the US dollar, so this rate changes every trading day.`,
    },
    {
      q: "Who sets this rate?",
      a: `This is the mid-market rate published by ${snap.byCode[pair.from]?.source ?? "the live feed"} and stored three times a day. No bank is obliged to trade at it.`,
    },
    {
      q: "When is the rate updated?",
      a: `The job that stores the rate runs at 02:00, 10:00 and 18:00 UTC. The figure on this page was last stored on ${dateLong(snap.updated)}; the source's own timestamp is printed with the source line.`,
    },
  ];

  return {
    from: pair.from,
    to: pair.to,
    fromName,
    toName,
    reverse: pair.reverse,
    canonical: pair.canonical,
    rate,
    dp,
    headline,
    updated: snap.updated,
    asOf,
    source: snap.byCode[pair.from]?.source ?? "live FX feed",
    sourceUrl: snap.byCode[pair.from]?.sourceUrl ?? "https://open.er-api.com/v6/latest/USD",
    live: snap.live,
    series30,
    series365,
    ch7,
    ch30,
    ch365,
    st30,
    peg,
    matrix,
    title,
    description,
    intro,
    moveSentence,
    faq,
  };
}

/* ── Hub index (/rates) ───────────────────────────────────────────────────── */

export type RateHub = {
  updated: string;
  asOf: string;
  source: string;
  live: boolean;
  rows: { code: string; name: string; usd: number | null; toInr: number | null; toPkr: number | null; toBdt: number | null; toPhp: number | null }[];
  featured: { label: string; href: string; value: string; sub: string }[];
};

export async function buildRateHub(): Promise<RateHub> {
  const snap = await getFxSnapshot();
  const rows = GULF_CURRENCIES.map((g) => ({
    code: g.code,
    name: g.name,
    usd: usdPer(snap, g.code),
    toInr: crossRate(snap, g.code, "INR"),
    toPkr: crossRate(snap, g.code, "PKR"),
    toBdt: crossRate(snap, g.code, "BDT"),
    toPhp: crossRate(snap, g.code, "PHP"),
  }));
  const featured = ["AED", "SAR", "KWD", "OMR"].map((code) => {
    const r = crossRate(snap, code, "INR");
    return {
      label: `${code} → INR`,
      href: `/rates/${pairSlug(code, "INR")}`,
      value: r == null ? "—" : fmt(r, dpFor(r)),
      sub: "Indian rupee",
    };
  });
  return {
    updated: snap.updated,
    asOf: snap.updated.slice(0, 10),
    source: snap.byCode.AED?.source ?? "live FX feed",
    live: snap.live,
    rows,
    featured,
  };
}
