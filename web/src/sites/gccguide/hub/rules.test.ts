/* Data-integrity tests for the verified labour-law file.
 *
 * The bug these exist to catch: the rules file once keyed Saudi Arabia as
 * "saudi" while the site's slug is "saudi-arabia", so the calculator silently
 * fell back to "not verified" and the page dropped out of the sitemap. A
 * mismatch between the data and the catalogue must fail loudly, not quietly.
 *
 * Run: cd web && node --test src/sites/gccguide/hub/rules.test.ts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const rules = JSON.parse(readFileSync(join(here, "data/labour-rules.json"), "utf8")) as {
  rules: {
    country: string;
    gratuity: { confirmed: boolean; article: string; source_url: string; tiers: unknown[]; min_service_years: number | null; daily_divisor: number | null; resignation_factors: unknown[] };
    overtime?: { confirmed: boolean; source_url: string; uplift_percent: number | null };
    annual_leave?: { confirmed: boolean; source_url: string; tiers: unknown[] };
    notice?: { confirmed: boolean; source_url: string; tiers: unknown[] };
  }[];
};

// Kept as literals rather than imported from config.ts: this file must run under
// plain `node --test` with no bundler, and a literal here is also a second pair
// of eyes on the slugs the rest of the site uses.
const GULF = ["uae", "saudi-arabia", "qatar", "kuwait", "oman", "bahrain"];

describe("labour-rules.json", () => {
  test("covers exactly the six Gulf states, with the site's own slugs", () => {
    const countries = rules.rules.map((r) => r.country).sort();
    assert.deepEqual(countries, [...GULF].sort());
  });

  test("no country appears twice", () => {
    const countries = rules.rules.map((r) => r.country);
    assert.equal(new Set(countries).size, countries.length);
  });

  test("every confirmed record carries an article and an official source", () => {
    for (const r of rules.rules) {
      const items = [r.gratuity, r.overtime, r.annual_leave, r.notice].filter(Boolean) as { confirmed: boolean; article?: string; source_url: string }[];
      for (const item of items) {
        if (!item.confirmed) continue;
        assert.match(item.source_url, /^https:\/\//, `${r.country}: confirmed item without an https source`);
        if ("article" in item) assert.ok(item.article && item.article.length > 3, `${r.country}: confirmed gratuity without an article`);
      }
    }
  });

  test("a confirmed gratuity has usable numbers", () => {
    for (const r of rules.rules) {
      const g = r.gratuity;
      if (!g.confirmed) continue;
      assert.ok(Array.isArray(g.tiers) && g.tiers.length > 0, `${r.country}: no tiers`);
      assert.ok(Array.isArray(g.resignation_factors) && g.resignation_factors.length > 0, `${r.country}: no resignation factors`);
      assert.equal(typeof g.daily_divisor, "number", `${r.country}: daily divisor must be a number`);
      assert.equal(typeof g.min_service_years, "number", `${r.country}: minimum service must be a number`);
    }
  });

  test("an unconfirmed record asserts no numbers at all", () => {
    for (const r of rules.rules) {
      const g = r.gratuity;
      if (g.confirmed) continue;
      assert.deepEqual(g.tiers, [], `${r.country}: unconfirmed gratuity must not carry tiers`);
      assert.deepEqual(g.resignation_factors, [], `${r.country}: unconfirmed gratuity must not carry a resignation scale`);
    }
  });
});
