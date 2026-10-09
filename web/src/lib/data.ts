import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Site, Article } from "./types";
import sitesData from "@/data/sites.json";

const DATA_DIR = process.env.DATA_DIR || "../generator";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function abs(p: string) {
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

// ── Cloudflare D1 (primary content store since Supabase billing paused) ──
// Articles live in the free, Worker-native D1 database `autoblog-content`.
// Access the binding via the OpenNext Cloudflare context; falls back to
// Supabase/local when there's no binding (e.g. local dev).
// Minimal D1 typings (avoids a @cloudflare/workers-types dependency).
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export function d1(): D1Database | null {
  try {
    return (getCloudflareContext().env as unknown as { DB?: D1Database }).DB ?? null;
  } catch {
    return null;
  }
}

function jsonCol<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v !== "string") return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

// Some rows hold double-encoded JSON or a plain "a, b" string instead of an array;
// one bad row used to 500 every page that lists articles (`tags.join is not a function`).
function strList(v: unknown): string[] {
  let x = jsonCol<unknown>(v, []);
  if (typeof x === "string") x = jsonCol<unknown>(x, x);
  if (typeof x === "string") return x.split(",").map((s) => s.trim()).filter(Boolean);
  return Array.isArray(x) ? x.map((s) => String(s)) : [];
}

function list(v: unknown): unknown[] {
  let x = jsonCol<unknown>(v, []);
  if (typeof x === "string") x = jsonCol<unknown>(x, []);
  return Array.isArray(x) ? x : x && typeof x === "object" ? [x] : [];
}

function parseArticleRow(r: Record<string, unknown>): Article {
  return {
    ...r,
    tags: strList(r.tags),
    faq: list(r.faq),
    secondary_keywords: strList(r.secondary_keywords),
    schema: list(r.schema),
    is_mock: !!r.is_mock,
  } as unknown as Article;
}

/* ── D1 read budget ───────────────────────────────────────────────────────
   The free plan allows 5M rows read per day, and every uncached page used to
   SELECT * the whole table (3× per article page) — ~6M/day, so the sites went
   down every evening once the quota ran out. Now:
     • listings read only the light columns (no body_html / faq / schema);
     • an article page reads its one row by (site_id, slug);
     • results are cached per colo in the Cache API (fresh for FRESH_S, then
       re-read) and kept for STALE_S as a fallback served when D1 errors —
       e.g. quota exhausted — instead of a 500;
     • React cache() dedupes repeat calls within one render.               */
const LIST_COLS =
  "id, site_id, title, slug, meta_title, meta_description, excerpt, tags, keyword, " +
  "image_url, word_count, reading_time, status, is_mock, created_at";
// 15 min: each colo with traffic re-reads a site's list ≤96×/day. Content drips
// twice a day, and the HTML edge cache in front already adds up to 30 min.
const FRESH_S = 900;
const STALE_S = 7 * 24 * 3600;
const CACHE_NS = "https://d1-cache.autoblog.internal/v1";

type Cached<T> = { t: number; v: T };

