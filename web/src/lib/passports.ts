import "server-only";
import { cache } from "react";
import { d1, cachedRead } from "./data";

/* VisaPoint Passport Index — read side. Data is written to D1 by
   generator/passport_index.py (weekly workflow): pi_passport + pi_meta. */

export type Req = "F" | "A" | "T" | "E" | "V" | "X" | "S";

export interface PassportRow {
  iso2: string;
  slug: string;
  name: string;
  numeric: string | null;
  rank: number;
  score: number;
  free: number;
  voa: number;
  eta: number;
  evisa: number;
  required: number;
  noadm: number;
}
export interface Dest {
  iso2: string;
  name: string;
  slug: string;
  numeric: string | null;
}
export interface PassportFull extends PassportRow {
  /** Requirement per destination, aligned with meta.dest ("F90" = visa-free 90 days). */
  codes: string[];
}
export interface PiMeta {
  dest: Dest[];
  updatedAt: string;
}

export const REQ_LABEL: Record<Req, string> = {
  F: "Visa-free",
  A: "Visa on arrival",
  T: "eTA",
  E: "e-Visa",
  V: "Visa required",
  X: "No admission",
  S: "Own country",
};

export function reqOf(code: string): { req: Req; days: number | null } {
  const req = (code[0] || "V") as Req;
  const days = req === "F" && code.length > 1 ? Number(code.slice(1)) : null;
  return { req, days };
}

const COLS = "iso2, slug, name, numeric, rank, score, free, voa, eta, evisa, required, noadm";

export const getPassports = cache(async (): Promise<PassportRow[]> => {
  const db = d1();
  if (!db) return [];
  try {
    return await cachedRead("pi/list", 3600, async () => {
      const { results } = await db.prepare(`SELECT ${COLS} FROM pi_passport ORDER BY rank, name`).all<PassportRow>();
      return results ?? [];
    });
  } catch {
    return [];
  }
});

export const getPiMeta = cache(async (): Promise<PiMeta | null> => {
  const db = d1();
  if (!db) return null;
  try {
    return await cachedRead("pi/meta", 3600, async () => {
      const { results } = await db.prepare("SELECT k, v FROM pi_meta").all<{ k: string; v: string }>();
      const m = Object.fromEntries((results ?? []).map((r) => [r.k, r.v]));
      return { dest: JSON.parse(m.dest || "[]") as Dest[], updatedAt: m.updated_at || "" };
    });
  } catch {
    return null;
  }
});

async function fullBy(col: "slug" | "iso2", v: string): Promise<PassportFull | null> {
  const db = d1();
  if (!db) return null;
  try {
    return await cachedRead(`pi/${col}/${v}`, 3600, async () => {
      const { results } = await db
        .prepare(`SELECT ${COLS}, codes FROM pi_passport WHERE ${col} = ? LIMIT 1`)
        .bind(v)
        .all<PassportRow & { codes: string }>();
      const r = results?.[0];
      return r ? { ...r, codes: JSON.parse(r.codes) as string[] } : null;
    });
  } catch {
    return null;
  }
}

export const getPassport = cache((slug: string) => fullBy("slug", slug));
export const getPassportByIso = cache((iso2: string) => fullBy("iso2", iso2.toUpperCase()));

export function flagSrc(iso2: string, w = 80): string {
  return `https://flagcdn.com/w${w}/${iso2.toLowerCase()}.png`;
}

export function fmtUpdated(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
