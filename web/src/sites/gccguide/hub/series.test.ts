/* Unit tests for the hub's rate/series math.
   Run:  cd web && node --test src/sites/gccguide/hub/series.test.ts
   (Node 24 strips the types natively — no test framework to install.) */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { crossRateOf, joinPair, changeOver, stats, thin, toPath, dpFor } from "./series.ts";

describe("crossRateOf", () => {
  test("AED -> SAR uses the two pegs (3.75 / 3.6725)", () => {
    const r = crossRateOf(3.6725, 3.75);
    assert.ok(r !== null);
    assert.equal(Number(r.toFixed(8)), Number((3.75 / 3.6725).toFixed(8)));
    assert.ok(Math.abs(r! - 1.021102) < 0.0001);
  });

  test("currency to itself is exactly 1", () => {
    assert.equal(crossRateOf(3.6725, 3.6725), 1);
  });

  test("KWD -> INR is a float, not a peg", () => {
    const r = crossRateOf(0.31098, 94.086126);
    assert.ok(r! > 300 && r! < 310); // ~302.5
  });

  test("rejects missing, zero, negative and non-finite inputs", () => {
    assert.equal(crossRateOf(null, 3.75), null);
    assert.equal(crossRateOf(3.6725, null), null);
    assert.equal(crossRateOf(0, 3.75), null);
    assert.equal(crossRateOf(-1, 3.75), null);
    assert.equal(crossRateOf(NaN, 3.75), null);
    assert.equal(crossRateOf(Infinity, 3.75), null);
  });
});

describe("joinPair", () => {
  const a = [
    { d: "2026-11-01", v: 3.6725 },
    { d: "2026-11-02", v: 3.6725 },
    { d: "2026-11-03", v: 3.6725 },
  ];
  const b = [
    { d: "2026-11-01", v: 94.0 },
    { d: "2026-11-03", v: 95.0 },
  ];

  test("aligns on dates present in both series", () => {
    const j = joinPair(a, b);
    assert.deepEqual(j.map((p) => p.d), ["2026-11-01", "2026-11-03"]);
  });

  test("computes to/from per day", () => {
    const j = joinPair(a, b);
    assert.equal(Number(j[0].v.toFixed(6)), Number((94 / 3.6725).toFixed(6)));
    assert.equal(Number(j[1].v.toFixed(6)), Number((95 / 3.6725).toFixed(6)));
  });

  test("drops rows with a zero or negative side", () => {
    assert.deepEqual(joinPair([{ d: "2026-11-01", v: 0 }], [{ d: "2026-11-01", v: 94 }]), []);
    assert.deepEqual(joinPair([{ d: "2026-11-01", v: 3.67 }], [{ d: "2026-11-01", v: -1 }]), []);
  });

  test("empty in, empty out", () => {
    assert.deepEqual(joinPair([], []), []);
  });
});

describe("changeOver", () => {
  const series = [
    { d: "2026-10-01", v: 90 },
    { d: "2026-10-15", v: 92 },
    { d: "2026-11-01", v: 94 },
    { d: "2026-11-13", v: 94.086 },
  ];

  test("30-day change compares against the last sample at or before the cutoff", () => {
    const c = changeOver(series, 30);
    assert.ok(c);
    // 30 days before 2026-11-13 is 2026-10-14, so 2026-10-15 is too recent to be
    // the baseline; the correct comparison is the 2026-10-01 sample.
    assert.equal(c!.from.d, "2026-10-01");
    assert.equal(c!.to.d, "2026-11-13");
    assert.ok(c!.pct > 4 && c!.pct < 5); // 94.086 / 90 - 1 = 4.54%
  });

  test("returns null when history does not reach back that far", () => {
    assert.equal(changeOver(series, 365), null);
  });

  test("returns null for a single point", () => {
    assert.equal(changeOver([{ d: "2026-11-13", v: 94 }], 7), null);
  });

  test("a flat pegged pair reports 0%", () => {
    const flat = [
      { d: "2026-10-15", v: 3.6725 },
      { d: "2026-11-13", v: 3.6725 },
    ];
    // 20 days reaches back to the first sample (30 does not: 2026-10-14 < 2026-10-15).
    assert.equal(changeOver(flat, 20)!.pct, 0);
    assert.equal(changeOver(flat, 30), null);
  });
});

describe("stats / thin / toPath", () => {
  test("stats finds min, max and mean", () => {
    const s = stats([{ d: "a", v: 3 }, { d: "b", v: 1 }, { d: "c", v: 2 }])!;
    assert.equal(s.min.v, 1);
    assert.equal(s.max.v, 3);
    assert.equal(s.avg, 2);
    assert.equal(s.n, 3);
  });

  test("stats of an empty series is null", () => {
    assert.equal(stats([]), null);
  });

  test("thin keeps the first and last point and respects the cap", () => {
    const pts = Array.from({ length: 500 }, (_, i) => ({ d: `d${i}`, v: i }));
    const t = thin(pts, 50);
    assert.equal(t.length, 50);
    assert.equal(t[0].v, 0);
    assert.equal(t[49].v, 499);
  });

  test("toPath needs at least two points and stays inside the box", () => {
    assert.equal(toPath([{ d: "a", v: 1 }], 100, 40), null);
    const p = toPath([{ d: "a", v: 1 }, { d: "b", v: 2 }], 100, 40)!;
    assert.ok(p.line.startsWith("M"));
    assert.ok(p.area.endsWith("Z"));
    assert.equal(p.min, 1);
    assert.equal(p.max, 2);
  });

  test("a flat series does not divide by zero", () => {
    const p = toPath([{ d: "a", v: 5 }, { d: "b", v: 5 }], 100, 40)!;
    assert.ok(Number.isFinite(p.min) && Number.isFinite(p.max));
    assert.ok(!p.line.includes("NaN"));
  });
});

describe("dpFor", () => {
  test("picks a readable precision per magnitude", () => {
    assert.equal(dpFor(18250), 0);
    assert.equal(dpFor(302.5), 2);
    assert.equal(dpFor(3.6725), 4);
    assert.equal(dpFor(0.31098), 5);
    assert.equal(dpFor(0.0106), 5);
    assert.equal(dpFor(0.0001), 6);
  });
});
