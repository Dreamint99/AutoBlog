import "server-only";
import { d1, cachedRead } from "@/lib/data";
import seed from "@/sites/gccguide/hub/seed.json";

/* Data access for the Gulf Expat Data Hub (gccguide).
 *
 * Reads the shared D1 database through the same binding/pattern as the rest of
 * the network (web/src/lib/data.ts): slim queries, Cache API with a fresh window
 * and stale-on-error. Every function returns null instead of throwing, so one
 * missing table can never take a page down — the pages then show an honest
 * "data temporarily unavailable" line rather than a 500.
 *
 * If D1 has no rows (local design work, or before the first cron run) the site
 * falls back to seed.json: a dated, real snapshot captured at build time. The
 * page prints the seed's own date, so a stale page never claims to be live.
 */

export type FxRow = {
  code: string;
  /** units of this currency per 1 USD */
  rate: number;
  source: string;
  sourceUrl: string;
  asof: string;
  fetchedAt: string;
};

export type FxSnapshot = {
  byCode: Record<string, FxRow>;
  updated: string;
  /** true when the numbers come from D1; false when they are the bundled seed */
  live: boolean;
};

const SEED_UPDATED = (seed as { captured_at: string }).captured_at;

function fromSeed(): FxSnapshot {
  const s = seed as { captured_at: string; fx: Record<string, number>; fx_source: string };
  const byCode: Record<string, FxRow> = {};
  for (const [code, rate] of Object.entries(s.fx)) {
    byCode[code] = {
      code,
      rate,
      source: s.fx_source,
      sourceUrl: "https://open.er-api.com/v6/latest/USD",
      asof: s.captured_at,
      fetchedAt: s.captured_at,
    };
  }
  return { byCode, updated: s.captured_at, live: false };
}

const FRESH = 15 * 60; // 15 min — the cron writes 3×/day, the edge cache in front adds up to 30 min

export async function getFxSnapshot(): Promise<FxSnapshot> {
  const db = d1();
  if (!db) return fromSeed();
  try {
    const rows = await cachedRead<FxRow[]>("gcc/fx/snapshot", FRESH, async () => {
      const { results } = await db
        .prepare("SELECT currency, rate, source, source_url, asof, fetched_at FROM gcc_fx_rate")
        .all<Record<string, unknown>>();
      return (results ?? []).map((r) => ({
        code: String(r.currency),
        rate: Number(r.rate),
        source: String(r.source),
        sourceUrl: String(r.source_url),
        asof: String(r.asof),
        fetchedAt: String(r.fetched_at),
      }));
    });
    if (!rows.length) return fromSeed();
    const byCode: Record<string, FxRow> = {};
    let updated = "";
    for (const r of rows) {
      byCode[r.code] = r;
      if (r.fetchedAt > updated) updated = r.fetchedAt;
    }
    return { byCode, updated, live: true };
  } catch {
    return fromSeed();
  }
}

/** Units of `code` per 1 USD, or null when the feed has no usable rate. */
export function usdPer(snap: FxSnapshot, code: string): number | null {
  const r = snap.byCode[code]?.rate;
  return typeof r === "number" && Number.isFinite(r) && r > 0 ? r : null;
}

/** How many `to` you get for 1 `from`. */
export function crossRate(snap: FxSnapshot, from: string, to: string): number | null {
  if (from === to) return 1;
  const a = usdPer(snap, from);
  const b = usdPer(snap, to);
  if (!a || !b) return null;
  return b / a;
}

export type Point = { d: string; v: number };

/** Daily history for one currency (units per USD), ascending. Empty when the job
 *  has not accumulated history yet — charts then hide instead of inventing. */
export async function getFxHistory(code: string, days = 366): Promise<Point[]> {
  const db = d1();
  if (!db) return [];
  const from = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  try {
    return await cachedRead<Point[]>(`gcc/fx/hist/${code}/${days}`, 3600, async () => {
      const { results } = await db
        .prepare("SELECT d, rate FROM gcc_fx_daily WHERE currency = ? AND d >= ? ORDER BY d ASC")
        .bind(code, from)
        .all<{ d: string; rate: number }>();
      return (results ?? []).map((r) => ({ d: String(r.d), v: Number(r.rate) }));
    });
  } catch {
    return [];
  }
}

export type Gold = { usdPerOz: number; source: string; sourceUrl: string; asOf: string; updated: string; live: boolean };

export async function getGold(): Promise<Gold> {
  const s = seed as { captured_at: string; gold_usd_per_oz: number };
  const fallback: Gold = {
    usdPerOz: s.gold_usd_per_oz,
    source: "gold-api.com",
    sourceUrl: "https://api.gold-api.com/price/XAU",
    asOf: s.captured_at,
    updated: s.captured_at,
    live: false,
  };
  const db = d1();
  if (!db) return fallback;
  try {
    const row = await cachedRead<Record<string, unknown> | null>("gcc/gold/spot", FRESH, async () => {
      const { results } = await db
        .prepare("SELECT usd_per_oz, source, source_url, asof, fetched_at FROM gcc_gold_spot WHERE id = 1")
        .all<Record<string, unknown>>();
      return results?.[0] ?? null;
    });
    if (!row) return fallback;
    return {
      usdPerOz: Number(row.usd_per_oz),
      source: String(row.source),
      sourceUrl: String(row.source_url),
      asOf: String(row.asof),
      updated: String(row.fetched_at),
      live: true,
    };
  } catch {
    return fallback;
  }
}

export async function getGoldHistory(days = 366): Promise<Point[]> {
  const db = d1();
  if (!db) return [];
  const from = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  try {
    return await cachedRead<Point[]>(`gcc/gold/hist/${days}`, 3600, async () => {
      const { results } = await db
        .prepare("SELECT d, usd_per_oz FROM gcc_gold_daily WHERE d >= ? ORDER BY d ASC")
        .bind(from)
        .all<{ d: string; usd_per_oz: number }>();
      return (results ?? []).map((r) => ({ d: String(r.d), v: Number(r.usd_per_oz) }));
    });
  } catch {
    return [];
  }
}

/* ── Per-page index overrides (gcc_page_flag) ─────────────────────────────── */
let flagCache: { at: number; map: Map<string, boolean> } | null = null;

/** Reviewer-set override for one path: true = index, false = noindex, null = use the rule. */
export async function indexOverride(path: string): Promise<boolean | null> {
  const db = d1();
  if (!db) return null;
  if (!flagCache || Date.now() - flagCache.at > 3600_000) {
    try {
      const { results } = await db.prepare("SELECT url, seo_index FROM gcc_page_flag").all<{ url: string; seo_index: number }>();
      flagCache = { at: Date.now(), map: new Map((results ?? []).map((r) => [String(r.url), Boolean(r.seo_index)])) };
    } catch {
      return null;
    }
  }
  return flagCache.map.get(path) ?? null;
}
