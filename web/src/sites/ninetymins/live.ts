import "server-only";

/* Free, keyless live data for NinetyMins via ESPN's public site API.
   It is undocumented: shapes can change and it can disappear, so everything
   here is defensive — callers get [] / null and the UI simply hides itself.
   Normalised results are kept per colo in the Cache API (fresh FRESH_S, served
   stale for up to a day if ESPN errors) so ESPN is hit ~once a minute per
   league per colo, and the big upstream JSON is parsed at most that often. */

export interface NmTeam {
  name: string;
  abbr: string;
  logo: string;
  score: string;
  winner: boolean;
}
export interface NmEvent {
  id: string;
  league: string;
  leagueLabel: string;
  state: "pre" | "in" | "post";
  detail: string;
  date: string;
  name: string;
  home: NmTeam | null;
  away: NmTeam | null;
}
export interface NmStanding {
  rank: number;
  team: string;
  abbr: string;
  logo: string;
  played: number;
  points: number;
  gd: number;
}

export const NM_LEAGUES: Record<string, { label: string; path: string; table?: boolean }> = {
  "eng.1": { label: "Premier League", path: "soccer/eng.1", table: true },
  "uefa.champions": { label: "Champions League", path: "soccer/uefa.champions" },
  "esp.1": { label: "LaLiga", path: "soccer/esp.1", table: true },
  "ita.1": { label: "Serie A", path: "soccer/ita.1", table: true },
  "ger.1": { label: "Bundesliga", path: "soccer/ger.1", table: true },
  "fra.1": { label: "Ligue 1", path: "soccer/fra.1", table: true },
  "usa.1": { label: "MLS", path: "soccer/usa.1" },
  nba: { label: "NBA", path: "basketball/nba" },
  f1: { label: "Formula 1", path: "racing/f1" },
  atp: { label: "ATP Tennis", path: "tennis/atp" },
};

const API = "https://site.api.espn.com/apis";
const NS = "https://nm-live.autoblog.internal/v1";
const FRESH_S = 60;
const STALE_S = 86400;

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function edgeCache(): Cache | null {
  try {
    return (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default ?? null;
  } catch {
    return null;
  }
}

async function cached<T>(key: string, fresh: number, read: () => Promise<T>): Promise<T> {
  const cache = edgeCache();
  const req = new Request(`${NS}/${key}`);
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
    if (cache) {
      await cache
        .put(req, new Response(JSON.stringify({ t: Date.now(), v }), { headers: { "cache-control": `public, s-maxage=${STALE_S}` } }))
        .catch(() => {});
    }
    return v;
  } catch (e) {
    if (stale) return stale.v;
    throw e;
  }
}

async function getJson(url: string): Promise<Any> {
  const r = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`ESPN ${r.status}`);
  return (await r.json()) as Any;
}

function team(c: Any | undefined): NmTeam | null {
  if (!c) return null;
  const t = c.team || c.athlete || {};
  return {
    name: String(t.shortDisplayName || t.displayName || t.name || ""),
    abbr: String(t.abbreviation || t.shortDisplayName || "").slice(0, 4),
    logo: String(t.logo || t.flag?.href || ""),
    score: c.score != null ? String(c.score) : "",
    winner: !!c.winner,
  };
}

export async function getScores(league: string): Promise<NmEvent[]> {
  const L = NM_LEAGUES[league];
  if (!L) return [];
  try {
    return await cached(`scores/${league}`, FRESH_S, async () => {
      const j = await getJson(`${API}/site/v2/sports/${L.path}/scoreboard`);
      return ((j.events as Any[]) || []).slice(0, 20).map((e): NmEvent => {
        const comp = (e.competitions || [])[0] || {};
        const cs: Any[] = comp.competitors || [];
        const st = e.status?.type || comp.status?.type || {};
        const two = cs.length === 2;
        return {
          id: String(e.id),
          league,
          leagueLabel: L.label,
          state: st.state === "in" ? "in" : st.state === "post" ? "post" : "pre",
          detail: String(st.shortDetail || st.detail || st.description || ""),
          date: String(e.date || ""),
          name: String(e.shortName || e.name || ""),
          home: two ? team(cs.find((c) => c.homeAway === "home") || cs[0]) : null,
          away: two ? team(cs.find((c) => c.homeAway === "away") || cs[1]) : null,
        };
      });
    });
  } catch {
    return [];
  }
}

export async function getStandings(league: string): Promise<NmStanding[]> {
  const L = NM_LEAGUES[league];
  if (!L?.table) return [];
  try {
    return await cached(`table/${league}`, 1800, async () => {
      const j = await getJson(`${API}/v2/sports/${L.path}/standings`);
      const entries: Any[] = j.children?.[0]?.standings?.entries || j.standings?.entries || [];
      const stat = (e: Any, n: string) => Number((e.stats || []).find((s: Any) => s.name === n)?.value ?? 0);
      return entries
        .map((e) => ({
          rank: stat(e, "rank") || 0,
          team: String(e.team?.shortDisplayName || e.team?.displayName || ""),
          abbr: String(e.team?.abbreviation || ""),
          logo: String(e.team?.logos?.[0]?.href || ""),
          played: stat(e, "gamesPlayed"),
          points: stat(e, "points"),
          gd: stat(e, "pointDifferential"),
        }))
        .sort((a, b) => (a.rank || 99) - (b.rank || 99) || b.points - a.points)
        .map((s, i) => ({ ...s, rank: s.rank || i + 1 }));
    });
  } catch {
    return [];
  }
}
