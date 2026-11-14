/* Gulf Expat Data Hub — configuration.
 *
 * Two things live here, on purpose, and both are meant to be edited:
 *
 * 1. The catalogue of pages that real data supports (GULF / QUOTES / GOLD_CITIES /
 *    FUEL_COUNTRIES). Adding a currency or a city here creates pages on the next
 *    build — nothing else needs to change.
 * 2. The indexing gate. Google penalises mass thin pages ("scaled content
 *    abuse"), so only the highest-demand page types start indexed; everything
 *    else is built, linked and reachable but carries `noindex, follow`, and is
 *    kept out of the sitemaps. Widening the set is one edit here.
 *
 * Nothing in this file is data. Facts live in D1 or in ./data/*.json, each with
 * its source URL and date.
 */

/** The six GCC states, in the order the site talks about them. */
export const GULF_CURRENCIES = [
  { code: "AED", country: "uae", name: "UAE dirham", short: "UAE" },
  { code: "SAR", country: "saudi-arabia", name: "Saudi riyal", short: "Saudi Arabia" },
  { code: "QAR", country: "qatar", name: "Qatari riyal", short: "Qatar" },
  { code: "KWD", country: "kuwait", name: "Kuwaiti dinar", short: "Kuwait" },
  { code: "OMR", country: "oman", name: "Omani rial", short: "Oman" },
  { code: "BHD", country: "bahrain", name: "Bahraini dinar", short: "Bahrain" },
] as const;

export type GulfCode = (typeof GULF_CURRENCIES)[number]["code"];

/** Currencies Gulf expats actually send money home in, plus the majors. */
export const QUOTE_CURRENCIES = [
  { code: "INR", name: "Indian rupee", country: "India", symbol: "₹" },
  { code: "PKR", name: "Pakistani rupee", country: "Pakistan", symbol: "₨" },
  { code: "BDT", name: "Bangladeshi taka", country: "Bangladesh", symbol: "৳" },
  { code: "PHP", name: "Philippine peso", country: "Philippines", symbol: "₱" },
  { code: "NPR", name: "Nepalese rupee", country: "Nepal", symbol: "₨" },
  { code: "LKR", name: "Sri Lankan rupee", country: "Sri Lanka", symbol: "Rs" },
  { code: "EGP", name: "Egyptian pound", country: "Egypt", symbol: "E£" },
  { code: "IDR", name: "Indonesian rupiah", country: "Indonesia", symbol: "Rp" },
  { code: "KES", name: "Kenyan shilling", country: "Kenya", symbol: "KSh" },
  { code: "NGN", name: "Nigerian naira", country: "Nigeria", symbol: "₦" },
  { code: "ETB", name: "Ethiopian birr", country: "Ethiopia", symbol: "Br" },
  { code: "USD", name: "US dollar", country: "United States", symbol: "$" },
  { code: "EUR", name: "Euro", country: "Eurozone", symbol: "€" },
  { code: "GBP", name: "British pound", country: "United Kingdom", symbol: "£" },
] as const;

export type QuoteCode = (typeof QUOTE_CURRENCIES)[number]["code"];

export const QUOTE_NAME: Record<string, string> = Object.fromEntries(QUOTE_CURRENCIES.map((c) => [c.code, c.name]));
export const QUOTE_COUNTRY: Record<string, string> = Object.fromEntries(QUOTE_CURRENCIES.map((c) => [c.code, c.country]));
export const GULF_NAME: Record<string, string> = Object.fromEntries(GULF_CURRENCIES.map((c) => [c.code, c.short]));

export const ALL_CODES = [...GULF_CURRENCIES.map((c) => c.code), ...QUOTE_CURRENCIES.map((c) => c.code)];

