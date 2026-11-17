import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPages, digest } from "../src/data.mjs";
test("unknown and aggregate values never become country pages; null is not zero", () => {
  const cs = [{ id: "AAA", name: "A", region: { id: "EU", value: "Europe" } }, { id: "WLD", name: "World", region: { id: "NA", value: "Aggregates" } }];
  const rows = [2023, 2024, 2025].flatMap(date => [{ countryiso3code: "AAA", date: String(date), value: 0 }, { countryiso3code: "WLD", date: String(date), value: 999 }]);
  const series = Object.fromEntries(["population", "gdp-per-capita", "gdp-growth"].map(m => [m, [{ lastupdated: "2026-11-11" }, rows]]));
  const pages = buildPages(cs, series); assert.equal(pages.length, 3); assert.equal(pages[0].body.history[0].value, 0); assert(pages[0].title.includes("2025")); assert(!pages[0].title.includes("2026"));
  for (const m of Object.keys(series)) series[m][1] = rows.map(r => ({ ...r, value: null }));
  assert.equal(buildPages(cs, series).length, 0);
});
test("rankings align observation year and exclude unavailable years", () => {
  const cs = Array.from({ length: 60 }, (_, i) => ({ id: String(i).padStart(3, "0"), name: `Country ${i}`, region: { id: "E", value: "Europe" } }));
  const rows = cs.flatMap((c, i) => [2023, 2024, 2025].filter(y => y !== 2025 || i < 10).map(y => ({ countryiso3code: c.id, date: String(y), value: i + 1 })));
  const series = Object.fromEntries(["population", "gdp-per-capita", "gdp-growth"].map(m => [m, [{ lastupdated: "2026-11-11" }, rows]]));
  // Only 10 countries have the required three values; insufficient ranking coverage.
  assert(!buildPages(cs, series).some(p => p.kind === "ranking"));
});
test("content hash changes only when source content changes", async () => { assert.equal(await digest({ a: 1 }), await digest({ a: 1 })); assert.notEqual(await digest({ a: 1 }), await digest({ a: 2 })); });