function edgeCache(): Cache | null {
  try {
    return (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default ?? null;
  } catch {
    return null;
  }
}

export async function cachedRead<T>(key: string, fresh: number, read: () => Promise<T>): Promise<T> {
  const cache = edgeCache();
  const req = new Request(`${CACHE_NS}/${key}`);
  let stale: Cached<T> | null = null;
  if (cache) {
    try {
      const hit = await cache.match(req);
      if (hit) {
        stale = (await hit.json()) as Cached<T>;
        if (Date.now() - stale.t < fresh * 1000) return stale.v;
      }
    } catch {
      stale = null;
    }
  }
  try {
    const v = await read();
    if (cache) {
      const body = JSON.stringify({ t: Date.now(), v } satisfies Cached<T>);
      const put = cache.put(req, new Response(body, { headers: { "cache-control": `public, s-maxage=${STALE_S}` } }));
      try {
        getCloudflareContext().ctx.waitUntil(put);
      } catch {
        await put.catch(() => {});
      }
    }
    return v;
  } catch (e) {
    if (stale) return stale.v; // D1 down / over quota → last good copy beats a 500
    throw e;
  }
}

function slimRow(r: Record<string, unknown>): Article {
  return { ...parseArticleRow(r), body_html: "", faq: [], schema: [], secondary_keywords: [] } as Article;
}

async function readD1Articles(siteId?: string): Promise<Article[]> {
  const db = d1();
  if (!db) return [];
  return cachedRead(`list/${siteId ?? "_all"}`, FRESH_S, async () => {
    let q = `SELECT ${LIST_COLS} FROM articles WHERE status = 'published'`;
    const binds: string[] = [];
    if (siteId) {
      q += " AND site_id = ?";
      binds.push(siteId);
    }
    q += " ORDER BY created_at DESC";
    const { results } = await db.prepare(q).bind(...binds).all<Record<string, unknown>>();
    return (results ?? []).map(slimRow);
  });
}

async function readD1Article(siteId: string, slug: string): Promise<Article | undefined> {
  const db = d1();
  if (!db) return undefined;
  const row = await cachedRead(`article/${siteId}/${encodeURIComponent(slug)}`, 3600, async () => {
    const { results } = await db
      .prepare("SELECT * FROM articles WHERE site_id = ? AND slug = ? AND status = 'published' LIMIT 1")
      .bind(siteId, slug)
      .all<Record<string, unknown>>();
    return results?.[0] ?? null;
  });
  return row ? parseArticleRow(row) : undefined;
}

/** Merged duplicates keep their row with status 'redirect:<target-slug>' so the
 *  old URL 301s to the article that now owns the keyword. Only read on a miss. */
export const getRedirect = cache(async (siteId: string, slug: string): Promise<string | null> => {
  const db = d1();
  if (!db) return null;
  try {
    const row = await cachedRead(`redirect/${siteId}/${encodeURIComponent(slug)}`, 3600, async () => {
      const { results } = await db
        .prepare("SELECT status FROM articles WHERE site_id = ? AND slug = ? AND status LIKE 'redirect:%' LIMIT 1")
        .bind(siteId, slug)
        .all<{ status: string }>();
      return results?.[0] ?? null;
    });
    const to = row?.status.slice("redirect:".length) || "";
    return to && to !== slug ? to : null;
  } catch {
    return null;
  }
});

/** Full-text search over title/excerpt/keyword/tags/body, done in SQL so the
 *  bodies never leave D1. Cached per query. */
async function searchD1(siteId: string, q: string): Promise<Article[]> {
  const db = d1();
  if (!db) return [];
  const term = q.trim().toLowerCase().slice(0, 80);
  if (!term) return [];
  return cachedRead(`search/${siteId}/${encodeURIComponent(term)}`, 3600, async () => {
    const like = `%${term.replace(/[%_]/g, "")}%`;
    const { results } = await db
      .prepare(
        `SELECT ${LIST_COLS} FROM articles WHERE site_id = ? AND status = 'published' AND ` +
          "(lower(title) LIKE ? OR lower(excerpt) LIKE ? OR lower(keyword) LIKE ? OR lower(tags) LIKE ? OR lower(body_html) LIKE ?) " +
          "ORDER BY created_at DESC LIMIT 60",
      )
      .bind(siteId, like, like, like, like, like)
      .all<Record<string, unknown>>();
    return (results ?? []).map(slimRow);
  });
}

// ── Sites (bundled with the app so it works on Vercel where there is no generator dir) ──
export function getSites(): Site[] {
  return (sitesData as { sites: Site[] }).sites;
}

export function getSite(id: string): Site | undefined {
  return getSites().find((s) => s.id === id);
}

// ── Articles ──
function readLocalArticles(): Article[] {
  const file = path.join(abs(DATA_DIR), "output", "db", "articles.json");
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as Article[];
  } catch {
    return [];
  }
}

async function readSupabaseArticles(siteId?: string): Promise<Article[]> {
  let url = `${SUPABASE_URL}/rest/v1/articles?select=*&status=eq.published&order=created_at.desc`;
  if (siteId) url += `&site_id=eq.${siteId}`;
  const r = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    cache: "no-store", // always fresh → new admin posts go live instantly
  });
  if (!r.ok) return [];
  return (await r.json()) as Article[];
}

