import "server-only";
import { cache } from "react";
import { d1, cachedRead } from "./data";
import { getPassports, getPassportByIso, getPiMeta, reqOf } from "./passports";

/**
 * Visa data hub — read side. Country names/slugs: visa_countries. Requirements: pi_passport/pi_meta
 * (see below). Source: ilyankou/passport-index-dataset (MIT License)
 */

export type VisaRequirement = "visa_free" | "visa_on_arrival" | "eta" | "e_visa" | "visa_required" | "no_admission";

export interface VisaCountry {
  iso2: string;
  name: string;
  slug: string;
  population: number | null;
  region: string | null;
}

export interface VisaPair {
  passport: string;
  destination: string;
  requirement: VisaRequirement;
  days: number | null;
  source: string;
  data_date: string;
  updated_at: string;
  passport_name?: string;
  passport_slug?: string;
  destination_name?: string;
  destination_slug?: string;
  /** canonical /passport/<slug> of the passport */
  passport_pi_slug?: string;
}

export interface PassportRanking {
  passport: string;
  name: string;
  slug: string;
  population: number | null;
  score: number;
  visa_free: number;
  voa: number;
  eta: number;
  evisa: number;
  required: number;
  no_admission: number;
  rank: number;
}

export interface DestinationByCategory {
  destination: string;
  name: string;
  slug: string;
  requirement: VisaRequirement;
  days: number | null;
  data_date: string;
}

export const REQ_LABELS: Record<VisaRequirement, string> = {
  visa_free: "Visa-free",
  visa_on_arrival: "Visa on arrival",
  eta: "Electronic travel authorisation",
  e_visa: "e-Visa required",
  visa_required: "Visa required",
  no_admission: "No admission",
};

export const REQ_SHORT: Record<VisaRequirement, string> = {
  visa_free: "Visa-free",
  visa_on_arrival: "VOA",
  eta: "eTA",
  e_visa: "e-Visa",
  visa_required: "Visa",
  no_admission: "No entry",
};

export const REQ_COLORS: Record<VisaRequirement, string> = {
  visa_free: "#1f9d55",
  visa_on_arrival: "#3fb8a8",
  eta: "#8fd3a6",
  e_visa: "#e9a23b",
  visa_required: "#c85a54",
  no_admission: "#5b1f1f",
};

// Top passports by population — used for indexing rules
const TOP_PASSPORTS = new Set([
  "CN", "IN", "US", "ID", "PK", "NG", "BR", "BD", "RU", "JP",
  "MX", "ET", "PH", "EG", "VN", "DE", "TR", "IR", "TH", "GB",
  "FR", "IT", "ZA", "KR", "ES", "CO", "KE", "PL", "CA", "SA",
  "UA", "AR", "DZ", "IQ", "SD", "AF", "MA", "UZ", "PE", "MY",
  "AO", "GH", "MZ", "YE", "NP", "VE", "CI", "CM", "MG", "AU"
]);

// Top destinations by tourism
const TOP_DESTINATIONS = new Set([
  "FR", "ES", "US", "CN", "IT", "TR", "MX", "TH", "DE", "GB",
  "JP", "AT", "GR", "MY", "PT", "AE", "NL", "SA", "IN", "HK",
  "SG", "ID", "AU", "CA", "PL", "RU", "HR", "HU", "CH", "VN",
  "MA", "CZ", "EG", "KR", "TW", "DK", "IE", "ZA", "NZ", "PH"
]);

/**
 * Check if a pair page should be indexed (top passport × top destination).
 */
export function shouldIndexPair(passport: string, destination: string): boolean {
  return TOP_PASSPORTS.has(passport) && TOP_DESTINATIONS.has(destination);
}

/**
 * /visa-free-countries/<slug> duplicates the canonical /passport/<slug>; it stays reachable
 * (old links) but points its canonical there and is not listed in the sitemap. No noindex on top
 * of the canonical (mixed signals); Google folds it into the /passport/ page.
 */
export function shouldIndexPassportPage(_passport: string): boolean {
  return true;
}

export const getVisaCountries = cache(async (): Promise<VisaCountry[]> => {
  const db = d1();
  if (!db) return [];
  try {
    return await cachedRead("visa/countries", 3600, async () => {
      const { results } = await db.prepare("SELECT iso2, name, slug, population, region FROM visa_countries ORDER BY name").all<VisaCountry>();
      return results ?? [];
    });
  } catch {
    return [];
  }
});

export const getVisaCountryBySlug = cache(async (slug: string): Promise<VisaCountry | null> => {
  const db = d1();
  if (!db) return null;
  try {
    return await cachedRead(`visa/country/${slug}`, 3600, async () => {
      const { results } = await db.prepare("SELECT iso2, name, slug, population, region FROM visa_countries WHERE slug = ? LIMIT 1").bind(slug).all<VisaCountry>();
      return results?.[0] ?? null;
    });
  } catch {
    return null;
  }
});

