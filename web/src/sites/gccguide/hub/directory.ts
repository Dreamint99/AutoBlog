import "server-only";
import holidaysData from "./data/holidays.json";
import visaData from "./data/visa-fees.json";
import { GULF_CURRENCIES } from "./config";

/* Public holidays and official visa/residence fees.
 *
 * Both files are curated by hand from official sources (each record carries its
 * own source_url and check date). Lunar dates are marked "expected" — Gulf
 * governments confirm them by moon sighting, so we never present them as fixed.
 */

export type Holiday = { name: string; date: string; end_date: string; expected: boolean; note: string };
export type HolidayYear = { country: string; year: number; holidays: Holiday[]; ramadan_note: string; source_url: string; checked: string };

const HOL = (holidaysData as unknown as { records: HolidayYear[] }).records;

export function holidayYears(): HolidayYear[] {
  return HOL.slice().sort((a, b) => a.country.localeCompare(b.country) || a.year - b.year);
}

export function holidayFor(country: string, year: number): HolidayYear | undefined {
  return HOL.find((h) => h.country === country && h.year === year);
}

export function holidaySlug(h: { country: string; year: number }): string {
  return `${h.country}-${h.year}`;
}

export function parseHolidaySlug(slug: string): { country: string; year: number } | null {
  const m = /^([a-z-]+)-(20\d{2})$/.exec(slug);
  if (!m) return null;
  return { country: m[1], year: Number(m[2]) };
}

export function holidayYearsFor(country: string): number[] {
  return HOL.filter((h) => h.country === country).map((h) => h.year).sort();
}

/** Days between two ISO dates, inclusive. */
export function spanDays(h: Holiday): number {
  if (!h.end_date) return 1;
  const a = new Date(`${h.date}T00:00:00Z`).getTime();
  const b = new Date(`${h.end_date}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 864e5) + 1);
}

/* ── Visa / residence fees ────────────────────────────────────────────────── */

export type VisaItem = {
  country: string;
  item: string;
  category: string;
  fee: number | null;
  currency: string;
  basis: string;
  steps: string[];
  notes: string;
  source_url: string;
  official: boolean;
  checked: string;
};

const VISA = (visaData as unknown as { records: VisaItem[] }).records;

export function visaItems(country?: string): VisaItem[] {
  return country ? VISA.filter((v) => v.country === country) : VISA.slice();
}

export function visaCountries(): string[] {
  return [...new Set(VISA.map((v) => v.country))];
}

export function countryName(slug: string): string {
  return GULF_CURRENCIES.find((g) => g.country === slug)?.short ?? slug;
}
