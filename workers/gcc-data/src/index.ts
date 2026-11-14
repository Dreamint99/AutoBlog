/* gccguide.com scheduled data job.
 *
 * Cron (UTC) — see wrangler.jsonc:
 *   0 2,10,18 * * *   currency rates (three times a day)
 *   15 * * * *        gold spot (hourly)
 *   30 0 * * *        daily history snapshot + IndexNow ping
 *
 * Every run is idempotent (upsert), keeps the last good value when a source
 * fails, and writes one row to gcc_job_log so a silent failure becomes visible.
 * The site itself never depends on this Worker being up: it renders whatever the
 * last successful run stored.
 *
 * Manual run (local):  npx wrangler dev -c ../workers/gcc-data/wrangler.jsonc --local \
 *                        --test-scheduled
 *                      curl "http://localhost:8787/?job=fx"
 */

import { iso, logJob, type Env, type JobResult } from "./shared";
import { runFx } from "./fx";
import { runGold } from "./gold";
import { pingIndexNow, ratePaths } from "./indexnow";

async function timed(env: Env, job: string, fn: () => Promise<JobResult>): Promise<JobResult> {
  const startedAt = iso();
  const t0 = Date.now();
  let r: JobResult;
  try {
    r = await fn();
  } catch (e) {
    r = { job, status: "error", message: (e as Error).message || String(e), rows: 0 };
  }
  await logJob(env.DB, r, startedAt, Date.now() - t0);
  return r;
}

async function runAll(env: Env): Promise<JobResult[]> {
  const out: JobResult[] = [];
  out.push(
    await timed(env, "fx", async () => {
      const r = await runFx(env.DB);
      return { job: "fx", rows: r.rows, status: r.status, message: r.message };
    }),
  );
  out.push(
    await timed(env, "gold", async () => {
      const r = await runGold(env.DB);
      return { job: "gold", rows: r.rows, status: r.status, message: r.message };
    }),
  );
  return out;
}

async function daily(env: Env): Promise<JobResult[]> {
  const out = await runAll(env);
  out.push(
    await timed(env, "indexnow", async () => {
      const r = await pingIndexNow(env, ratePaths());
      return { job: "indexnow", rows: r.message.includes("urls") ? ratePaths().length : 0, status: r.status, message: r.message };
    }),
  );
  return out;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    // Cloudflare's scheduled-test hook: /__scheduled?cron=...
    if (url.pathname === "/__scheduled") {
      const cron = url.searchParams.get("cron") || "";
      const results = cron.startsWith("30 0") ? await daily(env) : cron.startsWith("15 ") ? await runAll(env) : await runAll(env);
      return Response.json({ cron, results });
    }
    const job = url.searchParams.get("job") || "all";
    const results =
      job === "fx"
        ? [await timed(env, "fx", async () => { const r = await runFx(env.DB); return { job: "fx", rows: r.rows, status: r.status, message: r.message }; })]
        : job === "gold"
          ? [await timed(env, "gold", async () => { const r = await runGold(env.DB); return { job: "gold", rows: r.rows, status: r.status, message: r.message }; })]
          : job === "indexnow"
            ? [await timed(env, "indexnow", async () => { const r = await pingIndexNow(env, ratePaths()); return { job: "indexnow", rows: 0, status: r.status, message: r.message }; })]
            : await runAll(env);
    const bad = results.some((r) => r.status === "error");
    return Response.json({ job, results }, { status: bad ? 500 : 200 });
  },

  async scheduled(controller: { cron: string }, env: Env): Promise<void> {
    if (controller.cron === "30 0 * * *") {
      await daily(env);
      return;
    }
    // "0 2,10,18 * * *" (fx) and "15 * * * *" (gold) both run the same two jobs:
    // they are one fetch each, and running both on every trigger means gold is
    // never more than an hour old and currency never more than ~8 hours old.
    await runAll(env);
  },
};
