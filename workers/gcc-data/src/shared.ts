/* Minimal D1 + runtime typings so this Worker needs no extra dependency.
   (Same approach as web/src/lib/data.ts — keeps `npm install` unchanged.) */

export interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
}

export interface D1Database {
  prepare(query: string): D1Stmt;
  batch(stmts: D1Stmt[]): Promise<unknown[]>;
}

export interface Env {
  DB: D1Database;
  SITE_URL: string;
  INDEXNOW_KEY: string;
  INDEXNOW_ENABLED: string;
}

export interface JobResult {
  job: string;
  status: "ok" | "error" | "skipped";
  message: string;
  rows: number;
}

/** UTC timestamps in one format everywhere: 2026-11-14T02:00:00Z */
export function iso(ms = Date.now()): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function ymd(ms = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Write one row to gcc_job_log. Never throws — a broken log must not break a job. */
export async function logJob(
  db: D1Database,
  r: JobResult,
  startedAt: string,
  durationMs: number,
): Promise<void> {
  try {
    await db
      .prepare(
        "INSERT INTO gcc_job_log (job, status, message, rows_affected, started_at, finished_at, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(r.job, r.status, r.message.slice(0, 900), r.rows, startedAt, iso(), durationMs)
      .run();
    // Keep the table small: it is diagnostics, not history.
    await db.prepare("DELETE FROM gcc_job_log WHERE started_at < ?").bind(`${ymd(Date.now() - 90 * 864e5)}T00:00:00Z`).run();
  } catch (e) {
    console.error("gcc_job_log write failed", e);
  }
}

/** fetch() with a timeout and one retry; Workers have no AbortController issues here. */
export async function fetchJson<T>(url: string, timeoutMs = 12000, headers: Record<string, string> = {}): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctl.signal,
        headers: { accept: "application/json", "user-agent": "GCCGuide data job (+https://gccguide.com)", ...headers },
        cf: { cacheTtl: 0, cacheEverything: false },
      } as RequestInit);
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
