/* Gratuity engine tests. Run: cd web && node --test src/sites/gccguide/hub/gratuity.test.ts
 *
 * The fixtures below are the *shapes* of the real laws, written as data so the
 * arithmetic can be pinned independently of the verified rule file:
 *   A: 21 days/year for 5 years, then 30, basic wage, 24-month cap  (UAE-shaped)
 *   B: 15 days/year for 5 years, then 30, full wage, resignation scale (Saudi-shaped)
 *   C: flat 21 days/year, no cap                                    (Qatar-shaped)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeGratuity, gratuityDays, resignationFactor, parseExampleSlug, exampleSlug, type GratuityRule } from "./gratuity.ts";

const A: GratuityRule = {
  confirmed: true, article: "test", source_url: "https://example.test", wage_base: "basic",
  min_service_years: 1, daily_divisor: 30,
  tiers: [{ upToYears: 5, daysPerYear: 21 }, { upToYears: null, daysPerYear: 30 }],
  cap_months: 24, resignation_factors: [{ minYears: 0, factor: 1 }],
  plain_english: "", notes: "",
};

const B: GratuityRule = {
  confirmed: true, article: "test", source_url: "https://example.test", wage_base: "full",
  min_service_years: 1, daily_divisor: 30,
  tiers: [{ upToYears: 5, daysPerYear: 15 }, { upToYears: null, daysPerYear: 30 }],
  cap_months: null,
  resignation_factors: [{ minYears: 0, factor: 0 }, { minYears: 2, factor: 1 / 3 }, { minYears: 5, factor: 2 / 3 }, { minYears: 10, factor: 1 }],
  plain_english: "", notes: "",
};

const C: GratuityRule = {
  confirmed: true, article: "test", source_url: "https://example.test", wage_base: "basic",
  min_service_years: 1, daily_divisor: 30,
  tiers: [{ upToYears: null, daysPerYear: 21 }],
  cap_months: null, resignation_factors: [{ minYears: 0, factor: 1 }],
  plain_english: "", notes: "",
};

describe("gratuityDays", () => {
  test("first tier only", () => {
    assert.equal(gratuityDays(A.tiers, 3), 63); // 3 × 21
  });
  test("exactly at the tier boundary", () => {
    assert.equal(gratuityDays(A.tiers, 5), 105); // 5 × 21, no second tier yet
  });
  test("crosses the boundary", () => {
    assert.equal(gratuityDays(A.tiers, 7), 165); // 105 + 2×30
  });
  test("fractional year inside the first tier", () => {
    assert.equal(gratuityDays(A.tiers, 2.5), 52.5);
  });
  test("fractional year across the boundary", () => {
    assert.equal(gratuityDays(A.tiers, 5.5), 120); // 105 + 0.5×30
  });
  test("single-tier law is linear", () => {
    assert.equal(gratuityDays(C.tiers, 4), 84);
  });
  test("zero and negative years earn nothing", () => {
    assert.equal(gratuityDays(A.tiers, 0), 0);
    assert.equal(gratuityDays(A.tiers, -3), 0);
  });
});

describe("UAE-shaped: basic wage, 24-month cap", () => {
  test("5 years on AED 5,000 basic", () => {
    const r = computeGratuity(A, { monthlyWage: 5000, years: 5, reason: "termination" });
    assert.equal(r.days, 105);
    assert.equal(r.dailyWage, 166.66666666666666);
    assert.equal(r.amount, 17500);
    assert.equal(r.capped, false);
  });

  test("7 years on AED 5,000 basic", () => {
    const r = computeGratuity(A, { monthlyWage: 5000, years: 7, reason: "termination" });
    assert.equal(r.days, 165);
    assert.equal(r.amount, 27500);
  });

  test("under one year of service earns nothing", () => {
    const r = computeGratuity(A, { monthlyWage: 5000, years: 0.9, reason: "termination" });
    assert.equal(r.eligible, false);
    assert.equal(r.amount, 0);
  });

  test("exactly one year is eligible", () => {
    const r = computeGratuity(A, { monthlyWage: 5000, years: 1, reason: "termination" });
    assert.equal(r.eligible, true);
    assert.equal(r.amount, 3500); // 21 × (5000/30)
  });

  test("the 24-month cap binds on long service", () => {
    const r = computeGratuity(A, { monthlyWage: 5000, years: 30, reason: "termination" });
    assert.equal(r.days, 855); // 105 + 25×30
    assert.equal(r.capped, true);
    assert.equal(r.capAmount, 120000); // 24 × 5000
    assert.equal(r.amount, 120000);
  });

  test("resignation and termination are the same where the law does not reduce", () => {
    const res = computeGratuity(A, { monthlyWage: 8000, years: 6, reason: "resignation" });
    const ter = computeGratuity(A, { monthlyWage: 8000, years: 6, reason: "termination" });
    assert.equal(res.amount, ter.amount);
  });

  test("a zero or negative wage never produces a payment", () => {
    assert.equal(computeGratuity(A, { monthlyWage: 0, years: 5, reason: "termination" }).amount, 0);
    assert.equal(computeGratuity(A, { monthlyWage: -1, years: 5, reason: "termination" }).amount, 0);
  });
});

describe("Saudi-shaped: full wage, resignation scale", () => {
  test("termination pays the full award", () => {
    // 5×15 + 2×30 = 135 days on SAR 10,000 → 135 × 333.33
    const r = computeGratuity(B, { monthlyWage: 10000, years: 7, reason: "termination" });
    assert.equal(r.days, 135);
    assert.equal(r.amount, 45000);
    assert.equal(r.factor, 1);
  });

  test("resignation at 7 years pays two thirds", () => {
    const r = computeGratuity(B, { monthlyWage: 10000, years: 7, reason: "resignation" });
    assert.equal(r.factor, 2 / 3);
    assert.equal(r.amount, 30000);
  });

  test("resignation after 10 years pays in full", () => {
    const r = computeGratuity(B, { monthlyWage: 10000, years: 10, reason: "resignation" });
    assert.equal(r.factor, 1);
    assert.equal(r.days, 225); // 75 + 5×30
    assert.equal(r.amount, 75000);
  });

  test("resignation just under two years pays nothing", () => {
    const r = computeGratuity(B, { monthlyWage: 10000, years: 1.9, reason: "resignation" });
    assert.equal(r.amount, 0);
    // …but a termination at 1.9 years does pay, because the award started at 1 year.
    assert.ok(computeGratuity(B, { monthlyWage: 10000, years: 1.9, reason: "termination" }).amount > 0);
  });

  test("resignation between 2 and 5 years pays one third", () => {
    const r = computeGratuity(B, { monthlyWage: 6000, years: 4, reason: "resignation" });
    assert.equal(r.factor, 1 / 3);
    assert.equal(Number(r.amount.toFixed(2)), Number(((4 * 15 * 6000) / 30 / 3).toFixed(2)));
  });

  test("resignation exactly at 5 years pays two thirds", () => {
    assert.equal(resignationFactor(B.resignation_factors, 5, "resignation"), 2 / 3);
  });

  test("resignation exactly at 10 years pays full", () => {
    assert.equal(resignationFactor(B.resignation_factors, 10, "resignation"), 1);
  });
});

describe("flat-rate law and slug helpers", () => {
  test("21 days per year, five years", () => {
    const r = computeGratuity(C, { monthlyWage: 9000, years: 5, reason: "resignation" });
    assert.equal(r.days, 105);
    assert.equal(r.amount, 31500);
  });

  test("example slug round-trips", () => {
    const slug = exampleSlug(5000, "AED", 7);
    assert.equal(slug, "basic-5000-aed-7-years");
    const parsed = parseExampleSlug(slug);
    assert.deepEqual(parsed, { wage: 5000, currency: "AED", years: 7 });
  });

  test("bad example slugs are rejected", () => {
    assert.equal(parseExampleSlug("basic-5000"), null);
    assert.equal(parseExampleSlug("gratuity-uae"), null);
    assert.equal(parseExampleSlug("basic-5000-aed-99-years"), null);
  });
});