/** Gold cities: a page per city, grouped by the currency they quote in. */
export const GOLD_CITIES = [
  { slug: "dubai", city: "Dubai", country: "uae", countryName: "UAE", currency: "AED", flag: "ae", primary: true, pop: 3478300 },
  { slug: "abu-dhabi", city: "Abu Dhabi", country: "uae", countryName: "UAE", currency: "AED", flag: "ae", primary: false, pop: 1483000 },
  { slug: "sharjah", city: "Sharjah", country: "uae", countryName: "UAE", currency: "AED", flag: "ae", primary: false, pop: 1800000 },
  { slug: "al-ain", city: "Al Ain", country: "uae", countryName: "UAE", currency: "AED", flag: "ae", primary: false, pop: 846000 },
  { slug: "riyadh", city: "Riyadh", country: "saudi-arabia", countryName: "Saudi Arabia", currency: "SAR", flag: "sa", primary: true, pop: 7680000 },
  { slug: "jeddah", city: "Jeddah", country: "saudi-arabia", countryName: "Saudi Arabia", currency: "SAR", flag: "sa", primary: false, pop: 4697000 },
  { slug: "dammam", city: "Dammam", country: "saudi-arabia", countryName: "Saudi Arabia", currency: "SAR", flag: "sa", primary: false, pop: 1253000 },
  { slug: "mecca", city: "Mecca", country: "saudi-arabia", countryName: "Saudi Arabia", currency: "SAR", flag: "sa", primary: false, pop: 2074000 },
  { slug: "medina", city: "Medina", country: "saudi-arabia", countryName: "Saudi Arabia", currency: "SAR", flag: "sa", primary: false, pop: 1490000 },
  { slug: "doha", city: "Doha", country: "qatar", countryName: "Qatar", currency: "QAR", flag: "qa", primary: true, pop: 1186000 },
  { slug: "kuwait-city", city: "Kuwait City", country: "kuwait", countryName: "Kuwait", currency: "KWD", flag: "kw", primary: true, pop: 2989000 },
  { slug: "muscat", city: "Muscat", country: "oman", countryName: "Oman", currency: "OMR", flag: "om", primary: true, pop: 1560000 },
  { slug: "salalah", city: "Salalah", country: "oman", countryName: "Oman", currency: "OMR", flag: "om", primary: false, pop: 340000 },
  { slug: "manama", city: "Manama", country: "bahrain", countryName: "Bahrain", currency: "BHD", flag: "bh", primary: true, pop: 200000 },
] as const;

export const FUEL_COUNTRIES = [
  { slug: "uae", name: "UAE", flag: "ae" },
  { slug: "saudi-arabia", name: "Saudi Arabia", flag: "sa" },
  { slug: "qatar", name: "Qatar", flag: "qa" },
  { slug: "kuwait", name: "Kuwait", flag: "kw" },
  { slug: "oman", name: "Oman", flag: "om" },
  { slug: "bahrain", name: "Bahrain", flag: "bh" },
] as const;

/** Gold purity → fraction of fine gold. 24K is the spot price. */
export const KARATS = [
  { k: 24, label: "24K", purity: 1, note: "fine gold — what the spot price quotes" },
  { k: 22, label: "22K", purity: 0.916, note: "the standard for Gulf jewellery (91.6%)" },
  { k: 21, label: "21K", purity: 0.875, note: "common in Saudi and Egyptian gold" },
  { k: 18, label: "18K", purity: 0.75, note: "harder alloy, popular for daily wear" },
] as const;

/** 1 troy ounce = 31.1034768 g; 1 tola = 11.6638 g. */
export const GRAMS_PER_OZ = 31.1034768;
export const GRAMS_PER_TOLA = 11.6638;

/* ── Indexing gate ───────────────────────────────────────────────────────────
 * Phase 1 + 2 launch set = everything these flags cover. Raise a number or flip
 * a flag, rebuild, and the sitemaps/robots pick it up automatically.
 */
export const INDEX = {
  /** All 84 forward Gulf→quote pairs. The reverse pairs are noindex + canonical. */
  rates: true,
  gold: true,
  fuel: true,
  /** Gratuity / overtime / annual leave / notice-period calculators. */
  calculators: true,
  /** Worked-example pages under /gratuity/<country>/… (small, high-intent set). */
  calculatorExamples: true,
  /** Prayer: index cities at or above this population; the rest stay reachable + noindex. */
  prayer: true,
  prayerMinPopulation: 50_000,
  embassy: true,
  visaFees: true,
  holidays: true,
  /** Phase 5 is blocked on affiliate credentials — see GCC_HUB_REPORT.md. */
  flights: false,
  remittance: false,
} as const;

/** Minimum wage used when a country's gratuity floor is expressed as "one month". */
export const HUB_UPDATED_NOTE =
  "Rates refresh three times a day; gold hourly. Every figure on this site is sourced and dated — check the linked source before you rely on it.";
