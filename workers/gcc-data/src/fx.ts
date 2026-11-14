/* Currency rates job.
 *
 * Source: open.er-api.com v6 (free, no key, USD base, 166 currencies, daily
 * refresh — https://www.exchangerate-api.com/docs/free). Fallback:
 * @fawazahmed0/currency-api on jsDelivr (CC0, no key).
 *
 * Why not ECB/Frankfurter: the ECB reference list has no AED/SAR/QAR/OMR/BHD/KWD.
 * Why a peg check: five of the six Gulf currencies are hard USD pegs. If a feed
 * suddenly reports AED at 4.20, the feed is broken, not the dirham — we keep the
 * last good value and log it instead of publishing a wrong number.
 */

import { ymd, iso, fetchJson, type D1Database } from "./shared";

export const PEGGED: Record<string, number> = {
  AED: 3.6725,
  SAR: 3.75,
  QAR: 3.64,
  OMR: 0.3845,
  BHD: 0.376,
};

/** Quote currencies published on the site (must exist in every feed). */
export const QUOTES = [
  "INR", "PKR", "BDT", "PHP", "NPR", "LKR", "EGP", "IDR", "KES", "NGN", "ETB", "USD", "EUR", "GBP",
] as const;

export const GULF = ["AED", "SAR", "QAR", "OMR", "BHD", "KWD"] as const;

/** Plausible range per currency (units per 1 USD). A rate outside this is a feed bug. */
const RANGE: Record<string, [number, number]> = {
  AED: [3.5, 3.85], SAR: [3.6, 3.9], QAR: [3.5, 3.8], OMR: [0.35, 0.42], BHD: [0.35, 0.41],
  KWD: [0.25, 0.4],
  INR: [60, 140], PKR: [200, 400], BDT: [80, 200], PHP: [40, 90], NPR: [100, 230],
  LKR: [200, 500], EGP: [15, 120], IDR: [12000, 25000], KES: [80, 220], NGN: [500, 3500],
  ETB: [40, 300], USD: [0.999, 1.001], EUR: [0.7, 1.35], GBP: [0.55, 1.25],
};

export type Feed = {
  source: string;
  sourceUrl: string;
  asof: string;
  /** units per 1 USD */
  rates: Record<string, number>;
};

type ErApi = {
  result: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  rates: Record<string, number>;
};

type CurrencyApi = { date: string; usd: Record<string, number> };

/** er-api primary. Throws with a readable reason so the log says what happened. */
async function fromErApi(): Promise<Feed> {
  const j = await fetchJson<ErApi>("https://open.er-api.com/v6/latest/USD");
  if (j.result !== "success") throw new Error(`er-api result=${j.result}`);
  if (!j.rates || typeof j.rates.USD !== "number") throw new Error("er-api: no rates object");
  return {
    source: "open.er-api.com",
    sourceUrl: "https://open.er-api.com/v6/latest/USD",
    asof: iso((j.time_last_update_unix || Date.now() / 1000) * 1000),
    rates: j.rates,
  };
}

async function fromCurrencyApi(): Promise<Feed> {
  const j = await fetchJson<CurrencyApi>("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json");
  if (!j.usd) throw new Error("currency-api: no usd object");
  const rates: Record<string, number> = {};
  for (const [k, v] of Object.entries(j.usd)) rates[k.toUpperCase()] = v;
  rates.USD = 1;
  return {
    source: "currency-api (CC0)",
    sourceUrl: "https://github.com/fawazahmed0/currency-api",
    asof: iso(new Date(`${j.date}T00:00:00Z`).getTime()),
    rates,
  };
}

/** Sanity-filter a feed. Returns the accepted subset plus human-readable notes. */
export function validate(feed: Feed): { ok: Record<string, number>; notes: string[] } {
  const ok: Record<string, number> = {};
  const notes: string[] = [];
  for (const code of [...GULF, ...QUOTES]) {
    const r = feed.rates[code];
    if (typeof r !== "number" || !Number.isFinite(r) || r <= 0) {
      notes.push(`${code}: missing`);
      continue;
    }
    const [lo, hi] = RANGE[code] ?? [0, Infinity];
    if (r < lo || r > hi) {
      notes.push(`${code}: ${r} outside plausible ${lo}-${hi}`);
      continue;
    }
    if (PEGGED[code]) {
      const drift = Math.abs(r / PEGGED[code] - 1);
      if (drift > 0.005) {
        notes.push(`${code}: peg drift ${(drift * 100).toFixed(2)}% from ${PEGGED[code]}`);
        continue;
      }
    }
    ok[code] = r;
  }
  return { ok, notes };
}

export async function runFx(db: D1Database): Promise<{ rows: number; message: string; status: "ok" | "error" }> {
  let feed: Feed;
  const notes: string[] = [];
  try {
    feed = await fromErApi();
  } catch (e) {
    notes.push(`er-api failed (${(e as Error).message}); trying currency-api`);
    try {
      feed = await fromCurrencyApi();
    } catch (e2) {
      return { rows: 0, status: "error", message: `all FX sources failed: ${(e2 as Error).message}` };
    }
  }

  const { ok, notes: vnotes } = validate(feed);
  notes.push(...vnotes);
  const codes = Object.keys(ok);
  if (codes.length < 6) {
    return { rows: 0, status: "error", message: `only ${codes.length} usable rates (${codes.join(",")}); kept last good values` };
  }

  const now = iso();
  const day = ymd();
  const stmts = [];
  for (const code of codes) {
    stmts.push(
      db
        .prepare(
          "INSERT INTO gcc_fx_rate (currency, rate, source, source_url, asof, fetched_at) VALUES (?, ?, ?, ?, ?, ?) " +
            "ON CONFLICT(currency) DO UPDATE SET rate=excluded.rate, source=excluded.source, source_url=excluded.source_url, asof=excluded.asof, fetched_at=excluded.fetched_at",
        )
        .bind(code, ok[code], feed.source, feed.sourceUrl, feed.asof, now),
    );
    stmts.push(
      db
        .prepare("INSERT OR REPLACE INTO gcc_fx_daily (currency, d, rate, source) VALUES (?, ?, ?, ?)")
        .bind(code, day, ok[code], feed.source),
    );
  }
  // D1 caps statements per batch; 20 currencies × 2 = 40 is well inside it.
  for (let i = 0; i < stmts.length; i += 40) await db.batch(stmts.slice(i, i + 40));

  return {
    rows: codes.length,
    status: "ok",
    message: `stored ${codes.length} rates from ${feed.source} @ ${feed.asof}${notes.length ? " · " + notes.join("; ") : ""}`,
  };
}
