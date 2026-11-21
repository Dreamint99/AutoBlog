import "server-only";
import { d1 } from "@/lib/data";
import type { LeagueStats } from "./stats-type";

async function read(key: string): Promise<{ json: string; updated_at: string } | null> {
  const db = d1();
  if (!db) return null;
  try {
    const { results } = await db.prepare("SELECT json, updated_at FROM nm_feed WHERE key = ? LIMIT 1").bind(key).all<{ json: string; updated_at: string }>();
    return results?.[0] || null;
  } catch {
    return null;
  }
}

/** Weekly Cricsheet ingest (generator/event_refresh.py). Bundled stats.json is the fallback. */
export async function storedStats(): Promise<Record<string, LeagueStats> | null> {
  const row = await read("event_stats");
  if (!row) return null;
  try {
    const data = JSON.parse(row.json) as Record<string, LeagueStats>;
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

/** Per-slug lastmod written when the refresh job sees a change. */
export async function eventLastmod(): Promise<Record<string, string>> {
  const row = await read("event_live");
  if (!row) return {};
  try {
    const data = JSON.parse(row.json) as { lastmod?: Record<string, string> };
    return data.lastmod || {};
  } catch {
    return {};
  }
}
