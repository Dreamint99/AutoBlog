/* Pure month/report math for the Monthly Remittance Report.
 *
 * No React, no D1, no clock: every function takes the stored USD-based series
 * and returns numbers, so it can be unit-tested with
 *   cd web && node --test src/sites/gccguide/hub/remittance-math.test.ts
 * and the pages can never say something the data does not.
 */

export type Pt = { d: string; v: number };

export type ReportMonth = {
  /** "2026-10" */
  ym: string;
  /** false = the current month, reported "so far" */
  complete: boolean;
  /** last data date inside the month */
  lastDate: string;
};

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "2026-10" shifted by `k` months (negative = earlier). */
export function shiftYm(ym: string, k: number): string {
  const [y, m] = ym.split("-").map(Number);
  const t = y * 12 + (m - 1) + k;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

export function isYm(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

/** Every month the data fully covers (first sample in the first week, last in
 *  the last ~10 days), plus the current month as "so far". Newest first. */
export function reportMonths(dates: string[], today: string): ReportMonth[] {
  const cur = today.slice(0, 7);
  const span = new Map<string, { min: string; max: string }>();
  for (const d of dates) {
    const ym = d.slice(0, 7);
    const s = span.get(ym);
    if (!s) span.set(ym, { min: d, max: d });
    else {
      if (d < s.min) s.min = d;
      if (d > s.max) s.max = d;
    }
  }
  const out: ReportMonth[] = [];
  for (const [ym, s] of span) {
    if (ym > cur) continue;
    if (ym === cur) {
      out.push({ ym, complete: false, lastDate: s.max });
      continue;
    }
    // Weekly sampling: a full month has a sample on or before the 7th and one on or after the 22nd.
    if (Number(s.min.slice(8, 10)) <= 7 && Number(s.max.slice(8, 10)) >= 22) out.push({ ym, complete: true, lastDate: s.max });
  }
  return out.sort((a, b) => (a.ym < b.ym ? 1 : -1));
}

/** Align two USD-per-unit series into one pair series (1 from = v to). */
export function pairSeries(fromUsd: Pt[], toUsd: Pt[]): Pt[] {
  const to = new Map(toUsd.map((p) => [p.d, p.v]));
  const out: Pt[] = [];
  for (const f of fromUsd) {
    const t = to.get(f.d);
    if (t == null || !(f.v > 0) || !(t > 0)) continue;
    out.push({ d: f.d, v: t / f.v });
  }
  return out.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
}

export function inMonth(series: Pt[], ym: string): Pt[] {
  return series.filter((p) => p.d.startsWith(ym));
}

/** Last sample of a month, or null when that month has no data. */
export function monthEnd(series: Pt[], ym: string): Pt | null {
  const m = inMonth(series, ym);
  return m.length ? m[m.length - 1] : null;
}

/** Monday of the ISO week a date falls in. */
function mondayOf(d: string): string {
  const t = new Date(`${d}T00:00:00Z`);
  const dow = (t.getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(t.getTime() - dow * 864e5).toISOString().slice(0, 10);
}

export type BestWeek = { start: string; end: string; avg: number; n: number };

/** The Monday–Sunday week (clipped to the month) with the highest average rate:
 *  for a sender, more home currency per Gulf unit is the better week. */
export function bestWeek(monthPts: Pt[], ym: string): BestWeek | null {
  if (!monthPts.length) return null;
  const groups = new Map<string, Pt[]>();
  for (const p of monthPts) {
    const k = mondayOf(p.d);
    const g = groups.get(k);
    if (g) g.push(p);
    else groups.set(k, [p]);
  }
  const [y, m] = ym.split("-").map(Number);
  const first = `${ym}-01`;
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  let best: BestWeek | null = null;
  for (const [mon, pts] of groups) {
    const avg = pts.reduce((s, p) => s + p.v, 0) / pts.length;
    const sun = new Date(new Date(`${mon}T00:00:00Z`).getTime() + 6 * 864e5).toISOString().slice(0, 10);
    const w: BestWeek = { start: mon < first ? first : mon, end: sun > last ? last : sun, avg, n: pts.length };
    if (!best || avg > best.avg) best = w;
  }
  return best;
}

export type PairMonth = {
  end: Pt;
  high: Pt;
  low: Pt;
  n: number;
  prev: Pt | null;
  chPrev: number | null;
  yearAgo: Pt | null;
  chYear: number | null;
  best: BestWeek | null;
};

const pctChange = (a: Pt | null, b: Pt): number | null => (a && a.v > 0 ? (b.v / a.v - 1) * 100 : null);

/** Everything the report says about one pair in one month. */
export function pairMonth(series: Pt[], ym: string): PairMonth | null {
  const pts = inMonth(series, ym);
  if (!pts.length) return null;
  let high = pts[0];
  let low = pts[0];
  for (const p of pts) {
    if (p.v > high.v) high = p;
    if (p.v < low.v) low = p;
  }
  const end = pts[pts.length - 1];
  const prev = monthEnd(series, shiftYm(ym, -1));
  const yearAgo = monthEnd(series, shiftYm(ym, -12));
  return {
    end,
    high,
    low,
    n: pts.length,
    prev,
    chPrev: pctChange(prev, end),
    yearAgo,
    chYear: pctChange(yearAgo, end),
    best: bestWeek(pts, ym),
  };
}

/** The 12 months ending with `ym` (inclusive), all samples. */
export function last12(series: Pt[], ym: string): Pt[] {
  const from = `${shiftYm(ym, -11)}-01`;
  const to = `${ym}-31`;
  return series.filter((p) => p.d >= from && p.d <= to);
}

/** One point per month (the month-end sample) for the 12 months ending with `ym`. */
export function monthEnds12(series: Pt[], ym: string): Pt[] {
  const out: Pt[] = [];
  for (let k = -11; k <= 0; k++) {
    const e = monthEnd(series, shiftYm(ym, k));
    if (e) out.push(e);
  }
  return out;
}

/** "up 0.42%" / "down 1.10%" / "unchanged" — for template sentences. */
export function moveWords(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "";
  if (Math.abs(pct) < 0.005) return "unchanged";
  return `${pct > 0 ? "up" : "down"} ${Math.abs(pct).toFixed(2)}%`;
}
