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
  "uefa.europa": { label: "Europa League", path: "soccer/uefa.europa" },
  "usa.1": { label: "MLS", path: "soccer/usa.1" },
  "ind.1": { label: "Indian Super League", path: "soccer/ind.1", table: true },
  "fifa.worldq.afc": { label: "World Cup Qualifiers (AFC)", path: "soccer/fifa.worldq.afc" },
  "afc.asian.cupq": { label: "AFC Asian Cup Qualifiers", path: "soccer/afc.asian.cupq" },
  "fifa.friendly": { label: "International Friendlies", path: "soccer/fifa.friendly" },
  nba: { label: "NBA", path: "basketball/nba" },
  f1: { label: "Formula 1", path: "racing/f1" },
  atp: { label: "ATP Tennis", path: "tennis/atp" },
  // Not ESPN: served by cricket.ts (CricketData.org), see getScores.
  cricket: { label: "Cricket", path: "cricket/cricapi" },
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

/** URL-safe league key: "eng.1" ⇄ "eng-1" (dots in a path look like a file to the middleware). */
export const leagueToSlug = (l: string) => l.replace(/\./g, "-");
export function slugToLeague(s: string): string | null {
  const l = Object.keys(NM_LEAGUES).find((k) => leagueToSlug(k) === s);
  return l ?? null;
}

