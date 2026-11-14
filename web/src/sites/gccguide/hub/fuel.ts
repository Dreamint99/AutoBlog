import "server-only";
import fuelData from "./data/fuel.json";
import { FUEL_COUNTRIES } from "./config";
import { dateLong, fmt } from "./format";

/* Fuel prices.
 *
 * Source of truth: ./data/fuel.json — official monthly announcements, one row per
 * grade, each with its source URL and the date it was checked. It is a plain JSON
 * file on purpose: the reviewer updates it once a month (copy the new announcement
 * in, bump `month`, add the rows) and the next build publishes it. Nothing here
 * scrapes a retailer.
 *
 * Rows are labelled with source_type: "official" (a government/national-oil-company
 * page or the statement itself) or "news-quoting-official" (the official statement
 * was only readable through a newspaper). The page prints that distinction.
 */

export type FuelRow = {
  country: string;
  currency: string;
  grade: string;
  grade_key: string;
  price: number;
  unit: string;
  effective_from: string;
  source_url: string;
  source_type: string;
  checked: string;
};

type FuelFile = { month: string; records: (FuelRow | { country: string; unverified: true; notes: string })[] };

const FILE = fuelData as unknown as FuelFile;

export function fuelMonth(): string {
  return FILE.month;
}

export function fuelRows(country: string): FuelRow[] {
  return FILE.records.filter((r): r is FuelRow => "price" in r && r.country === country).sort((a, b) => a.price - b.price);
}

export function fuelNotes(country: string): string | null {
  const n = FILE.records.find((r) => "unverified" in r && r.country === country);
  return n && "notes" in n ? n.notes : null;
}

export function fuelCountry(slug: string) {
  return FUEL_COUNTRIES.find((c) => c.slug === slug);
}

/** "2026-11" → "November 2026" */
export function monthName(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${names[(m ?? 1) - 1]} ${y}`;
}

export type FuelView = {
  country: string;
  name: string;
  flag: string;
  month: string;
  monthLabel: string;
  rows: FuelRow[];
  notes: string | null;
  updated: string;
  checked: string;
  sourceUrl: string;
  sourceType: string;
  cheapest: FuelRow | null;
  dearest: FuelRow | null;
  title: string;
  description: string;
  faq: { q: string; a: string }[];
};

export function buildFuelView(slug: string): FuelView | null {
  const c = fuelCountry(slug);
  if (!c) return null;
  const rows = fuelRows(c.slug);
  const notes = fuelNotes(c.slug);
  const month = fuelMonth();
  const monthLabel = monthName(month);
  const checked = rows[0]?.checked ?? "";
  const updated = checked;
  const label = monthLabel;

  const explain: Record<string, string> = {
    uae: "UAE petrol prices are set monthly by the Ministry of Energy and Infrastructure and announced through WAM and the national retailers, who apply the same figures.",
    "saudi-arabia": "Saudi fuel prices are set by the government and applied by Aramco; the levels have been held steady for several months.",
    qatar: "Qatar's retail fuel prices are set by QatarEnergy for the following month and published on its price page.",
    kuwait: "Kuwait's domestic fuel prices are set by the government and applied at KNPC stations.",
    oman: "Oman adjusts fuel prices on the first of each month; the figures are published by the Ministry of Energy and Minerals and the fuel marketing companies.",
    bahrain: "Bahrain's fuel prices are reviewed monthly by a government committee and announced through the national news agency.",
  };

  const cheapest = rows.length ? rows.reduce((a, b) => (a.price <= b.price ? a : b)) : null;
  const dearest = rows.length ? rows.reduce((a, b) => (a.price >= b.price ? a : b)) : null;
  const grade95 = rows.find((r) => r.grade_key === "95") ?? rows.find((r) => /95/.test(r.grade)) ?? rows[0] ?? null;
  const diesel = rows.find((r) => /diesel/i.test(r.grade)) ?? null;

  const title = `Petrol price in ${c.name} — ${label}: 95-octane ${rows.length ? `${grade95!.currency} ${fmt(grade95!.price, 3)}/litre` : "see official price"} (${label})`;
  const description = rows.length
    ? `Official fuel prices in ${c.name} for ${label}: ${rows.map((r) => `${r.grade} ${r.currency} ${fmt(r.price, 3)}`).join(", ")} per litre. Source and date printed on the page.`
    : `Official fuel prices in ${c.name} for ${label} — the official announcement has not been recorded yet.`;

  const faq = [
    {
      q: `How much is petrol in ${c.name} in ${label}?`,
      a: rows.length
        ? `${grade95 ? `95-octane costs ${grade95.currency} ${fmt(grade95.price, 3)} per litre. ` : ""}Diesel is ${diesel ? `${diesel.currency} ${fmt(diesel.price, 3)} per litre` : "listed below with its grade"}, and the full ${label} table by grade is on this page.`
        : `The ${label} official prices have not been recorded yet, so no figure is shown here rather than an estimate. Check the official source linked on this page.`,
    },
    {
      q: `When do ${c.name} petrol prices change?`,
      a: `Once a month. ${explain[c.slug] ?? ""} A new price takes effect on the first of the month, and this page is rebuilt after each official announcement.`,
    },
    {
      q: `Why is diesel a different price?`,
      a: `Diesel and the petrol grades are priced separately. Diesel tends to follow the industrial price, so it can move in the opposite direction to 95-octane in the same month.`,
    },
    {
      q: "Does this include VAT?",
      a: `The published pump prices are the retail prices consumers pay, which include the VAT rate that applies in ${c.name}. The official source linked here is the one to check before you quote a figure.`,
    },
  ];

  return {
    country: c.slug,
    name: c.name,
    flag: c.flag,
    month,
    monthLabel,
    rows,
    notes,
    updated,
    checked,
    sourceUrl: rows[0]?.source_url ?? "",
    sourceType: rows[0]?.source_type ?? "official",
    cheapest,
    dearest,
    title,
    description,
    faq,
  };
}

export { dateLong };
