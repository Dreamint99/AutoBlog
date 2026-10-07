import "server-only";

/* Other free, keyless sources for NinetyMins:
   - Wikipedia REST summaries (CC BY-SA — always shown with a source link)
   - OpenLigaDB (Bundesliga top scorers; ESPN's scoreboard doesn't list them)
   Cached per colo in the Cache API; any failure → null / [] and the UI hides. */

const NS = "https://nm-live.autoblog.internal/v1/free";

function edgeCache(): Cache | null {
  try {
    return (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default ?? null;
  } catch {
    return null;
  }
}

async function cached<T>(key: string, fresh: number, read: () => Promise<T>): Promise<T> {
  const cache = edgeCache();
  const req = new Request(`${NS}/${encodeURIComponent(key)}`);
  let stale: { t: number; v: T } | null = null;
  if (cache) {
    try {
      const hit = await cache.match(req);
      if (hit) {
        stale = await hit.json();
        if (stale && Date.now() - stale.t < fresh * 1000) return stale.v;
      }
    } catch {
      stale = null;
    }
  }
  try {
    const v = await read();
    await cache?.put(req, new Response(JSON.stringify({ t: Date.now(), v }), { headers: { "cache-control": `public, s-maxage=${fresh * 4}` } })).catch(() => {});
    return v;
  } catch (e) {
    if (stale) return stale.v;
    throw e;
  }
}

export interface WikiSummary {
  title: string;
  extract: string;
  url: string;
  thumb: string;
}

/** Short Wikipedia intro for a team / competition. Tries "<name> national football team"
 *  style variants so national sides resolve to the football article, not the country. */
export async function wikiSummary(name: string, hints: string[] = []): Promise<WikiSummary | null> {
  const tries = [...hints, name].filter(Boolean);
  try {
    return await cached(`wiki/${tries.join("|")}`, 7 * 86400, async () => {
      for (const t of tries) {
        const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, "_"))}`, {
          signal: AbortSignal.timeout(4000),
          headers: { accept: "application/json", "user-agent": "NinetyMins/1.0 (https://ninetymins.com)" },
        });
        if (!r.ok) continue;
        const j = (await r.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (j.type === "disambiguation" || !j.extract) continue;
        const extract = String(j.extract);
        // Country articles aren't about the team — skip them.
        if (!/football|soccer|club|team|basketball|cricket|league|championship/i.test(extract)) continue;
        return {
          title: String(j.title || t),
          extract: extract.length > 600 ? `${extract.slice(0, 600).replace(/\s\S*$/, "")}…` : extract,
          url: String(j.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(t)}`),
          thumb: String(j.thumbnail?.source || ""),
        };
      }
      return null;
    });
  } catch {
    return null;
  }
}

export interface Scorer {
  name: string;
  goals: number;
}

/** Bundesliga top scorers for the current season (OpenLigaDB, keyless). */
export async function bundesligaScorers(limit = 10): Promise<Scorer[]> {
  const now = new Date();
  const season = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  try {
    return await cached(`oldb/scorers/${season}`, 6 * 3600, async () => {
      const r = await fetch(`https://api.openligadb.de/getgoalgetters/bl1/${season}`, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`openligadb ${r.status}`);
      const j = (await r.json()) as Array<Record<string, unknown>>;
      return j
        .map((g) => ({ name: String(g.goalGetterName || ""), goals: Number(g.goalCount || 0) }))
        .filter((g) => g.name && g.goals > 0)
        .sort((a, b) => b.goals - a.goals)
        .slice(0, limit);
    });
  } catch {
    return [];
  }
}
