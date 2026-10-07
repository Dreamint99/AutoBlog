import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NmEvent } from "./live";

/* Cricket via CricketData.org (api.cricapi.com). The free plan allows ~100
   calls/day, so the whole live list comes from ONE call (currentMatches),
   cached per colo for FRESH_S and served stale for a day if the quota runs
   out. Match pages reuse that same list — they never spend extra calls.
   The key lives in the Worker secret CRICAPI_KEY (never in the repo). */

const FRESH_S = 1800;
const STALE_S = 86400;
const NS = "https://nm-live.autoblog.internal/v1/cricket";

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface CrInnings {
  inning: string;
  r: number;
  w: number;
  o: number;
}
export interface CrTeam {
  name: string;
  short: string;
  img: string;
  innings: CrInnings[];
  score: string;
}
export interface CrMatch {
  id: string;
  name: string;
  type: string;
  status: string;
  venue: string;
  date: string;
  state: "pre" | "in" | "post";
  teams: CrTeam[];
}

function apiKey(): string {
  try {
    const k = (getCloudflareContext().env as unknown as { CRICAPI_KEY?: string }).CRICAPI_KEY;
    if (k) return k;
  } catch {}
  return process.env.CRICAPI_KEY || "";
}

function edgeCache(): Cache | null {
  try {
    return (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default ?? null;
  } catch {
    return null;
  }
}

const fmtScore = (i: CrInnings) => `${i.r}/${i.w}${i.o ? ` (${i.o})` : ""}`;

function normalise(m: Any): CrMatch {
  const names: string[] = (m.teams as string[]) || [];
  const info: Any[] = m.teamInfo || [];
  const scores: Any[] = m.score || [];
  const teams = names.slice(0, 2).map((name): CrTeam => {
    const ti = info.find((t) => t.name === name) || {};
    const innings = scores
      .filter((s) => String(s.inning || "").toLowerCase().startsWith(name.toLowerCase()))
      .map((s) => ({ inning: String(s.inning || ""), r: Number(s.r || 0), w: Number(s.w || 0), o: Number(s.o || 0) }));
    return {
      name,
      short: String(ti.shortname || name.slice(0, 3).toUpperCase()),
      img: String(ti.img || ""),
      innings,
      score: innings.map(fmtScore).join(" & "),
    };
  });
  const gmt = String(m.dateTimeGMT || "");
  return {
    id: String(m.id || ""),
    name: String(m.name || names.join(" vs ")),
    type: String(m.matchType || "").toUpperCase(),
    status: String(m.status || ""),
    venue: String(m.venue || ""),
    date: gmt ? (gmt.endsWith("Z") ? gmt : `${gmt}Z`) : String(m.date || ""),
    state: m.matchEnded ? "post" : m.matchStarted ? "in" : "pre",
    teams,
  };
}

/** All current/recent/upcoming matches from one API call (cached). */
export async function getCricket(): Promise<CrMatch[]> {
  const key = apiKey();
  const cache = edgeCache();
  const req = new Request(`${NS}/current`);
  let stale: { t: number; v: CrMatch[] } | null = null;
  if (cache) {
    try {
      const hit = await cache.match(req);
      if (hit) {
        stale = await hit.json();
        if (stale && Date.now() - stale.t < FRESH_S * 1000) return stale.v;
      }
    } catch {
      stale = null;
    }
  }
  if (!key) return stale?.v ?? [];
  try {
    const r = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${encodeURIComponent(key)}&offset=0`, {
      signal: AbortSignal.timeout(6000),
    });
    const j = (await r.json()) as Any;
    if (j.status !== "success" || !Array.isArray(j.data)) throw new Error(String(j.reason || j.status || "cricapi error"));
    const v = (j.data as Any[])
      .map(normalise)
      .filter((m) => m.id && m.teams.length === 2)
      .sort((a, b) => ({ in: 0, pre: 1, post: 2 })[a.state] - ({ in: 0, pre: 1, post: 2 })[b.state] || a.date.localeCompare(b.date));
    if (cache) {
      const put = cache.put(req, new Response(JSON.stringify({ t: Date.now(), v }), { headers: { "cache-control": `public, s-maxage=${STALE_S}` } }));
      try {
        getCloudflareContext().ctx.waitUntil(put);
      } catch {
        await put.catch(() => {});
      }
    }
    return v;
  } catch {
    return stale?.v ?? []; // quota spent / API down → last good list
  }
}

export async function getCricketMatch(id: string): Promise<CrMatch | null> {
  return (await getCricket()).find((m) => m.id === id) ?? null;
}

/** Same shape as the ESPN events so the score strip / boards render cricket too. */
export function cricketToEvents(ms: CrMatch[]): NmEvent[] {
  return ms.map((m) => {
    const [a, b] = m.teams;
    const t = (x: CrTeam) => ({ name: x.name, abbr: x.short, logo: x.img, score: x.score, winner: m.state === "post" && m.status.toLowerCase().startsWith(x.name.toLowerCase()) });
    return {
      id: m.id,
      league: "cricket",
      leagueLabel: `Cricket${m.type ? ` · ${m.type}` : ""}`,
      state: m.state,
      detail: m.status,
      date: m.date,
      name: m.name,
      home: t(a),
      away: t(b),
    };
  });
}