export const getVisaCountryByIso = cache(async (iso2: string): Promise<VisaCountry | null> => {
  const db = d1();
  if (!db) return null;
  try {
    return await cachedRead(`visa/iso/${iso2}`, 3600, async () => {
      const { results } = await db.prepare("SELECT iso2, name, slug, population, region FROM visa_countries WHERE iso2 = ? LIMIT 1").bind(iso2.toUpperCase()).all<VisaCountry>();
      return results?.[0] ?? null;
    });
  } catch {
    return null;
  }
});

/* Requirement data: ONE dataset for every VisaPoint passport page. /passport/<slug> (canonical),
   /visa-free-countries/<slug>, /passport-ranking and /visa/<a>-to-<b> all read pi_passport + pi_meta
   (generator/passport_index.py, weekly, ilyankou/passport-index-dataset). The older visa_matrix
   snapshot (Feb 2026) gave the same passport different numbers on different URLs. visa_countries is
   still used for names/slugs so existing /visa/<a>-to-<b> and /visa-free-countries/<slug> URLs keep working. */
const PI_REQ: Record<string, VisaRequirement> = {
  F: "visa_free", A: "visa_on_arrival", T: "eta", E: "e_visa", V: "visa_required", X: "no_admission",
};
const REQ_ORDER: VisaRequirement[] = ["visa_free", "visa_on_arrival", "eta", "e_visa", "visa_required", "no_admission"];

const countryMap = cache(async (): Promise<Map<string, VisaCountry>> => new Map((await getVisaCountries()).map((c) => [c.iso2, c])));

/** Canonical passport page slug (/passport/<slug>) for an ISO2 code. */
export const passportSlug = cache(async (iso2: string): Promise<string | null> =>
  (await getPassports()).find((p) => p.iso2 === iso2.toUpperCase())?.slug ?? null);

export const getPassportRanking = cache(async (): Promise<PassportRanking[]> => {
  const [rows, cmap] = await Promise.all([getPassports(), countryMap()]);
  return rows.map((p) => ({
    passport: p.iso2,
    name: cmap.get(p.iso2)?.name ?? p.name,
    slug: p.slug, // canonical /passport/<slug>
    population: cmap.get(p.iso2)?.population ?? null,
    score: p.score,
    visa_free: p.free,
    voa: p.voa,
    eta: p.eta,
    evisa: p.evisa,
    required: p.required,
    no_admission: p.noadm,
    rank: p.rank,
  }));
});

export const getVisaFreeCountries = cache(async (passport: string): Promise<DestinationByCategory[]> => {
  const [full, meta, cmap] = await Promise.all([getPassportByIso(passport), getPiMeta(), countryMap()]);
  if (!full || !meta) return [];
  const date = (meta.updatedAt || "").slice(0, 10);
  const out: DestinationByCategory[] = [];
  meta.dest.forEach((d, i) => {
    const { req, days } = reqOf(full.codes[i] || "");
    const requirement = PI_REQ[req];
    if (!requirement || d.iso2 === full.iso2) return; // "S" = own country
    const c = cmap.get(d.iso2);
    out.push({ destination: d.iso2, name: c?.name ?? d.name, slug: c?.slug ?? d.slug, requirement, days, data_date: date });
  });
  return out.sort((a, b) => REQ_ORDER.indexOf(a.requirement) - REQ_ORDER.indexOf(b.requirement) || a.name.localeCompare(b.name));
});

export const getVisaPair = cache(async (passport: string, destination: string): Promise<VisaPair | null> => {
  const [full, meta, cmap] = await Promise.all([getPassportByIso(passport), getPiMeta(), countryMap()]);
  if (!full || !meta) return null;
  const i = meta.dest.findIndex((d) => d.iso2 === destination.toUpperCase());
  if (i < 0) return null;
  const { req, days } = reqOf(full.codes[i] || "");
  const requirement = PI_REQ[req];
  if (!requirement) return null;
  const p = cmap.get(full.iso2), d = cmap.get(meta.dest[i].iso2);
  return {
    passport: full.iso2,
    destination: meta.dest[i].iso2,
    requirement,
    days,
    source: "https://github.com/ilyankou/passport-index-dataset",
    data_date: (meta.updatedAt || "").slice(0, 10),
    updated_at: meta.updatedAt,
    passport_name: p?.name ?? full.name,
    passport_slug: p?.slug ?? full.slug,
    passport_pi_slug: full.slug,
    destination_name: d?.name ?? meta.dest[i].name,
    destination_slug: d?.slug ?? meta.dest[i].slug,
  };
});

export const getVisaDataDate = cache(async (): Promise<string | null> => {
  const meta = await getPiMeta();
  return meta?.updatedAt ? meta.updatedAt.slice(0, 10) : null;
});

export function fmtDataDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
