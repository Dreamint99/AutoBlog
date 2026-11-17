import { test } from "node:test";
import assert from "node:assert/strict";
import { distribute } from "../src/social.mjs";
function fakeEnv(extra = {}) {
  const updates = [], values = new Map();
  const env = { MONTHLY_PAID_API_CAP_USD: "0", SEO_LOG: { put: async (k, v) => values.set(k, JSON.parse(v)) }, DB: { prepare(sql) { return { bind(...args) { this.args = args; return this; }, async all() { return { results: sql.includes("UNION ALL") ? [{ url: "https://countly.net/data/ranking/population", title: "Population by country", at: "2026-11-14" }] : [] }; }, async first() { return { url: "https://countly.net/data/ranking/population" }; }, async run() { updates.push({ sql, args: this.args }); return { meta: { changes: 1 } }; } }; }, batch: async () => [] }, ...extra };
  return { env, updates, values };
}
test("missing credentials never send or pretend a post succeeded", async () => {
  const { env, values } = fakeEnv(); const previous = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("External call must not occur"); };
  try { await distribute(env); assert.equal(values.get("engine:social").telegram, false); assert.equal(values.get("engine:social").x, false); } finally { globalThis.fetch = previous; }
});
test("X stays disabled at the default zero-dollar cap even with a token", async () => {
  const { env, values } = fakeEnv({ X_USER_ACCESS_TOKEN: "test-only" }); let calls = 0; const previous = globalThis.fetch;
  globalThis.fetch = async () => { calls++; throw new Error("No paid call"); };
  try { await distribute(env); assert.equal(calls, 0); assert.match(values.get("engine:social").xBudget, /disabled/); } finally { globalThis.fetch = previous; }
});
test("ambiguous Telegram delivery becomes review-only instead of an automatic duplicate", async () => {
  const { env, updates } = fakeEnv({ TELEGRAM_BOT_TOKEN: "test-only", TELEGRAM_CHANNEL_ID: "@test" }); const previous = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("timeout after possible acceptance"); };
  try { await distribute(env); assert(updates.some(r => r.sql.includes("delivery_unknown"))); assert(updates.some(r => r.sql.includes("status='sending'"))); } finally { globalThis.fetch = previous; }
});
