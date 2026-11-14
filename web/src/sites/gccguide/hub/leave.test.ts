/* Tests for the leave / overtime / notice maths.
   Run: cd web && node --test src/sites/gccguide/hub/leave.test.ts */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hourlyWage, overtimePay, tierDays, dailyWage, daysPay } from "./leave.ts";

describe("hourlyWage", () => {
  test("monthly / 240 by default", () => {
    assert.equal(hourlyWage(4800, null), 20);
  });
  test("uses the law's divisor when it has one", () => {
    assert.equal(hourlyWage(5200, 208), 25);
  });
  test("never divides by zero and never returns a negative", () => {
    assert.equal(hourlyWage(4800, 0), 20);
    assert.equal(hourlyWage(-100, 240), 0);
  });
});

describe("overtimePay", () => {
  test("25% uplift: 10 hours on a 4,800 wage", () => {
    // 20/h × 10 × 1.25
    assert.equal(overtimePay(4800, 10, 25, 240), 250);
  });
  test("50% uplift", () => {
    assert.equal(overtimePay(4800, 10, 50, 240), 300);
  });
  test("no uplift configured still pays the base hourly rate", () => {
    assert.equal(overtimePay(4800, 8, null, 240), 160);
  });
  test("zero and negative hours are zero", () => {
    assert.equal(overtimePay(4800, 0, 25, 240), 0);
    assert.equal(overtimePay(4800, -5, 25, 240), 0);
  });
});

describe("tierDays", () => {
  const tiers = [
    { minServiceYears: 0, days: 21 },
    { minServiceYears: 5, days: 30 },
  ];
  test("below the milestone gets the first tier", () => {
    assert.equal(tierDays(tiers, 0), 21);
    assert.equal(tierDays(tiers, 4.9), 21);
  });
  test("at the milestone gets the higher tier", () => {
    assert.equal(tierDays(tiers, 5), 30);
    assert.equal(tierDays(tiers, 12), 30);
  });
  test("unsorted input is handled", () => {
    assert.equal(tierDays([...tiers].reverse(), 6), 30);
  });
  test("no tiers means no answer, not a guess", () => {
    assert.equal(tierDays([], 3), null);
  });
});

describe("daily wage and leave pay", () => {
  test("daily wage is monthly / 30", () => {
    assert.equal(dailyWage(9000), 300);
  });
  test("30 days of leave on a 9,000 wage", () => {
    assert.equal(daysPay(9000, 30), 9000);
  });
  test("partial leave", () => {
    assert.equal(daysPay(9000, 12.5), 3750);
  });
  test("negatives clamp to zero", () => {
    assert.equal(daysPay(9000, -3), 0);
    assert.equal(dailyWage(-1), 0);
  });
});
