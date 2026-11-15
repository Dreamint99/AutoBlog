/* Unit tests for the remittance report math.
   Run:  cd web && node --test src/sites/gccguide/hub/remittance-math.test.ts */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { reportMonths, shiftYm, pairSeries, pairMonth, bestWeek, monthEnds12, moveWords, monthLabel } from "./remittance-math.ts";

describe("months", () => {
  test("shiftYm crosses years", () => {
    assert.equal(shiftYm("2026-01", -1), "2025-12");
    assert.equal(shiftYm("2026-11", -12), "2025-11");
    assert.equal(shiftYm("2025-12", 1), "2026-01");
  });
  test("label", () => assert.equal(monthLabel("2026-10"), "October 2026"));
  test("partial first month is skipped, current month is 'so far'", () => {
    const dates = ["2025-11-20", "2025-11-27", "2025-12-04", "2025-12-25", "2026-01-01", "2026-01-29", "2026-02-05", "2026-02-12"];
    const m = reportMonths(dates, "2026-02-15");
    assert.deepEqual(
      m.map((x) => [x.ym, x.complete]),
      [
        ["2026-02", false],
        ["2026-01", true],
        ["2025-12", true],
      ],
    );
  });
});

describe("pair month", () => {
  // USD-based: AED pegged 3.6725, BDT moving.
  const days = ["2025-10-30", "2025-11-06", "2025-11-13", "2025-11-20", "2025-11-27", "2026-11-05", "2026-11-26"];
  const bdt = [120, 121, 122, 119, 123, 125, 124];
  const aed = pairSeries(
    days.map((d) => ({ d, v: 3.6725 })),
    days.map((d, i) => ({ d, v: bdt[i] })),
  );
  test("cross rate = to / from", () => {
    assert.ok(Math.abs(aed[0].v - 120 / 3.6725) < 1e-9);
  });
  test("end, high, low, prev, year-ago", () => {
    const pm = pairMonth(aed, "2025-11")!;
    assert.equal(pm.end.d, "2025-11-27");
    assert.equal(pm.high.d, "2025-11-27");
    assert.equal(pm.low.d, "2025-11-20");
    assert.equal(pm.prev!.d, "2025-10-30");
    assert.ok(Math.abs(pm.chPrev! - (123 / 120 - 1) * 100) < 1e-9);
    assert.equal(pm.yearAgo, null);
    const nov26 = pairMonth(aed, "2026-11")!;
    assert.equal(nov26.yearAgo!.d, "2025-11-27");
    assert.ok(Math.abs(nov26.chYear! - (124 / 123 - 1) * 100) < 1e-9);
    assert.equal(nov26.prev, null);
  });
  test("best week is the highest average Monday-Sunday week, clipped to the month", () => {
    const w = bestWeek(
      [
        { d: "2026-11-01", v: 10 }, // Sunday -> week of Mon 26 Oct, clipped to 1 Nov
        { d: "2026-11-02", v: 11 },
        { d: "2026-11-03", v: 13 },
        { d: "2026-11-30", v: 11.5 },
      ],
      "2026-11",
    )!;
    assert.equal(w.start, "2026-11-02");
    assert.equal(w.end, "2026-11-08");
    assert.equal(w.avg, 12);
  });
  test("month-end series skips months without data", () => {
    const e = monthEnds12(aed, "2026-11");
    assert.deepEqual(
      e.map((p) => p.d),
      ["2025-11-27", "2026-11-26"].slice(1),
    );
  });
  test("move words", () => {
    assert.equal(moveWords(0.421), "up 0.42%");
    assert.equal(moveWords(-1.1), "down 1.10%");
    assert.equal(moveWords(0.001), "unchanged");
  });
});
