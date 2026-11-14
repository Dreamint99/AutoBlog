#!/usr/bin/env node
/* Backfill gcc_fx_daily with real past rates, so the 30-day and 1-year charts
 * have history on launch day instead of starting empty.
 *
 * Source: @fawazahmed0/currency-api, which publishes one CC0 snapshot per day as
 * a date-pinned npm package — so a historical day can be fetched without a key:
 *   https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@2026-10-01/v1/currencies/usd.json
 *
 * It writes a .sql file; it does not touch the database itself. Apply it with:
 *   cd web
 *   npx wrangler d1 execute autoblog-content --remote --file=../workers/gcc-data/out/backfill-fx.sql
 *
 * Usage: node workers/gcc-data/scripts/backfill-history.mjs [--days=365] [--out=...]
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "1"];
  }),
);
const DAYS = Number(args.days ?? 365);
const OUT = resolve(process.cwd(), args.out ?? "workers/gcc-data/out/backfill-fx.sql");

const CODES = ["AED", "SAR", "QAR", "OMR", "BHD", "KWD", "INR", "PKR", "BDT", "PHP", "NPR", "LKR", "EGP", "IDR", "KES", "NGN", "ETB", "EUR", "GBP"];

/** Sample days: every day for the last 30, then every 7th day back to 1 year. */
function sampleDays(days) {
  const out = new Set();
  const today = Date.now();
  for (let i = 0; i <= Math.min(30, days); i++) out.add(i);
  for (let i = 30; i <= days; i += 7) out.add(i);
  return [...out].sort((a, b) => b - a).map((i) => new Date(today - i * 864e5).toISOString().slice(0, 10));
}

const url = (d) => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${d}/v1/currencies/usd.json`;

const rows = [];
const seen = new Set();
let failed = 0;
for (const d of sampleDays(DAYS)) {
  try {
    const res = await fetch(url(d), { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    const date = j.date || d;
    if (seen.has(date)) continue;
    seen.add(date);
    for (const c of CODES) {
      const v = j.usd?.[c.toLowerCase()];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) rows.push([c, date, v, "currency-api"]);
    }
    process.stdout.write(`\r${date}  ${rows.length} rows`);
  } catch (e) {
    failed++;
    process.stdout.write(`\r${d} failed: ${e.message}          \n`);
  }
  await new Promise((r) => setTimeout(r, 120)); // be polite to jsDelivr
}
process.stdout.write("\n");

const esc = (s) => String(s).replace(/'/g, "''");
const sql = [
  `-- gcc_fx_daily backfill · ${rows.length} rows · generated ${new Date().toISOString()}`,
  "-- source: @fawazahmed0/currency-api (CC0), daily snapshots",
  "BEGIN;",
  ...rows.map(([c, d, r, s]) => `INSERT OR REPLACE INTO gcc_fx_daily (currency, d, rate, source) VALUES ('${esc(c)}','${esc(d)}',${r},'${esc(s)}');`),
  "COMMIT;",
  "",
].join("\n");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, sql, "utf8");
console.log(`wrote ${rows.length} rows (${seen.size} days, ${failed} failed fetches) → ${OUT}`);
console.log("apply: cd web && npx wrangler d1 execute autoblog-content --remote --file=../workers/gcc-data/out/backfill-fx.sql");
