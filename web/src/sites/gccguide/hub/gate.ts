/* One place that decides whether a page is allowed into Google's index.
 *
 * Every page's `robots` metadata and every sitemap entry call these functions,
 * so "noindex" and "not in the sitemap" can never drift apart. The rules
 * themselves live in ./config.ts (INDEX) and in the data (a country whose law is
 * unverified is not indexed, an embassy record that failed verification is not
 * indexed).
 */

import { INDEX, GULF_CURRENCIES, QUOTE_CURRENCIES, GOLD_CITIES, FUEL_COUNTRIES } from "./config";

/** Lengths of service that get their own indexed example page (the rest stay
 *  reachable but noindex — a small, high-intent set at launch). */
export const INDEXED_EXAMPLE_YEARS = [3, 5, 7, 10];

export const gate = {
  ratesPair(reverse: boolean): boolean {
    return INDEX.rates && !reverse;
  },
  goldCity(_slug: string): boolean {
    return INDEX.gold;
  },
  fuelCountry(hasRows: boolean): boolean {
    return INDEX.fuel && hasRows;
  },
  calculator(confirmed: boolean): boolean {
    return INDEX.calculators && confirmed;
  },
  calculatorExample(years: number, confirmed: boolean): boolean {
    return INDEX.calculatorExamples && confirmed && INDEXED_EXAMPLE_YEARS.includes(years);
  },
  prayerCity(pop: number): boolean {
    return INDEX.prayer && pop >= INDEX.prayerMinPopulation;
  },
  embassy(verified: boolean): boolean {
    return INDEX.embassy && verified;
  },
  holidays(): boolean {
    return INDEX.holidays;
  },
  visaFees(): boolean {
    return INDEX.visaFees;
  },
};

/* ── Catalogue sizes (used by the sitemaps and the report) ────────────────── */

export const COUNTS = {
  ratePairs: GULF_CURRENCIES.length * QUOTE_CURRENCIES.length,
  ratePairsReverse: GULF_CURRENCIES.length * QUOTE_CURRENCIES.length,
  goldCities: GOLD_CITIES.length,
  fuelCountries: FUEL_COUNTRIES.length,
  calculators: GULF_CURRENCIES.length * 4,
};
