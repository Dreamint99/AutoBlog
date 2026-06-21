import "server-only";
import type { InfModel } from "./types";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* PostgREST may serialise numeric columns as strings — coerce defensively so
   the UI always gets real numbers (or null). */
function normalize(row: Record<string, unknown>): InfModel {
  return {
    id: String(row.id),
    provider: String(row.provider ?? ""),
    name: String(row.name ?? ""),
    version: (row.version as string) ?? null,
    category: String(row.category ?? "llm"),
    input_per_m: num(row.input_per_m),
    output_per_m: num(row.output_per_m),
    cached_input_per_m: num(row.cached_input_per_m),
    unit_price: num(row.unit_price),
    unit_label: (row.unit_label as string) ?? null,
    max_context: num(row.max_context),
    max_output: num(row.max_output),
    latency_note: (row.latency_note as string) ?? null,
    supports_vision: Boolean(row.supports_vision),
    supports_audio: Boolean(row.supports_audio),
    supports_functions: Boolean(row.supports_functions),
    supports_structured: Boolean(row.supports_structured),
    commercial_use: Boolean(row.commercial_use),
    official_source: (row.official_source as string) ?? null,
    last_verified: (row.last_verified as string) ?? null,
    sort: num(row.sort) ?? 100,
    notes: (row.notes as string) ?? null,
  };
}

export async function getModels(category?: string): Promise<InfModel[]> {
  if (!useSupabase) return [];
  let url = `${SUPABASE_URL}/rest/v1/infkey_models?select=*&order=sort.asc`;
  if (category) url += `&category=eq.${category}`;
  const r = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    cache: "no-store",
  });
  if (!r.ok) return [];
  const rows = (await r.json()) as Record<string, unknown>[];
  return rows.map(normalize);
}

export async function getModel(id: string): Promise<InfModel | undefined> {
  const all = await getModels();
  return all.find((m) => m.id === id);
}

/** Latest `last_verified` date across the price table (for "verified on" UI). */
export function latestVerified(models: InfModel[]): string | null {
  let best: string | null = null;
  for (const m of models) {
    if (m.last_verified && (!best || m.last_verified > best)) best = m.last_verified;
  }
  return best;
}
