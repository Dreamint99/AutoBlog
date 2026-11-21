import { HUBS } from "./catalog";
import { IPL_RETAINED } from "./retentions";
import { matchPath, slugify, teamPath } from "./paths";
import type { Fx, LiveHit } from "./types";
import type { LeagueStats } from "./stats-type";
import statsJson from "./stats.json";

const STATS = statsJson as Record<string, LeagueStats>;

export type SquadPlayer = { name: string; overseas?: boolean; traded?: boolean };
export type TeamPage = {
  event: string;
  eventTitle: string;
  slug: string;
  name: string;
  index: boolean;
  players: SquadPlayer[];
  fixtures: Fx[];
  record?: { season: string; p: number; w: number; l: number; nr: number; form: string };
  h2h: { opponent: string; matches: number; wins: number; losses: number }[];
  summary: string;
};
export type MatchPage = {
  event: string;
  eventTitle: string;
  slug: string;
  index: boolean;
  fx: Fx;
  h2h?: { season: string; matches: number; homeWins: number; awayWins: number };
  summary: string;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

function recordOf(stats: LeagueStats | undefined, name: string) {
  const row = stats?.latest.teams.find((t) => norm(t.name) === norm(name));
  if (!row) return undefined;
  return { season: stats!.latest.season, p: row.p, w: row.w, l: row.l, nr: row.nr, form: row.form };
}

function h2hFor(stats: LeagueStats | undefined, name: string) {
  if (!stats) return [];
  const n = norm(name);
  return stats.latest.h2h.flatMap((h) => {
    if (norm(h.a) === n) return [{ opponent: h.b, matches: h.matches, wins: h.aWins, losses: h.bWins }];
    if (norm(h.b) === n) return [{ opponent: h.a, matches: h.matches, wins: h.bWins, losses: h.aWins }];
    return [];
  });
}

function pairH2H(stats: LeagueStats | undefined, home: string, away: string) {
  if (!stats) return undefined;
  const h = stats.latest.h2h.find((x) => (norm(x.a) === norm(home) && norm(x.b) === norm(away)) || (norm(x.a) === norm(away) && norm(x.b) === norm(home)));
  if (!h) return undefined;
  const homeWins = norm(h.a) === norm(home) ? h.aWins : h.bWins;
  const awayWins = h.matches - homeWins;
  return { season: stats.latest.season, matches: h.matches, homeWins, awayWins };
}

function teamIndex(players: number, fixtures: number, played?: number) {
  return players >= 8 || fixtures >= 2 || (played ?? 0) >= 4;
}

function matchIndex(fx: Fx) {
  return Boolean(fx.home && fx.away && (fx.start || fx.localDate) && (fx.city || fx.venue));
}

function buildEvent(event: string) {
  const hub = HUBS.find((h) => h.slug === event);
  if (!hub) return { teams: [] as TeamPage[], matches: [] as MatchPage[] };
  const stats = hub.statsKey ? STATS[hub.statsKey] : undefined;
  const names = new Map<string, string>();
  const add = (name?: string) => {
    if (!name) return;
    const key = norm(name);
    if (!names.has(key)) names.set(key, name);
  };
  if (hub.live.kind === "cricket") hub.live.teams.forEach(add);
  if (event === "ipl-2027") IPL_RETAINED.forEach((t) => add(t.team));
  hub.fixtures.forEach((f) => {
    add(f.home);
    add(f.away);
  });
  const teams: TeamPage[] = [...names.values()].map((name) => {
    const retained = event === "ipl-2027" ? IPL_RETAINED.find((t) => norm(t.team) === norm(name)) : undefined;
    const fixtures = hub.fixtures.filter((f) => norm(f.home || "") === norm(name) || norm(f.away || "") === norm(name));
    const record = recordOf(stats, name);
    const players = retained?.players.map((p) => ({ name: p.name, overseas: p.overseas, traded: p.traded })) || [];
    const named = fixtures.filter((f) => f.home && f.away);
    const index = teamIndex(players.length, named.length, record?.p);
    const bits = [`${name} in ${hub.h1}.`];
    if (players.length) bits.push(`${players.length} players are on the retained list published by the BCCI on 18 November 2026${retained?.purseLeftCr ? `, with ₹${retained.purseLeftCr} crore still to spend` : ""}.`);
    if (named.length) bits.push(`${named.length} fixtures on this page name ${name}.`);
    else bits.push("No fixture on this page names both sides yet.");
    if (record) bits.push(`In the Cricsheet ${record.season} file, ${name} played ${record.p}, won ${record.w}, lost ${record.l}${record.nr ? `, no-result ${record.nr}` : ""}.`);
    return { event, eventTitle: hub.h1, slug: slugify(name), name, index, players, fixtures, record, h2h: h2hFor(stats, name), summary: bits.join(" ") };
  });
  const matches: MatchPage[] = hub.fixtures.map((fx) => {
    const h2h = fx.home && fx.away ? pairH2H(stats, fx.home, fx.away) : undefined;
    const index = matchIndex(fx);
    const when = fx.start || fx.localDate || "a date that has not been published";
    const place = [...new Set([fx.venue, fx.city].filter(Boolean))].join(", ") || "a venue that has not been published";
    const summary = fx.home && fx.away
      ? `${fx.home} play ${fx.away} in ${hub.h1} on ${when} at ${place}.${h2h ? ` Cricsheet ${h2h.season} has ${h2h.matches} meetings, ${h2h.homeWins} won by ${fx.home}.` : " Cricsheet has no meeting for this pair in the latest season file."}`
      : `${fx.name} in ${hub.h1} is scheduled for ${when} at ${place}. The two teams are not in the organizer list yet.`;
    return { event, eventTitle: hub.h1, slug: slugify(fx.id), index, fx, h2h, summary };
  });
  return { teams, matches };
}

const CACHE = new Map<string, ReturnType<typeof buildEvent>>();
function built(event: string) {
  if (!CACHE.has(event)) CACHE.set(event, buildEvent(event));
  return CACHE.get(event)!;
}

export function getEventTeam(event: string, team: string): TeamPage | undefined {
  return built(event).teams.find((t) => t.slug === team);
}
export function getEventMatch(event: string, id: string): MatchPage | undefined {
  return built(event).matches.find((m) => m.slug === id);
}
export function eventTeams(event: string): TeamPage[] {
  return built(event).teams;
}
export function knownTeam(event: string, name: string): boolean {
  return built(event).teams.some((t) => t.slug === slugify(name));
}

/** A live-board row with both sides. The page exists even when the feed has no kick-off; it stays noindex until a time and a venue are present. */
export function feedMatch(event: string, hit: LiveHit): MatchPage | null {
  const hub = HUBS.find((h) => h.slug === event);
  if (!hub || !hit.home || !hit.away) return null;
  const id = `feed-${hit.id}`;
  const fx: Fx = {
    id,
    name: `${hit.home} vs ${hit.away}`,
    stage: "Live board",
    ...(hit.date ? { start: hit.date } : {}),
    home: hit.home,
    away: hit.away,
    venue: hit.venue,
    city: hit.venue,
    note: "On the live board. It was not in the organizer list shipped with this page.",
    schema: "sports",
  };
  const stats = hub.statsKey ? STATS[hub.statsKey] : undefined;
  const h2h = pairH2H(stats, hit.home, hit.away);
  const when = hit.date ? ` at ${hit.date}` : "";
  const where = hit.venue ? ` (${hit.venue})` : "";
  return {
    event,
    eventTitle: hub.h1,
    slug: slugify(id),
    index: matchIndex(fx),
    fx,
    h2h,
    summary: `${hit.home} play ${hit.away} in ${hub.h1}. The live board lists this match${when}${where}.`,
  };
}

/** Hub cards used to link `live-<id>` while this file stored `feed-<id>`. Both resolve. */
export function feedMatchBySlug(event: string, slug: string, hits: LiveHit[]): MatchPage | undefined {
  for (const hit of hits) {
    const page = feedMatch(event, hit);
    if (!page) continue;
    if (page.slug === slug || slugify(`live-${hit.id}`) === slug) return page;
  }
  return undefined;
}

export function sitemapEventPages(): { path: string }[] {
  const out: { path: string }[] = [];
  for (const hub of HUBS) {
    const { teams, matches } = built(hub.slug);
    for (const t of teams) if (t.index) out.push({ path: teamPath(hub.slug, t.name) });
    for (const m of matches) if (m.index) out.push({ path: matchPath(hub.slug, m.fx.id) });
  }
  return out;
}
