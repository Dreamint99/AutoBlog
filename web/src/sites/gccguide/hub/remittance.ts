import "server-only";
import { d1, cachedRead } from "@/lib/data";
import { GULF_CURRENCIES, QUOTE_CURRENCIES, QUOTE_NAME, QUOTE_COUNTRY, GULF_NAME } from "./config";
import {
  reportMonths,
  pairSeries,
  pairMonth,
  last12,
  monthLabel,
  shiftYm,
  moveWords,
  isYm,
  type Pt,
  type ReportMonth,
  type PairMonth,
} from "./remittance-math";
import { fmt, dateLong } from "./format";
import { dpFor } from "./series";

/* Monthly Remittance Report — view models.
 *
 * Built on request from D1 `gcc_fx_daily` (USD-based, weekly samples since
 * 20 Nov 2025, daily since 15 Oct 2026). No hand-written copy and no LLM: every
 * sentence below is a template filled from the month's own numbers, and the same
 * builder feeds the HTML and the JSON-LD.
 */

/** Gulf → home corridors. The majors (USD/EUR/GBP) are left out: this is about money sent home. */
export const RECEIVING = QUOTE_CURRENCIES.filter((q) => !["USD", "EUR", "GBP"].includes(q.code)).map((q) => q.code as string);
export const GULF = GULF_CURRENCIES.map((g) => g.code as string);

/** The corridors the summary leads with (largest Gulf remittance flows). */
const HEADLINE: [string, string][] = [
  ["AED", "INR"],
  ["SAR", "PKR"],
  ["QAR", "BDT"],
  ["AED", "PHP"],
  ["KWD", "INR"],
];

export const LEAD_PAIR: [string, string] = ["AED", "INR"];
export const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

const SOURCE_INFO: Record<string, { name: string; url: string }> = {
  "currency-api": { name: "fawazahmed0/currency-api (CC0)", url: "https://github.com/fawazahmed0/currency-api" },
  "open.er-api.com": { name: "ExchangeRate-API open access (open.er-api.com)", url: "https://www.exchangerate-api.com/docs/free" },
};

type Row = { c: string; d: string; r: number; s: string };
export type FxData = { byCur: Map<string, Pt[]>; dates: string[]; sources: { key: string; from: string; to: string }[] };

async function loadAll(): Promise<FxData | null> {
  const db = d1();
  if (!db) return null;
  const codes = [...GULF, ...RECEIVING];
  try {
    const rows = await cachedRead<Row[]>("gcc/fx/remit-all", 3600, async () => {
      const { results } = await db
        .prepare(`SELECT currency AS c, d, rate AS r, source AS s FROM gcc_fx_daily WHERE currency IN (${codes.map(() => "?").join(",")}) ORDER BY d ASC`)
        .bind(...codes)
        .all<Row>();
      return (results ?? []).map((x) => ({ c: String(x.c), d: String(x.d), r: Number(x.r), s: String(x.s) }));
    });
    if (!rows.length) return null;
    const byCur = new Map<string, Pt[]>();
    const dates = new Set<string>();
    const src = new Map<string, { from: string; to: string }>();
    for (const x of rows) {
      if (!(x.r > 0)) continue;
      let a = byCur.get(x.c);
      if (!a) byCur.set(x.c, (a = []));
      a.push({ d: x.d, v: x.r });
      dates.add(x.d);
      const s = src.get(x.s);
      if (!s) src.set(x.s, { from: x.d, to: x.d });
      else {
        if (x.d < s.from) s.from = x.d;
        if (x.d > s.to) s.to = x.d;
      }
    }
    return {
      byCur,
      dates: [...dates].sort(),
      sources: [...src.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => (a.from < b.from ? -1 : 1)),
    };
  } catch {
    return null;
  }
}

export function pairOf(data: FxData, from: string, to: string): Pt[] {
  return pairSeries(data.byCur.get(from) ?? [], data.byCur.get(to) ?? []);
}

export function nameOf(code: string): string {
  return QUOTE_NAME[code] ?? GULF_CURRENCIES.find((g) => g.code === code)?.name ?? code;
}

