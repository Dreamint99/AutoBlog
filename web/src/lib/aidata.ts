import "server-only";
import { cache } from "react";
import { d1 } from "./data";

/* InfKey local-AI and status data (D1, filled by workers/infkey-sync). */

export interface HfModel {
  id: string;
  hf_id: string;
  params: number;
  downloads: number;
  likes: number;
  rank: number;
}

export const getHfModels = cache(async (): Promise<HfModel[]> => {
  const db = d1();
  if (!db) return [];
  try {
    const { results } = await db.prepare("SELECT id,hf_id,params,downloads,likes,rank FROM infkey_hf ORDER BY rank").all<HfModel>();
    return results ?? [];
  } catch {
    return [];
  }
});

export async function getHfModel(id: string): Promise<HfModel | undefined> {
  return (await getHfModels()).find((m) => m.id === id);
}

/** Display name from a Hugging Face id: "Qwen/Qwen3-14B" → "Qwen3-14B" (by Qwen). */
export const hfName = (m: HfModel) => m.hf_id.split("/").pop() ?? m.hf_id;
export const hfOrg = (m: HfModel) => m.hf_id.split("/")[0];

/** Run pages are indexable for the most-downloaded models only. */
export const RUN_INDEX_TOP = 300;

export interface ServiceStatus {
  service: string;
  name: string;
  page_url: string;
  indicator: string;
  description: string;
  components: { n: string; s: string }[];
  incidents: { n: string; s: string; i: string; at: string; u: string }[];
  checked_at: string;
}

export const getStatuses = cache(async (): Promise<ServiceStatus[]> => {
  const db = d1();
  if (!db) return [];
  try {
    const { results } = await db.prepare("SELECT * FROM infkey_status ORDER BY name").all<Record<string, string>>();
    return (results ?? []).map((r) => ({
      service: r.service,
      name: r.name,
      page_url: r.page_url,
      indicator: r.indicator,
      description: r.description,
      components: JSON.parse(r.components || "[]"),
      incidents: JSON.parse(r.incidents || "[]"),
      checked_at: r.checked_at,
    }));
  } catch {
    return [];
  }
});

export async function getStatusDaily(service: string): Promise<{ day: string; checks: number; bad: number; worst: string }[]> {
  const db = d1();
  if (!db) return [];
  try {
    const { results } = await db
      .prepare("SELECT day,checks,bad,worst FROM infkey_status_daily WHERE service = ? ORDER BY day DESC LIMIT 90")
      .bind(service)
      .all<{ day: string; checks: number; bad: number; worst: string }>();
    return results ?? [];
  } catch {
    return [];
  }
}

export const statusWord = (ind: string) =>
  ind === "none" ? "Up — no known problems" : ind === "minor" ? "Partly down — minor problems" : ind === "major" ? "Down — major outage" : ind === "critical" ? "Down — critical outage" : ind === "maintenance" ? "Under maintenance" : "Unknown";