/** Scoreboard for one league; `date` = YYYYMMDD (ESPN's current window when omitted). */
export async function getScores(league: string, date = ""): Promise<NmEvent[]> {
  const L = NM_LEAGUES[league];
  if (!L) return [];
  if (league === "cricket") {
    // CricketData has no per-day board on the free plan — today's list only.
    if (date) return [];
    const { getCricket, cricketToEvents } = await import("./cricket");
    return cricketToEvents(await getCricket());
  }
  if (date && !/^\d{8}$/.test(date)) date = "";
  try {
    return await cached(`scores/${league}/${date || "now"}`, date ? 300 : FRESH_S, async () => {
      const j = await getJson(`${API}/site/v2/sports/${L.path}/scoreboard${date ? `?dates=${date}` : ""}`);
      return ((j.events as Any[]) || []).slice(0, 40).map((e): NmEvent => {
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
  if (!L?.table || league === "cricket") return [];
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

/* ── Match centre (one game) ─────────────────────────────── */

export interface NmSide extends NmTeam {
  full: string;
  color: string;
  shootout: string;
  form: string;
}
export interface NmKeyEvent {
  min: string;
  kind: "goal" | "own" | "pen" | "yellow" | "red" | "sub" | "period" | "other";
  side: "home" | "away" | "";
  text: string;
  player: string;
}
export interface NmStat {
  label: string;
  home: string;
  away: string;
}
export interface NmPlayer {
  n: string;
  name: string;
  pos: string;
  subIn: boolean;
  subOut: boolean;
}
export interface NmLineup {
  side: "home" | "away";
  team: string;
  formation: string;
  starters: NmPlayer[];
  subs: NmPlayer[];
}
export interface NmMatch {
  id: string;
  league: string;
  leagueLabel: string;
  sport: string;
  state: "pre" | "in" | "post";
  detail: string;
  clock: string;
  date: string;
  venue: string;
  city: string;
  attendance: number;
  referee: string;
  home: NmSide;
  away: NmSide;
  events: NmKeyEvent[];
  stats: NmStat[];
  lineups: NmLineup[];
  commentary: Array<{ min: string; text: string }>;
}

function side(c: Any | undefined): NmSide {
  const t = c?.team || {};
  const logo = t.logo || t.logos?.[0]?.href || "";
  return {
    name: String(t.shortDisplayName || t.displayName || t.name || "TBD"),
    full: String(t.displayName || t.name || t.shortDisplayName || "TBD"),
    abbr: String(t.abbreviation || "").slice(0, 4),
    logo: String(logo),
    score: c?.score != null ? String(typeof c.score === "object" ? c.score.displayValue ?? "" : c.score) : "",
    winner: !!c?.winner,
    color: /^[0-9a-f]{6}$/i.test(String(t.color || "")) ? `#${t.color}` : "",
    shootout: c?.shootoutScore != null ? String(c.shootoutScore) : "",
    form: String(c?.form || ""),
  };
}

function kindOf(e: Any): NmKeyEvent["kind"] {
  const t = `${e.type?.text || ""} ${e.type?.type || ""}`.toLowerCase();
  if (/own goal/.test(t)) return "own";
  if (/penalty/.test(t) && /scored|goal/.test(t)) return "pen";
  if (e.scoringPlay || /goal/.test(t)) return "goal";
  if (/red card|second yellow/.test(t)) return "red";
  if (/yellow/.test(t)) return "yellow";
  if (/substitution/.test(t)) return "sub";
  if (/half|kickoff|full|end|start/.test(t)) return "period";
  return "other";
}

function player(p: Any): NmPlayer {
  return {
    n: String(p.jersey ?? ""),
    name: String(p.athlete?.displayName || p.athlete?.shortName || ""),
    pos: String(p.position?.abbreviation || ""),
    subIn: !!p.subbedIn,
    subOut: !!p.subbedOut,
  };
}

export async function getMatch(league: string, id: string): Promise<NmMatch | null> {
  const L = NM_LEAGUES[league];
  if (!L || league === "cricket" || !/^\d{1,12}$/.test(id)) return null;
  try {
    return await cached(`match/${league}/${id}`, 30, async () => {
      const j = await getJson(`${API}/site/v2/sports/${L.path}/summary?event=${id}`);
      const comp = j.header?.competitions?.[0] || {};
      const cs: Any[] = comp.competitors || [];
      const hc = cs.find((c) => c.homeAway === "home") || cs[0];
      const ac = cs.find((c) => c.homeAway === "away") || cs[1];
      if (!hc || !ac) throw new Error("not a two-sided event");
      const home = side(hc);
      const away = side(ac);
      const st = comp.status?.type || {};
      const homeId = String(hc.team?.id || hc.id || "");
      const sideOf = (t: Any): NmKeyEvent["side"] => {
        if (!t) return "";
        const tid = String(t.id || "");
        if (tid && homeId) return tid === homeId ? "home" : "away";
        const n = String(t.displayName || "");
        return n === home.full ? "home" : n === away.full ? "away" : "";
      };
      const gi = j.gameInfo || {};
      const venue = gi.venue || comp.venue || {};

      const events: NmKeyEvent[] = ((j.keyEvents as Any[]) || [])
        .map((e) => ({
          min: String(e.clock?.displayValue || ""),
          kind: kindOf(e),
          side: sideOf(e.team),
          text: String(e.text || e.shortText || e.type?.text || ""),
          player: String(e.participants?.[0]?.athlete?.displayName || ""),
        }))
        .filter((e) => e.kind !== "other" || e.text)
        .slice(0, 60);

      const bt: Any[] = j.boxscore?.teams || [];
      const bHome = bt.find((t) => String(t.team?.id || "") === homeId) || bt[1] || bt[0];
      const bAway = bt.find((t) => t !== bHome);
      const stats: NmStat[] = ((bHome?.statistics as Any[]) || [])
        .map((s) => {
          const other = ((bAway?.statistics as Any[]) || []).find((o) => o.name === s.name);
          return { label: String(s.label || s.name || ""), home: String(s.displayValue ?? ""), away: String(other?.displayValue ?? "") };
        })
        .filter((s) => s.label && (s.home || s.away))
        .slice(0, 16);

      const lineups: NmLineup[] = ((j.rosters as Any[]) || [])
        .map((r): NmLineup => {
          const roster: Any[] = r.roster || [];
          const sd = r.homeAway === "away" ? "away" : r.homeAway === "home" ? "home" : sideOf(r.team) || "home";
          return {
            side: sd,
            team: String(r.team?.displayName || ""),
            formation: String(r.formation || ""),
            starters: roster.filter((p) => p.starter).map(player),
            subs: roster.filter((p) => !p.starter).map(player).slice(0, 12),
          };
        })
        .filter((l) => l.starters.length);

      const commentary = ((j.commentary as Any[]) || [])
        .map((c) => ({ min: String(c.time?.displayValue || ""), text: String(c.text || "") }))
        .filter((c) => c.text)
        .reverse()
        .slice(0, 25);

      return {
        id,
        league,
        leagueLabel: L.label,
        sport: L.path.split("/")[0],
        state: st.state === "in" ? "in" : st.state === "post" ? "post" : "pre",
        detail: String(st.shortDetail || st.detail || st.description || ""),
        clock: String(comp.status?.displayClock || ""),
        date: String(comp.date || ""),
        venue: String(venue.fullName || ""),
        city: [venue.address?.city, venue.address?.country].filter(Boolean).join(", "),
        attendance: Number(gi.attendance || 0),
        referee: String(gi.officials?.[0]?.displayName || gi.officials?.[0]?.fullName || ""),
        home,
        away,
        events,
        stats,
        lineups,
        commentary,
      } satisfies NmMatch;
    });
  } catch {
    return null;
  }
}

/** "arsenal-vs-chelsea" — readable tail for match URLs. */
export function matchSlug(home: string, away: string): string {
  const s = (x: string) => x.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${s(home)}-vs-${s(away)}`.slice(0, 80);
}

/** Site-relative match-centre path (clean, single-site form). */
export function matchPath(league: string, id: string, home: string, away: string): string {
  return `/match/${leagueToSlug(league)}/${id}-${matchSlug(home, away)}`;
}
