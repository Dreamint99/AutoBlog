import "server-only";
import fs from "node:fs";
import path from "node:path";
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

function d1(): D1Database | null {
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

async function readD1Articles(siteId?: string): Promise<Article[]> {
  const db = d1();
  if (!db) return [];
  let q = "SELECT * FROM articles WHERE status = 'published'";
  const binds: string[] = [];
  if (siteId) {
    q += " AND site_id = ?";
    binds.push(siteId);
  }
  q += " ORDER BY created_at DESC";
  const { results } = await db.prepare(q).bind(...binds).all<Record<string, unknown>>();
  return (results ?? []).map(parseArticleRow);
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

export async function getArticles(siteId?: string): Promise<Article[]> {
  if (d1()) return readD1Articles(siteId);
  if (useSupabase) return readSupabaseArticles(siteId);
  let items = readLocalArticles().filter((a) => a.status === "published");
  if (siteId) items = items.filter((a) => a.site_id === siteId);
  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return items;
}

export async function getArticle(siteId: string, slug: string): Promise<Article | undefined> {
  const items = await getArticles(siteId);
  return items.find((a) => a.slug === slug);
}

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
