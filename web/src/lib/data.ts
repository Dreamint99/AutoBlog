import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Site, Article } from "./types";
import sitesData from "@/data/sites.json";

const DATA_DIR = process.env.DATA_DIR || "../generator";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function abs(p: string) {
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
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