export function sourceInfo(key: string) {
  return SOURCE_INFO[key] ?? { name: key, url: "" };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ── Hub ──────────────────────────────────────────────────────────────────── */

export type HubItem = ReportMonth & { label: string; lead: PairMonth | null };

export async function buildRemitHub(): Promise<{ items: HubItem[]; data: FxData } | null> {
  const data = await loadAll();
  if (!data) return null;
  const lead = pairOf(data, LEAD_PAIR[0], LEAD_PAIR[1]);
  const items = reportMonths(data.dates, today()).map((m) => ({ ...m, label: monthLabel(m.ym), lead: pairMonth(lead, m.ym) }));
  return { items, data };
}

/* ── One month ────────────────────────────────────────────────────────────── */

export type CorridorRow = { to: string; name: string; country: string; pm: PairMonth; dp: number };
export type GulfBlock = { code: string; name: string; country: string; rows: CorridorRow[] };

export type MonthReport = {
  ym: string;
  label: string;
  complete: boolean;
  lastDate: string;
  prevLabel: string;
  yearLabel: string;
  newer: string | null;
  older: string | null;
  blocks: GulfBlock[];
  summary: string[];
  title: string;
  description: string;
  chart: { from: string; to: string; points: Pt[]; dp: number };
  sourcesUsed: { name: string; url: string; from: string; to: string }[];
  coverageStart: string;
  coverageEnd: string;
  published: string;
  sampling: string;
};

function sentenceFor(r: PairMonth, from: string, to: string, label: string, complete: boolean, prevLabel: string, yearLabel: string, first: boolean): string {
  const dp = dpFor(r.end.v);
  const lead = first
    ? complete
      ? `In ${label}, 1 ${from} bought ${fmt(r.end.v, dp)} ${to} at month-end`
      : `So far in ${label} (to ${dateLong(r.end.d)}), 1 ${from} buys ${fmt(r.end.v, dp)} ${to}`
    : `1 ${from} ${complete ? "bought" : "buys"} ${fmt(r.end.v, dp)} ${to}`;
  const parts: string[] = [];
  if (r.chPrev != null) parts.push(`${moveWords(r.chPrev)} from the end of ${prevLabel}`);
  if (r.chYear != null) parts.push(`${moveWords(r.chYear)} from ${yearLabel}`);
  return `${lead}${parts.length ? `, ${parts.join(" and ")}` : ""}.`;
}

export async function buildMonthReport(ym: string): Promise<MonthReport | null> {
  if (!isYm(ym)) return null;
  const data = await loadAll();
  if (!data) return null;
  const months = reportMonths(data.dates, today());
  const idx = months.findIndex((m) => m.ym === ym);
  if (idx < 0) return null;
  const m = months[idx];
  const label = monthLabel(ym);
  const prevLabel = monthLabel(shiftYm(ym, -1));
  const yearLabel = monthLabel(shiftYm(ym, -12));

  const blocks: GulfBlock[] = GULF_CURRENCIES.map((g) => ({
    code: g.code,
    name: g.name,
    country: g.short,
    rows: RECEIVING.flatMap((to) => {
      const pm = pairMonth(pairOf(data, g.code, to), ym);
      return pm ? [{ to, name: QUOTE_NAME[to] ?? to, country: QUOTE_COUNTRY[to] ?? "", pm, dp: dpFor(pm.end.v) }] : [];
    }),
  })).filter((b) => b.rows.length);

  // Lead paragraph: headline corridors, then the biggest movers (AED basis — the
  // five pegged Gulf currencies move identically in % terms).
  const summary: string[] = [];
  const corridor: string[] = [];
  for (const [f, t] of HEADLINE) {
    const pm = blocks.find((b) => b.code === f)?.rows.find((r) => r.to === t)?.pm;
    if (pm) corridor.push(sentenceFor(pm, f, t, label, m.complete, prevLabel, yearLabel, !corridor.length));
  }
  if (corridor.length) summary.push(corridor.join(" "));

  const aed = blocks.find((b) => b.code === "AED");
  const moved = (aed?.rows ?? []).filter((r) => r.pm.chPrev != null).sort((a, b) => b.pm.chPrev! - a.pm.chPrev!);
  if (moved.length >= 2) {
    const up = moved[0];
    const down = moved[moved.length - 1];
    const s: string[] = [];
    if (up.pm.chPrev! > 0.005)
      s.push(
        `Against ${prevLabel}, the best-performing corridor for senders was the ${up.name}: a Gulf salary bought ${Math.abs(up.pm.chPrev!).toFixed(2)}% more ${up.to}.`,
      );
    if (down.pm.chPrev! < -0.005)
      s.push(`The ${down.name} moved the other way: a Gulf salary bought ${Math.abs(down.pm.chPrev!).toFixed(2)}% less ${down.to}.`);
    const flat = moved.filter((r) => Math.abs(r.pm.chPrev!) < 0.5).length;
    s.push(`${flat === 0 ? "None" : flat} of the ${moved.length} home currencies tracked moved less than 0.5% in either direction.`);
    summary.push(s.join(" "));
  }
  const kwd = blocks.find((b) => b.code === "KWD")?.rows.find((r) => r.to === "INR")?.pm;
  const aedInr = aed?.rows.find((r) => r.to === "INR")?.pm;
  summary.push(
    `The UAE dirham, Saudi and Qatari riyals, Omani rial and Bahraini dinar are pegged to the US dollar, so their percentage moves are identical; the Kuwaiti dinar is pegged to an undisclosed basket` +
      (kwd?.chPrev != null && aedInr?.chPrev != null && Math.abs(kwd.chPrev - aedInr.chPrev) >= 0.05
        ? `, which is why KWD→INR moved ${moveWords(kwd.chPrev)} against ${prevLabel} while AED→INR moved ${moveWords(aedInr.chPrev)}.`
        : kwd?.chYear != null && aedInr?.chYear != null && Math.abs(kwd.chYear - aedInr.chYear) >= 0.05
          ? `, which is why over twelve months KWD→INR is ${moveWords(kwd.chYear)} while AED→INR is ${moveWords(aedInr.chYear)}.`
          : "."),
  );

  const lead = pairOf(data, LEAD_PAIR[0], LEAD_PAIR[1]);
  const chartPts = last12(lead, ym);
  const leadPm = aedInr;

  const qarBdt = blocks.find((b) => b.code === "QAR")?.rows.find((r) => r.to === "BDT")?.pm;
  const title = `QAR to BDT, AED to INR, SAR to PKR Remittance Rates Report — ${label}${m.complete ? "" : " (so far)"} | GCCGuide`;
  const description =
    (leadPm
      ? `${m.complete ? `In ${label}` : `So far in ${label}`}, 1 AED ${m.complete ? "bought" : "buys"} ${fmt(leadPm.end.v, dpFor(leadPm.end.v))} INR` +
        (qarBdt ? ` and 1 QAR ${fmt(qarBdt.end.v, dpFor(qarBdt.end.v))} BDT` : "") +
        ". "
      : "") + `Month-end rates, monthly and yearly change, highs, lows and the best week to send for 66 Gulf corridors.`;

  const mPts = data.dates.filter((d) => d.startsWith(ym));
  const sampling = mPts.length > 6 ? "daily" : mPts.length ? "weekly" : "";
  const used = data.sources.filter((s) => s.from <= m.lastDate && s.to >= `${ym}-01`);
  const yrFrom = data.dates.find((d) => d >= `${shiftYm(ym, -12)}-01`) ?? data.dates[0];

  return {
    ym,
    label,
    complete: m.complete,
    lastDate: m.lastDate,
    prevLabel,
    yearLabel,
    newer: idx > 0 ? months[idx - 1].ym : null,
    older: idx < months.length - 1 ? months[idx + 1].ym : null,
    blocks,
    summary,
    title,
    description,
    chart: { from: LEAD_PAIR[0], to: LEAD_PAIR[1], points: chartPts, dp: chartPts.length ? dpFor(chartPts[chartPts.length - 1].v) : 2 },
    sourcesUsed: used.map((s) => ({ ...sourceInfo(s.key), from: s.from, to: s.to })),
    coverageStart: yrFrom,
    coverageEnd: m.lastDate,
    // A complete month's report is "published" on the 1st of the next month.
    published: m.complete ? `${shiftYm(ym, 1)}-01` : `${ym}-01`,
    sampling,
  };
}

/* ── Embed ────────────────────────────────────────────────────────────────── */

export function parseEmbedPair(slug: string): { from: string; to: string } | null {
  const m = /^([a-z]{3})-to-([a-z]{3})$/.exec(slug.toLowerCase());
  if (!m) return null;
  const from = m[1].toUpperCase();
  const to = m[2].toUpperCase();
  if (!GULF.includes(from) || !RECEIVING.includes(to)) return null;
  return { from, to };
}

export async function buildEmbed(from: string, to: string, ym?: string | null) {
  const data = await loadAll();
  if (!data) return null;
  const months = reportMonths(data.dates, today());
  const target = ym && months.some((m) => m.ym === ym) ? ym : months[0]?.ym;
  if (!target) return null;
  const series = pairOf(data, from, to);
  const pm = pairMonth(series, target);
  if (!pm) return null;
  const m = months.find((x) => x.ym === target)!;
  return {
    from,
    to,
    fromName: GULF_NAME[from] ?? from,
    toName: QUOTE_NAME[to] ?? to,
    ym: target,
    label: monthLabel(target),
    complete: m.complete,
    pm,
    points: last12(series, target),
    dp: dpFor(pm.end.v),
  };
}
