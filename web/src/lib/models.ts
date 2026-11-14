import "server-only";
import { cache } from "react";
import type { InfModel } from "./types";
import { d1 } from "./data";

/* InfKey model database. Rows live in D1 `infkey_models`, refreshed daily from the public
   OpenRouter model list by `workers/infkey-sync` (prices, context, modalities), with a
   per-day price history in `infkey_price_history`. */

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

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
    supports_reasoning: Boolean(row.supports_reasoning),
    commercial_use: Boolean(row.commercial_use),
    official_source: (row.official_source as string) ?? null,
    last_verified: (row.last_verified as string) ?? null,
    sort: num(row.sort) ?? 100000,
    tier: num(row.tier) ?? 2,
    notes: (row.notes as string) ?? null,
    description: (row.description as string) ?? null,
    or_id: (row.or_id as string) ?? null,
    hf_id: (row.hf_id as string) ?? null,
    input_modalities: (row.input_modalities as string) ?? null,
    output_modalities: (row.output_modalities as string) ?? null,
    created: num(row.created),
  };
}

// Deduped per request (React cache); pages are edge-cached for 30 min by cache-worker.js.
const all = cache(async (): Promise<InfModel[]> => {
  const db = d1();
  if (!db) return [];
  try {
    const { results } = await db
      .prepare("SELECT * FROM infkey_models WHERE active = 1 ORDER BY sort ASC")
      .all<Record<string, unknown>>();
    return (results ?? []).map(normalize);
  } catch {
    return [];
  }
});

export async function getModels(category?: string): Promise<InfModel[]> {
  const rows = await all();
  return category ? rows.filter((m) => m.category === category) : rows;
}

export async function getModel(id: string): Promise<InfModel | undefined> {
  return (await all()).find((m) => m.id === id);
}

/** Flagship models (newest paid models of the major labs) — the pairs we let Google index. */
export async function getFlagships(): Promise<InfModel[]> {
  return (await all()).filter((m) => m.tier === 0);
}

/** Daily price points for one model, oldest first (for the price-history chart). */
export async function getPriceHistory(id: string): Promise<{ day: string; input: number | null; output: number | null }[]> {
  const db = d1();
  if (!db) return [];
  try {
    const { results } = await db
      .prepare("SELECT day, input_per_m, output_per_m FROM infkey_price_history WHERE id = ? ORDER BY day ASC LIMIT 400")
      .bind(id)
      .all<{ day: string; input_per_m: number | null; output_per_m: number | null }>();
    return (results ?? []).map((r) => ({ day: r.day, input: num(r.input_per_m), output: num(r.output_per_m) }));
  } catch {
    return [];
  }
}

/** A comparison page is worth indexing when both models are flagships. */
export function isIndexablePair(a: InfModel, b: InfModel): boolean {
  return a.tier === 0 && b.tier === 0;
}

/** Latest `last_verified` date across the price table (for "verified on" UI). */
export function latestVerified(models: InfModel[]): string | null {
  let best: string | null = null;
  for (const m of models) {
    if (m.last_verified && (!best || m.last_verified > best)) best = m.last_verified;
  }
  return best;
}

export interface PriceChange {
  model: InfModel;
  oldIn: number | null;
  oldOut: number | null;
  newIn: number | null;
  newOut: number | null;
}

/** Days we have price snapshots for, newest first. */
export const getChangeDays = cache(async (): Promise<string[]> => {
  const db = d1();
  if (!db) return [];
  try {
    const { results } = await db.prepare("SELECT DISTINCT day FROM infkey_price_history ORDER BY day DESC LIMIT 120").all<{ day: string }>();
    return (results ?? []).map((r) => r.day);
  } catch {
    return [];
  }
});

/** What changed on `day` versus each model's previous snapshot: price moves and new models. */
export async function getDayChanges(day: string): Promise<{ day: string; up: PriceChange[]; down: PriceChange[]; added: InfModel[]; first: boolean }> {
  const empty = { day, up: [], down: [], added: [], first: true };
  const db = d1();
  if (!db) return empty;
  const days = await getChangeDays();
  if (!days.includes(day)) return empty;
  const first = day === days[days.length - 1];
  const models = new Map((await all()).map((m) => [m.id, m]));
  const { results } = await db
    .prepare(
      `SELECT h.id, h.input_per_m ni, h.output_per_m no,
              p.input_per_m oi, p.output_per_m oo, p.day pd
         FROM infkey_price_history h
         LEFT JOIN infkey_price_history p
           ON p.id = h.id AND p.day = (SELECT max(day) FROM infkey_price_history WHERE id = h.id AND day < h.day)
        WHERE h.day = ?`,
    )
    .bind(day)
    .all<{ id: string; ni: number | null; no: number | null; oi: number | null; oo: number | null; pd: string | null }>();
  const up: PriceChange[] = [];
  const down: PriceChange[] = [];
  const added: InfModel[] = [];
  for (const r of results ?? []) {
    const m = models.get(r.id);
    if (!m) continue;
    if (!r.pd) {
      if (!first) added.push(m);
      continue;
    }
    const before = (r.oi ?? 0) + (r.oo ?? 0);
    const after = (r.ni ?? 0) + (r.no ?? 0);
    if (Math.abs(after - before) < 1e-9) continue;
    const c = { model: m, oldIn: r.oi, oldOut: r.oo, newIn: r.ni, newOut: r.no };
    (after < before ? down : up).push(c);
  }
  const pct = (c: PriceChange) => ((c.newIn ?? 0) + (c.newOut ?? 0)) / Math.max(1e-9, (c.oldIn ?? 0) + (c.oldOut ?? 0));
  down.sort((a, b) => pct(a) - pct(b));
  up.sort((a, b) => pct(b) - pct(a));
  added.sort((a, b) => (a.tier ?? 2) - (b.tier ?? 2) || a.sort - b.sort);
  return { day, up, down, added, first };
}

/** Models first listed in the last N days (one cheap query on `created`; no per-day snapshots). */
export async function getNewModels(days: number): Promise<InfModel[]> {
  const cutoff = Date.now() / 1000 - days * 86400;
  return (await all())
    .filter((m) => (m.created ?? 0) >= cutoff)
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
}
