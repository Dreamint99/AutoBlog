import { test } from "node:test";
import assert from "node:assert/strict";
import { newMonthlyData } from "../src/stories.mjs";
test("unchanged annual data cannot be republished as a fresh monthly story", () => {
  assert.equal(newMonthlyData({ slug: "2026-11", fingerprint: "same-cohort" }, "2026-12", "same-cohort"), false);
  assert.equal(newMonthlyData({ slug: "2026-11", fingerprint: "same-cohort" }, "2026-12", "revised-cohort"), true);
  assert.equal(newMonthlyData({ slug: "2026-11", fingerprint: "same-cohort" }, "2026-11", "same-cohort"), true);
});
