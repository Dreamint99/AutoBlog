// Official highlight videos kept by nm-api (tv.ts → D1 seo_highlights). One page per video.
import { cache } from "react";
import { d1 } from "@/lib/data";

export interface Highlight {
  id: string;
  title: string;
  channel: string;
  sport: string;
  date: string;
  thumb: string;
  dur: number;
  match: { sport: string; league: string; id: string; name: string } | null;
  blocked: string[];
  allowed: string[];
}

interface Row { id: string; title: string; channel: string; sport: string; date: string; thumb: string; dur: number; match_json: string | null; blocked: string | null; allowed: string | null }

const toHl = (r: Row): Highlight => ({
  id: r.id,
  title: r.title,
  channel: (r.channel || "").trim(),
  sport: r.sport || "multi",
  date: r.date,
  thumb: r.thumb,
  dur: r.dur || 0,
  match: r.match_json ? JSON.parse(r.match_json) : null,
  blocked: r.blocked ? r.blocked.split(",") : [],
  allowed: r.allowed ? r.allowed.split(",") : [],
});

export const HL_SPORTS: [string, string][] = [
  ["", "All"], ["football", "Football"], ["cricket", "Cricket"], ["basketball", "Basketball"], ["tennis", "Tennis"],
  ["rugby", "Rugby"], ["mma", "MMA"], ["baseball", "Baseball"], ["olympics", "Olympics"],
];

/** YouTube titles are SHOUTY and emoji-heavy; keep the words, drop the noise. */
export function cleanTitle(t: string): string {
  return t.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/\s*\|\s*/g, " | ").replace(/\s{2,}/g, " ").replace(/^[\s|]+|[\s|]+$/g, "").trim();
}

export function hlSlug(h: Pick<Highlight, "id" | "title">): string {
  const words = cleanTitle(h.title).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${h.id}-${words.slice(0, 80).replace(/-[^-]*$/, "") || "highlights"}`;
}
export const hlPath = (h: Pick<Highlight, "id" | "title">) => `/highlights/${hlSlug(h)}`;
/** Video ids are 11 chars of [A-Za-z0-9_-]; the rest of the slug is decoration. */
export const idFromSlug = (slug: string) => (/^[\w-]{11}/.exec(slug) || [""])[0];

export function duration(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}
/** ISO-8601 duration for VideoObject. */
export const isoDuration = (s: number) => `PT${Math.floor(s / 60)}M${s % 60}S`;

export async function listHighlights(sport = "", limit = 48, offset = 0): Promise<Highlight[]> {
  const db = d1();
  if (!db) return [];
  const q = sport
    ? db.prepare("SELECT * FROM seo_highlights WHERE sport=? ORDER BY date DESC LIMIT ? OFFSET ?").bind(sport, limit, offset)
    : db.prepare("SELECT * FROM seo_highlights ORDER BY date DESC LIMIT ? OFFSET ?").bind(limit, offset);
  return (await q.all<Row>()).results.map(toHl);
}

export async function countHighlights(sport = ""): Promise<number> {
  const db = d1();
  if (!db) return 0;
  const r = sport
    ? await db.prepare("SELECT count(*) n FROM seo_highlights WHERE sport=?").bind(sport).all<{ n: number }>()
    : await db.prepare("SELECT count(*) n FROM seo_highlights").all<{ n: number }>();
  return r.results[0]?.n || 0;
}

export const getHighlight = cache(async (id: string): Promise<Highlight | null> => {
  const db = d1();
  if (!db || !/^[\w-]{11}$/.test(id)) return null;
  const r = (await db.prepare("SELECT * FROM seo_highlights WHERE id=?").bind(id).all<Row>()).results[0];
  return r ? toHl(r) : null;
});

/** Highlights paired with one fixture (nm-api pairs by team names + kick-off). */
export async function highlightsForMatch(sport: string, league: string, id: string): Promise<Highlight[]> {
  const db = d1();
  if (!db) return [];
  return (await db.prepare("SELECT * FROM seo_highlights WHERE json_extract(match_json,'$.id')=? AND json_extract(match_json,'$.sport')=? ORDER BY date DESC LIMIT 6").bind(id, sport).all<Row>()).results
    .map(toHl).sort((a, b) => Number(b.match?.league === league) - Number(a.match?.league === league));
}

/** Same sport, newest first, excluding the current video. */
export async function relatedHighlights(h: Highlight, limit = 8): Promise<Highlight[]> {
  const db = d1();
  if (!db) return [];
  return (await db.prepare("SELECT * FROM seo_highlights WHERE sport=? AND id<>? ORDER BY ABS(julianday(date)-julianday(?)) LIMIT ?").bind(h.sport, h.id, h.date, limit).all<Row>()).results.map(toHl);
}

export async function sitemapHighlights(): Promise<{ id: string; title: string; date: string; thumb: string; dur: number; channel: string }[]> {
  const db = d1();
  if (!db) return [];
  return (await db.prepare("SELECT id,title,date,thumb,dur,channel FROM seo_highlights ORDER BY date DESC LIMIT 5000").all<Row>()).results;
}
