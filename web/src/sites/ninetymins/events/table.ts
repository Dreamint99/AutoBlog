import type { Fx, LiveHit } from "./types";
import type { LeagueStats } from "./stats-type";

export type TableRow = { name: string; p: number; w: number; l: number; nr: number; pts: number; form: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Win 2, no-result 1, loss 0. Net run rate is not invented from a one-line score. */
export function points(w: number, nr: number) {
  return w * 2 + nr;
}

function blank(name: string): TableRow {
  return { name, p: 0, w: 0, l: 0, nr: 0, pts: 0, form: "" };
}

function add(row: TableRow, outcome: "W" | "L" | "NR") {
  row.p += 1;
  if (outcome === "W") row.w += 1;
  else if (outcome === "L") row.l += 1;
  else row.nr += 1;
  row.pts = points(row.w, row.nr);
  row.form = (row.form + outcome).slice(-5);
}

/** How a completed live-board match finished, or null if the status is not explicit. */
export function outcomeOf(hit: LiveHit): { winner?: string; nr: boolean } | null {
  if (hit.state !== "post") return null;
  const status = hit.detail || "";
  if (/no result|abandoned|tie|draw/i.test(status)) return { nr: true };
  const home = norm(hit.home);
  const away = norm(hit.away);
  const text = norm(status);
  if (home && text.startsWith(home)) return { winner: hit.home, nr: false };
  if (away && text.startsWith(away)) return { winner: hit.away, nr: false };
  return null;
}

function day(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/**
 * Points from the Cricsheet season, plus completed live-board matches dated after that file.
 * Live matches are not mixed into an older season: if any are newer, the table is only those.
 */
export function buildTable(stats: LeagueStats | null, live: LiveHit[], teams: string[]): { title: string; note: string; rows: TableRow[] } | null {
  const named = new Set(teams.map(norm));
  const allow = (name: string) => named.size === 0 || named.has(norm(name));
  const newer = live.filter((h) => {
    if (!allow(h.home) || !allow(h.away)) return false;
    if (!stats?.latest.to) return h.state === "post";
    return h.state === "post" && day(h.date) > stats.latest.to;
  });
  if (newer.length) {
    const rows = new Map<string, TableRow>();
    const row = (name: string) => {
      const key = norm(name);
      if (!rows.has(key)) rows.set(key, blank(name));
      return rows.get(key)!;
    };
    for (const hit of [...newer].sort((a, b) => a.date.localeCompare(b.date))) {
      const o = outcomeOf(hit);
      if (!o) continue;
      if (o.nr) {
        add(row(hit.home), "NR");
        add(row(hit.away), "NR");
      } else if (o.winner) {
        add(row(o.winner), "W");
        add(row(o.winner === hit.home ? hit.away : hit.home), "L");
      }
    }
    const list = [...rows.values()].filter((r) => r.p).sort((a, b) => b.pts - a.pts || b.w - a.w || a.name.localeCompare(b.name));
    if (!list.length) return null;
    return {
      title: "This competition, from completed matches on the live board",
      note: "2 points for a win and 1 for a no-result. Matches already inside the Cricsheet file are not counted again. Net run rate waits for the weekly Cricsheet ingest.",
      rows: list,
    };
  }
  if (!stats) return null;
  const rows = stats.latest.teams.filter((t) => allow(t.name)).map((t) => ({
    name: t.name, p: t.p, w: t.w, l: t.l, nr: t.nr, pts: points(t.w, t.nr), form: t.form,
  }));
  if (!rows.length) return null;
  return {
    title: `${stats.label} ${stats.latest.season}, from Cricsheet`,
    note: "2 points for a win and 1 for a no-result, counted on the matches in that file (playoffs included). This is the last season in the file, not a table the organizer has not published.",
    rows,
  };
}

/** Upcoming live-board matches that are not already on the organizer list. */
export function extraFixtures(existing: Fx[], live: LiveHit[], teams: string[]): Fx[] {
  const named = new Set(teams.map(norm));
  const have = new Set(existing.map((f) => {
    const d = (f.start || f.localDate || "").slice(0, 10);
    return `${d}|${norm(f.home || "")}|${norm(f.away || "")}`;
  }));
  const out: Fx[] = [];
  for (const hit of live) {
    if (hit.state === "post") continue;
    if (!hit.date || !hit.home || !hit.away) continue;
    if (named.size && (!named.has(norm(hit.home)) || !named.has(norm(hit.away)))) continue;
    const d = day(hit.date);
    const key = `${d}|${norm(hit.home)}|${norm(hit.away)}`;
    const swap = `${d}|${norm(hit.away)}|${norm(hit.home)}`;
    if (have.has(key) || have.has(swap)) continue;
    have.add(key);
    out.push({
      id: `feed-${hit.id}`,
      name: `${hit.home} vs ${hit.away}`,
      stage: "Live board",
      start: hit.date,
      home: hit.home,
      away: hit.away,
      note: "On the existing scoreboard. It was not in the organizer list used for this page.",
      schema: "sports",
    });
  }
  return out;
}