/** Listing data for a site. On D1 the heavy columns (body_html, faq, schema)
 *  are left out — use getArticle() for a full article. */
export const getArticles = cache(async (siteId?: string): Promise<Article[]> => {
  if (d1()) return readD1Articles(siteId);
  if (useSupabase) return readSupabaseArticles(siteId);
  let items = readLocalArticles().filter((a) => a.status === "published");
  if (siteId) items = items.filter((a) => a.site_id === siteId);
  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return items;
});

export const getArticle = cache(async (siteId: string, slug: string): Promise<Article | undefined> => {
  if (d1()) return readD1Article(siteId, slug);
  const items = await getArticles(siteId);
  return items.find((a) => a.slug === slug);
});

/** Articles matching a search query (title, excerpt, keyword, tags or body). */
export const searchArticles = cache(async (siteId: string, q: string): Promise<Article[]> => {
  if (d1()) return searchD1(siteId, q);
  const term = q.trim().toLowerCase();
  if (!term) return [];
  return (await getArticles(siteId)).filter((a) =>
    `${a.title} ${a.excerpt} ${a.keyword} ${(a.tags || []).join(" ")} ${a.body_html || ""}`.toLowerCase().includes(term),
  );
});

// ── AI Tools directory (countly best-ai-tools page) ──
export interface AiTool {
  slug: string;
  name: string;
  category: string;
  category_key: string;
  heading_keyword: string;
  category_blurb: string;
  url: string;
  blurb: string;
  pricing: string;
  github_repo: string;
  users_est: string;
  tags: string[];
  highlight: string;
  stars: number;
  stars_prev: number;
  growth_pct: number;
  forks: number;
  score: number;
  rank: number;
  url_ok: boolean;
  featured: boolean;
  cat_order: number;
  updated_at: string;
}

function parseToolRow(r: Record<string, unknown>): AiTool {
  return {
    ...r,
    tags: jsonCol(r.tags, [] as string[]),
    stars: Number(r.stars ?? 0),
    stars_prev: Number(r.stars_prev ?? 0),
    growth_pct: Number(r.growth_pct ?? 0),
    forks: Number(r.forks ?? 0),
    score: Number(r.score ?? 0),
    rank: Number(r.rank ?? 0),
    cat_order: Number(r.cat_order ?? 0),
    url_ok: !!r.url_ok,
    featured: !!r.featured,
  } as unknown as AiTool;
}

export async function getAiTools(): Promise<AiTool[]> {
  const db = d1();
  if (db) {
    const { results } = await db
      .prepare("SELECT * FROM ai_tools ORDER BY cat_order ASC, rank ASC")
      .all<Record<string, unknown>>();
    return (results ?? []).map(parseToolRow);
  }
  if (!useSupabase) return [];
  const url = `${SUPABASE_URL}/rest/v1/ai_tools?select=*&order=cat_order.asc,rank.asc`;
  const r = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    cache: "no-store",
  });
  if (!r.ok) return [];
  return (await r.json()) as AiTool[];
}

export interface AiRising {
  pos: number;
  repo: string;
  name: string;
  url: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  owner_avatar: string;
  repo_created: string | null;
  visible: boolean;
  updated_at: string;
}

export async function getAiRising(): Promise<AiRising[]> {
  const db = d1();
  if (db) {
    const { results } = await db
      .prepare("SELECT * FROM ai_rising WHERE visible = 1 ORDER BY pos ASC")
      .all<Record<string, unknown>>();
    return (results ?? []).map((r) => ({
      ...r,
      stars: Number(r.stars ?? 0),
      forks: Number(r.forks ?? 0),
      topics: jsonCol(r.topics, [] as string[]),
      visible: !!r.visible,
    })) as unknown as AiRising[];
  }
  if (!useSupabase) return [];
  const url = `${SUPABASE_URL}/rest/v1/ai_rising?select=*&visible=eq.true&order=pos.asc`;
  const r = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    cache: "no-store",
  });
  if (!r.ok) return [];
  return (await r.json()) as AiRising[];
}
