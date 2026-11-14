import "server-only";
import sasia from "./data/embassies-sasia.json";
import afrasia from "./data/embassies-afrasia.json";
import rest from "./data/embassies-rest.json";
import { GULF_CURRENCIES } from "./config";

/* Embassy and consulate directory.
 *
 * Every record was read from the mission's own website or the sending country's
 * foreign ministry — see "source_url" on each. Fields that could not be verified
 * are empty strings, never guesses; a mission we could not verify keeps
 * verified:false and is not indexed.
 */

export type Mission = {
  source_country: string;
  source_iso2: string;
  gulf: string;
  city: string;
  type: "embassy" | "consulate-general" | "consulate";
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  hours: string;
  source_url: string;
  checked: string;
  verified: boolean;
};

const ALL: Mission[] = [
  ...((sasia as unknown as { records: Mission[] }).records ?? []),
  ...((afrasia as unknown as { records: Mission[] }).records ?? []),
  ...((rest as unknown as { records: Mission[] }).records ?? []),
];

export function allMissions(): Mission[] {
  return ALL;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** india-embassy-in-uae · india-consulate-general-in-uae-dubai */
export function missionSlug(m: Mission): string {
  const kind = m.type.replace(/-/g, "-");
  const base = `${slugify(m.source_country)}-${kind}-in-${m.gulf}`;
  return m.type === "embassy" ? base : `${base}-${slugify(m.city)}`;
}

export function findMission(slug: string): Mission | undefined {
  return ALL.find((m) => missionSlug(m) === slug.toLowerCase());
}

export function gulfLabel(gulf: string): string {
  return GULF_CURRENCIES.find((g) => g.country === gulf)?.short ?? gulf;
}

export function missionsIn(gulf: string): Mission[] {
  return ALL.filter((m) => m.gulf === gulf).sort((a, b) => a.source_country.localeCompare(b.source_country));
}

export function missionsFrom(sourceCountry: string): Mission[] {
  return ALL.filter((m) => m.source_country === sourceCountry).sort((a, b) => a.gulf.localeCompare(b.gulf));
}

export function sourceCountries(): string[] {
  return [...new Set(ALL.map((m) => m.source_country))].sort();
}

/** Google Maps deep link built from the address — a link, not a scrape. */
export function mapLink(m: Mission): string | null {
  const q = [m.name, m.city, m.address].filter(Boolean).join(", ");
  if (!q.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function verifiedMissions(): Mission[] {
  return ALL.filter((m) => m.verified);
}
