// Head-to-head pages: one per team pair that has a fixture in seo_matches.
// Facts only: ESPN's listed meetings + last-five form (seo_match_details), our recorded fixtures,
// and (football, upcoming) the existing Poisson model via Insights.
import "server-only";
import { cache } from "react";
import { d1 } from "@/lib/data";
import { fixtures, type Fixture } from "./engine";

export interface Meeting { date: string; hid?: string; aid?: string; home: string; away: string; hs: string; as: string; winner: "home" | "away" | "draw"; path?: string; comp?: string }
export interface FormGame { date: string; opp: string; at: "home" | "away"; score: string; result: string; comp: string; path?: string }
export interface H2H {
  slug: string;
  a: { slug: string; name: string; color: string };
  b: { slug: string; name: string; color: string };
  sport: string;
  fixtures: Fixture[]; // between the pair, newest first
  next: Fixture | null;
  last: Fixture | null;
  summary: string; // ESPN series line, e.g. "MNC leads series 5-0"
  meetings: Meeting[];
  record: { a: number; b: number; draw: number };
  formA: FormGame[];
  formB: FormGame[];
  indexable: boolean;
}

const TEAM = /^([a-z0-9-]+?-\d+)-vs-([a-z0-9-]+?-\d+)$/;
export const pairSlug = (x: string, y: string) => (x < y ? `${x}-vs-${y}` : `${y}-vs-${x}`);
export const h2hPath = (x: string, y: string) => `/h2h/${pairSlug(x, y)}`;
export function parsePair(slug: string): [string, string] | null {
  const m = TEAM.exec(slug);
  return m && m[1] !== m[2] ? [m[1], m[2]] : null;
}

const same = (x: string, y: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "") === y.toLowerCase().replace(/[^a-z0-9]/g, "");
const sideName = (f: Fixture, slug: string) => (f.home_slug === slug ? f.ev.home : f.ev.away);

/** Last five finished games of one team from our own catalogue (all competitions). */
async function ownForm(slug: string): Promise<FormGame[]> {
  const fs = await fixtures("(home_slug=? OR away_slug=?) AND state='post'", [slug, slug], 5);
  return fs.map((f) => {
    const home = f.home_slug === slug;
    const me = home ? f.ev.home : f.ev.away, op = home ? f.ev.away : f.ev.home;
    const result = me.winner ? "W" : op.winner ? "L" : me.score !== "" && me.score === op.score ? "D" : "";
    return { date: f.starts, opp: op.name, at: home ? "home" : "away", score: `${f.ev.home.score}-${f.ev.away.score}`, result, comp: f.ev.leagueName, path: f.path };
  });
}

export const getH2H = cache(async (slug: string): Promise<H2H | null> => {
  const pair = parsePair(slug);
  const db = d1();
  if (!pair || !db) return null;
  const [x, y] = pair;
  const fs = await fixtures("(home_slug=? AND away_slug=?) OR (home_slug=? AND away_slug=?)", [x, y, y, x], 50);
  if (!fs.length) return null;
  const f0 = fs[0];
  const A = sideName(f0, x), B = sideName(f0, y);
  const a = { slug: x, name: A.name, color: A.color }, b = { slug: y, name: B.name, color: B.color };
  const now = Date.now();
  const next = [...fs].reverse().find((f) => f.state !== "post" && Date.parse(f.starts) > now - 4 * 3600000) || null;
  const last = fs.find((f) => f.state === "post") || null;

  // Newest stored ESPN summary for any fixture of the pair carries `series` + `form`.
  const keys = fs.map((f) => f.key);
  const rows = (await db.prepare(`SELECT key,body FROM seo_match_details WHERE key IN (${keys.map(() => "?").join(",")}) ORDER BY checked_at DESC`).bind(...keys).all<{ key: string; body: string }>()).results;
  let summary = "";
  const espnMeetings: Meeting[] = [];
  let formA: FormGame[] = [], formB: FormGame[] = [];
  for (const r of rows) {
    const body = JSON.parse(r.body) as { series?: { summary: string; events: Meeting[] } | null; form?: { id?: string; team: string; games: FormGame[] }[] };
    if (!summary && body.series?.summary) summary = body.series.summary;
    if (!espnMeetings.length && body.series?.events?.length) espnMeetings.push(...body.series.events);
    if (!formA.length && body.form?.length) {
      for (const t of body.form) {
        if ((t.id && t.id === A.id) || same(t.team, A.name) || same(t.team, A.short)) formA = t.games;
        else if ((t.id && t.id === B.id) || same(t.team, B.name) || same(t.team, B.short)) formB = t.games;
      }
          }
  }
  if (!formA.length) formA = await ownForm(x);
  if (!formB.length) formB = await ownForm(y);

  // Meetings: ESPN's list plus our finished fixtures (dedupe by day).
  const ours: Meeting[] = fs.filter((f) => f.state === "post").map((f) => ({
    date: f.starts, hid: f.ev.home.id, aid: f.ev.away.id, home: f.ev.home.name, away: f.ev.away.name, hs: f.ev.home.score, as: f.ev.away.score,
    winner: f.ev.home.winner ? "home" : f.ev.away.winner ? "away" : "draw", path: f.path, comp: f.ev.leagueName,
  }));
  const byDay = new Map<string, Meeting>();
  for (const m of [...ours, ...espnMeetings]) { const d = m.date.slice(0, 10); if (!byDay.has(d)) byDay.set(d, m); }
  const meetings = [...byDay.values()].sort((p, q) => q.date.localeCompare(p.date)).slice(0, 12);

  const record = { a: 0, b: 0, draw: 0 };
  for (const m of meetings) {
    if (m.winner === "draw") { record.draw++; continue; }
    const wid = m.winner === "home" ? m.hid : m.aid, wname = m.winner === "home" ? m.home : m.away;
    if (wid ? wid === A.id : same(wname, A.name) || same(wname, A.short)) record.a++; else record.b++;
  }
  const indexable = meetings.length > 0 || (formA.length >= 3 && formB.length >= 3);
  return { slug: pairSlug(x, y), a, b, sport: f0.ev.sport, fixtures: fs, next, last, summary, meetings, record, formA, formB, indexable };
});

/** Every pair for the sitemap, newest activity first. */
export async function allPairs(): Promise<{ slug: string; lastmod: string }[]> {
  const db = d1();
  if (!db) return [];
  const r = await db.prepare(`SELECT CASE WHEN home_slug<away_slug THEN home_slug||'-vs-'||away_slug ELSE away_slug||'-vs-'||home_slug END AS slug, MAX(lastmod) AS lastmod
    FROM seo_matches m WHERE home_slug<>'' AND away_slug<>'' AND home_slug<>away_slug GROUP BY slug
    -- same rule as indexable: a finished meeting on record, or ESPN's list of past meetings
    HAVING SUM(state='post') > 0 OR SUM(EXISTS(SELECT 1 FROM seo_match_details d WHERE d.key=m.key AND json_array_length(json_extract(d.body,'$.series.events')) > 0)) > 0
    ORDER BY lastmod DESC LIMIT 50000`).all<{ slug: string; lastmod: string }>();
  return r.results.filter((p) => parsePair(p.slug));
}
