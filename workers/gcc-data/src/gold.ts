/* Gold spot job.
 *
 * Source: api.gold-api.com/price/XAU — free, no key, no card, live spot in USD
 * per troy ounce (https://gold-api.com). Kept separate from the FX feed on
 * purpose: if gold is down we still publish currency, and vice versa.
 *
 * The site is spot-based. Physical shops add a making charge and their own
 * premium, which the pages say in plain words — we never present this as a
 * shop price.
 */

import { iso, ymd, fetchJson, type D1Database } from "./shared";

const SOURCE = "gold-api.com";
const SOURCE_URL = "https://api.gold-api.com/price/XAU";

type GoldApi = { price: number; updatedAt: string; name: string };

export async function runGold(db: D1Database): Promise<{ rows: number; message: string; status: "ok" | "error" }> {
  let j: GoldApi;
  try {
    j = await fetchJson<GoldApi>(SOURCE_URL);
  } catch (e) {
    return { rows: 0, status: "error", message: `gold-api failed: ${(e as Error).message}; kept last good value` };
  }

  const price = Number(j.price);
  // Sanity band: gold has not traded outside this in modern history; a value
  // outside it means a broken response, and a wrong gold price is worse than
  // a stale one.
  if (!Number.isFinite(price) || price < 500 || price > 20000) {
    return { rows: 0, status: "error", message: `implausible XAU price ${j.price}; kept last good value` };
  }

  const asof = /^\d{4}-\d{2}-\d{2}T/.test(j.updatedAt || "") ? j.updatedAt : iso();
  const now = iso();
  await db.batch([
    db
      .prepare(
        "INSERT INTO gcc_gold_spot (id, usd_per_oz, source, source_url, asof, fetched_at) VALUES (1, ?, ?, ?, ?, ?) " +
          "ON CONFLICT(id) DO UPDATE SET usd_per_oz=excluded.usd_per_oz, source=excluded.source, source_url=excluded.source_url, asof=excluded.asof, fetched_at=excluded.fetched_at",
      )
      .bind(price, SOURCE, SOURCE_URL, asof, now),
    db
      .prepare("INSERT OR REPLACE INTO gcc_gold_daily (d, usd_per_oz, source) VALUES (?, ?, ?)")
      .bind(ymd(), price, SOURCE),
  ]);

  return { rows: 1, status: "ok", message: `XAU ${price.toFixed(2)} USD/oz @ ${asof} (${SOURCE})` };
}
