import "server-only";
import { cache } from "react";
import { d1 } from "@/lib/data";
import { getMatch, type NmMatch, type NmSide } from "./live";

export interface FixtureSide { id: string; name: string; short: string; abbr: string; color: string; score: string; detail: string; winner: boolean; national: boolean }
export interface FixtureEvent {
  id: string; sport: string; league: string; leagueName: string; state: "pre" | "in" | "post";
  detail: string; clock: string; date: string; home: FixtureSide; away: FixtureSide; tag: string; venue: string; tv?: string[];
}
export interface Fixture {
  key: string; path: string; league: string; home_slug: string; away_slug: string;
  starts: string; state: string; ev_json: string; created_at: string; lastmod: string; result_at: string | null; ev: FixtureEvent;
}
const COLS = "key,path,league,home_slug,away_slug,starts,state,ev_json,created_at,lastmod,result_at";
const parse = (rows: Omit<Fixture, "ev">[]) => rows.map(r => ({ ...r, ev: JSON.parse(r.ev_json) as FixtureEvent }));
export async function fixtures(where = "1=1", values: unknown[] = [], limit = 250): Promise<Fixture[]> {
  const db = d1();
  if (!db) return [];
  const r = await db.prepare(`SELECT ${COLS} FROM seo_matches WHERE ${where} ORDER BY starts DESC LIMIT ?`).bind(...values, limit).all<Omit<Fixture, "ev">>();
  return parse(r.results);
}
export const fixtureById = cache(async (league: string, id: string) => (await fixtures("league=? AND json_extract(ev_json,'$.id')=?", [league, id], 1))[0] || null);
export const fixtureByPath = cache(async (path: string) => (await fixtures("path=?", [path], 1))[0] || null);
export const leagueFixtures = cache(async (league: string) => fixtures("league=?", [league], 500));
export const teamFixtures = cache(async (slug: string) => fixtures("home_slug=? OR away_slug=?", [slug, slug], 250));
export const recentFixtures = cache(async () => fixtures("starts>=?", [new Date(Date.now() - 2 * 86400000).toISOString()], 500));

export async function months(): Promise<string[]> {
  const db = d1();
  if (!db) return [];
  return (await db.prepare("SELECT DISTINCT substr(starts,1,7) AS month FROM seo_matches ORDER BY month DESC").all<{ month: string }>()).results.map(x => x.month);
}
export async function hubs(): Promise<{ path: string; lastmod: string }[]> {
  const db = d1();
  if (!db) return [];
  return (await db.prepare(`SELECT '/league/'||league AS path, MAX(lastmod) AS lastmod FROM seo_matches GROUP BY league
    UNION ALL SELECT '/team/'||slug AS path, MAX(lastmod) AS lastmod FROM
    (SELECT home_slug AS slug,lastmod FROM seo_matches UNION ALL SELECT away_slug AS slug,lastmod FROM seo_matches) GROUP BY slug
    UNION ALL SELECT path,lastmod FROM seo_players`).all<{ path: string; lastmod: string }>()).results;
}

export interface Player { path: string; lastmod: string; body: string; data: { name: string; birthDate: string; height: string; nationality: string; jersey: string; position: string; team: string; teamSlug: string; league: string; season: string; stats: { key: string; label: string; value: string; numeric: number }[]; source: string } }
export async function players(column: "path" | "team_slug" | "league", value: string): Promise<Player[]> {
  const db = d1();
  if (!db) return [];
  return (await db.prepare(`SELECT path,lastmod,body FROM seo_players WHERE ${column}=?`).bind(value).all<Omit<Player, "data">>()).results.map(p => ({ ...p, data: JSON.parse(p.body) }));
}

export const loadMatch = cache(async (leagueSlug: string, id: string): Promise<{ match: NmMatch; fixture: Fixture | null } | null> => {
  const f = await fixtureById(leagueSlug, id);
  const league = f?.ev.league || leagueSlug.replace(/-/g, ".");
  const m = await getMatch(league, id);
  if (m) return { match: m, fixture: f };
  if (!f) return null;
  const e = f.ev;
  const side = (s: FixtureSide): NmSide => ({ ...s, full: s.name, logo: "", shootout: "", form: "" });
  const db = d1();
  const details = db ? (await db.prepare("SELECT body FROM seo_match_details WHERE key=?").bind(f.key).all<{ body: string }>()).results[0] : null;
  const saved = details ? JSON.parse(details.body) : null;
  // Permanent fallback is factual persisted data, never an invented empty match.
  return { fixture: f, match: { id, league: e.league, leagueLabel: e.leagueName, sport: e.sport, state: e.state, detail: e.detail,
    clock: e.clock, date: e.date, venue: e.venue, city: "", attendance: 0, referee: "", home: side(e.home), away: side(e.away), events: saved?.events || [], stats: saved?.stats?.filter(Boolean) || [], lineups: saved?.lineups?.map((l: { side: string; team?: string; formation: string; starters: unknown[]; subs: unknown[] }) => ({ ...l, team: l.team || (l.side === "home" ? e.home.name : e.away.name) })) || [], commentary: saved?.commentary || [] } };
});

export function sourceUrl(e: FixtureEvent) {
  const sport = ({ football: "soccer", basketball: "basketball", nfl: "football", hockey: "hockey", baseball: "baseball", tennis: "tennis", mma: "mma", cricket: "cricket" } as Record<string, string>)[e.sport];
  return `https://site.api.espn.com/apis/site/v2/sports/${sport}/${e.league}/summary?event=${e.id}`;
}
export const answer = (m: NmMatch) => m.state === "pre"
  ? `${m.home.full} face ${m.away.full} in ${m.leagueLabel} on ${new Date(m.date).toUTCString()}${m.venue ? ` at ${m.venue}` : ""}.`
  : `${m.home.full} ${m.home.score}–${m.away.score} ${m.away.full} in ${m.leagueLabel}. ${m.detail}${m.venue ? ` · ${m.venue}` : ""}.`;

export async function isPruned(site: string, slug: string): Promise<boolean> {
  const db = d1();
  if (!db) return false;
  return (await db.prepare("SELECT slug FROM seo_pruning WHERE site_id=? AND slug=?").bind(site, slug).all()).results.length > 0;
}
export async function prunedSlugs(site: string): Promise<Set<string>> {
  const db = d1();
  if (!db) return new Set();
  return new Set((await db.prepare("SELECT slug FROM seo_pruning WHERE site_id=?").bind(site).all<{ slug: string }>()).results.map(x => x.slug));
}
