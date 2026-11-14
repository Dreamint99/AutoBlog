import "server-only";
import { cache } from "react";
import { d1, cachedRead } from "./data";

/**
 * Visa data hub — read side. Data is written to D1 by seo-engine/src/visa.mjs (weekly).
 * Source: imorte/passport-index-data (MIT License)
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
 * Check if a visa-free-countries page should be indexed (all are indexed).
 */
export function shouldIndexPassportPage(_passport: string): boolean {
  return true; // All ~199 visa-free-countries pages are indexed
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

export const getPassportRanking = cache(async (): Promise<PassportRanking[]> => {
  const db = d1();
  if (!db) return [];
  try {
    return await cachedRead("visa/ranking", 3600, async () => {
      const { results } = await db.prepare(`
        SELECT 
          m.passport,
          c.name,
          c.slug,
          c.population,
          COUNT(CASE WHEN m.requirement IN ('visa_free', 'visa_on_arrival', 'eta') THEN 1 END) as score,
          COUNT(CASE WHEN m.requirement = 'visa_free' THEN 1 END) as visa_free,
          COUNT(CASE WHEN m.requirement = 'visa_on_arrival' THEN 1 END) as voa,
          COUNT(CASE WHEN m.requirement = 'eta' THEN 1 END) as eta,
          COUNT(CASE WHEN m.requirement = 'e_visa' THEN 1 END) as evisa,
          COUNT(CASE WHEN m.requirement = 'visa_required' THEN 1 END) as required,
          COUNT(CASE WHEN m.requirement = 'no_admission' THEN 1 END) as no_admission
        FROM visa_matrix m
        JOIN visa_countries c ON m.passport = c.iso2
        GROUP BY m.passport
        ORDER BY score DESC, c.name
      `).all<Omit<PassportRanking, "rank">>();
      
      let rank = 0, lastScore = -1;
      return (results ?? []).map((r, i) => {
        if (r.score !== lastScore) { rank = i + 1; lastScore = r.score; }
        return { ...r, rank };
      });
    });
  } catch {
    return [];
  }
});

export const getVisaFreeCountries = cache(async (passport: string): Promise<DestinationByCategory[]> => {
  const db = d1();
  if (!db) return [];
  try {
    return await cachedRead(`visa/free/${passport}`, 3600, async () => {
      const { results } = await db.prepare(`
        SELECT 
          m.destination,
          c.name,
          c.slug,
          m.requirement,
          m.days,
          m.data_date
        FROM visa_matrix m
        JOIN visa_countries c ON m.destination = c.iso2
        WHERE m.passport = ?
        ORDER BY 
          CASE m.requirement 
            WHEN 'visa_free' THEN 1 
            WHEN 'visa_on_arrival' THEN 2
            WHEN 'eta' THEN 3
            WHEN 'e_visa' THEN 4
            WHEN 'visa_required' THEN 5
            ELSE 6 
          END,
          c.name
      `).bind(passport.toUpperCase()).all<DestinationByCategory>();
      return results ?? [];
    });
  } catch {
    return [];
  }
});

export const getVisaPair = cache(async (passport: string, destination: string): Promise<VisaPair | null> => {
  const db = d1();
  if (!db) return null;
  try {
    return await cachedRead(`visa/pair/${passport}/${destination}`, 3600, async () => {
      const { results } = await db.prepare(`
        SELECT 
          m.*,
          p.name as passport_name,
          p.slug as passport_slug,
          d.name as destination_name,
          d.slug as destination_slug
        FROM visa_matrix m
        JOIN visa_countries p ON m.passport = p.iso2
        JOIN visa_countries d ON m.destination = d.iso2
        WHERE m.passport = ? AND m.destination = ?
        LIMIT 1
      `).bind(passport.toUpperCase(), destination.toUpperCase()).all<VisaPair>();
      return results?.[0] ?? null;
    });
  } catch {
    return null;
  }
});

export const getVisaDataDate = cache(async (): Promise<string | null> => {
  const db = d1();
  if (!db) return null;
  try {
    const { results } = await db.prepare("SELECT data_date FROM visa_matrix LIMIT 1").all<{ data_date: string }>();
    return results?.[0]?.data_date ?? null;
  } catch {
    return null;
  }
});

export function fmtDataDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
