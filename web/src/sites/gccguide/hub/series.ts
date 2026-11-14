/* Pure rate/series math for the Gulf Expat Data Hub.
 *
 * No React, no D1, no clock: everything here is a function of its arguments, so
 * it can be unit-tested with `node --test` (see series.test.ts) and reused by the
 * server components unchanged. If a number is wrong here, every page is wrong —
 * this file is deliberately the only place that does it.
 */

export type Pt = { d: string; v: number };

/** Units of `from` you need to buy 1 `to`… inverted to "1 from = x to". */
export function crossRateOf(usdPerFrom: number | null | undefined, usdPerTo: number | null | undefined): number | null {
  if (!usdPerFrom || !usdPerTo) return null;
  if (!Number.isFinite(usdPerFrom) || !Number.isFinite(usdPerTo)) return null;
  if (usdPerFrom <= 0 || usdPerTo <= 0) return null;
  return usdPerTo / usdPerFrom;
}

/** Align two USD-per-unit series into one pair series (rate = to / from). */
export function joinPair(fromSeries: Pt[], toSeries: Pt[]): Pt[] {
  const to = new Map(toSeries.map((p) => [p.d, p.v]));
  const out: Pt[] = [];
  for (const f of fromSeries) {
    const t = to.get(f.d);
    if (t == null || f.v <= 0 || t <= 0) continue;
    out.push({ d: f.d, v: t / f.v });
  }
  out.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  return out;
}

export type Change = { from: Pt; to: Pt; abs: number; pct: number };

/** Change between the latest point and the point ~`days` before it.
 *  Returns null when the history does not reach back that far — the pages then
 *  say nothing rather than compare against a single day. */
export function changeOver(points: Pt[], days: number): Change | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const cutoff = new Date(new Date(`${last.d}T00:00:00Z`).getTime() - days * 864e5).toISOString().slice(0, 10);
  // Closest sample at or before the cutoff (history is sampled, not always daily).
  let base: Pt | null = null;
  for (const p of points) {
    if (p.d <= cutoff) base = p;
    else break;
  }
  if (!base) return null;
  if (base.v <= 0) return null;
  return { from: base, to: last, abs: last.v - base.v, pct: (last.v / base.v - 1) * 100 };
}

/** Min / max / mean of a series, with the points that carry them. */
export function stats(points: Pt[]): { min: Pt; max: Pt; avg: number; n: number } | null {
  if (!points.length) return null;
  let min = points[0];
  let max = points[0];
  let sum = 0;
  for (const p of points) {
    if (p.v < min.v) min = p;
    if (p.v > max.v) max = p;
    sum += p.v;
  }
  return { min, max, avg: sum / points.length, n: points.length };
}

/** Downsample to at most `max` points, always keeping the first and the last.
 *  Keeps an SVG path short enough to stay inside the Workers CPU budget. */
export function thin(points: Pt[], max: number): Pt[] {
  if (points.length <= max || max < 3) return points;
  const step = (points.length - 1) / (max - 1);
  const out: Pt[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  out[out.length - 1] = points[points.length - 1];
  return out;
}

/** SVG path strings for a sparkline/trend line inside a w×h box. */
export function toPath(points: Pt[], w: number, h: number, pad = 2): { line: string; area: string; min: number; max: number } | null {
  if (points.length < 2) return null;
  const vs = points.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const span = max - min || max || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - pad * 2);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${h - pad} L${x(0).toFixed(1)},${h - pad} Z`;
  return { line, area, min, max };
}

/** How many decimal places a rate needs to stay meaningful (KWD needs more than IDR). */
export function dpFor(v: number): number {
  if (!Number.isFinite(v)) return 2;
  if (v >= 1000) return 0;
  if (v >= 100) return 2;
  if (v >= 1) return 4;
  if (v >= 0.01) return 5;
  return 6;
}
