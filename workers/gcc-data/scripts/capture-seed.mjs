#!/usr/bin/env node
/* Capture the real, dated snapshot that ships in web/src/sites/gccguide/hub/seed.json.
 *
 * The site reads D1 first. This snapshot is only the fallback for local design
 * work and for the first deploy, before the cron Worker has run — it is real
 * data with a real timestamp, never a placeholder, and the pages print its date.
 *
 * Usage: node workers/gcc-data/scripts/capture-seed.mjs
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CODES = ["AED", "SAR", "QAR", "OMR", "BHD", "KWD", "INR", "PKR", "BDT", "PHP", "NPR", "LKR", "EGP", "IDR", "KES", "NGN", "ETB", "USD", "EUR", "GBP"];

async function json(url) {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
}

const er = await json("https://open.er-api.com/v6/latest/USD");
if (er.result !== "success") throw new Error("er-api did not return success");
const gold = await json("https://api.gold-api.com/price/XAU");

const fx = {};
for (const c of CODES) {
  const v = er.rates?.[c];
  if (typeof v !== "number") throw new Error(`missing ${c} in er-api feed`);
  fx[c] = v;
}

const capturedAt = new Date(er.time_last_update_unix * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
const seed = {
  _readme:
    "Real FX + gold snapshot used only as a fallback when D1 has no rows. Regenerate with workers/gcc-data/scripts/capture-seed.mjs.",
  captured_at: capturedAt,
  fx_source: "open.er-api.com",
  gold_usd_per_oz: Number(gold.price),
  gold_source: "gold-api.com",
  gold_asof: gold.updatedAt,
  fx,
};

const out = resolve("web/src/sites/gccguide/hub/seed.json");
writeFileSync(out, JSON.stringify(seed, null, 2) + "\n", "utf8");
console.log(`wrote ${out}`);
console.log(`  fx ${Object.keys(fx).length} codes @ ${capturedAt}`);
console.log(`  gold ${gold.price} USD/oz @ ${gold.updatedAt}`);
