import { geoDistance } from "d3-geo";
import FACTS from "@/data/world-facts.json";
import COUNTRIES from "@/data/world-countries.json";

export type Fact = { cap: string; pop: number; area: number; lang: string[]; cur: string[]; tz: number; ll: [number, number]; nb: string[] };
export type C = { iso2: string; name: string; numeric: string | null; cont: string };

export const LIST = COUNTRIES as C[];
export const F = FACTS as unknown as Record<string, Fact>;
export const BY_ISO = new Map(LIST.map((c) => [c.iso2, c]));
export const TOTAL = 195;
export const CONT: Record<string, string> = { AS: "Asia", EU: "Europe", AF: "Africa", NA: "North America", SA: "South America", OC: "Oceania" };
export const CONT_ORDER = ["AS", "EU", "AF", "NA", "SA", "OC"];
const EARTH_KM = 6371;
const CIRCUMFERENCE_KM = 40075;
const WORLD_POP = Object.values(F).reduce((s, f) => s + (f.pop || 0), 0);
const WORLD_AREA = Object.values(F).reduce((s, f) => s + (f.area || 0), 0);

export const LEVELS = [
  { min: 0, name: "Homebody", emoji: "🏡" },
  { min: 1, name: "Tourist", emoji: "🎒" },
  { min: 6, name: "Traveller", emoji: "🧳" },
  { min: 16, name: "Explorer", emoji: "🧭" },
  { min: 31, name: "Globetrotter", emoji: "🌍" },
  { min: 61, name: "Nomad", emoji: "🛫" },
  { min: 100, name: "Legend", emoji: "🏆" },
];

export function levelOf(n: number) {
  const i = LEVELS.reduce((acc, l, idx) => (n >= l.min ? idx : acc), 0);
  return { ...LEVELS[i], next: LEVELS[i + 1] };
}

/** [lng, lat] for a country (data stores [lat, lng]). */
export const lonlat = (iso: string): [number, number] | null => {
  const f = F[iso];
  return f ? [f.ll[1], f.ll[0]] : null;
};

export function kmBetween(a: string, b: string): number {
  const pa = lonlat(a);
  const pb = lonlat(b);
  return pa && pb ? Math.round(geoDistance(pa, pb) * EARTH_KM) : 0;
}

const fmt = (n: number) => n.toLocaleString("en-US");
export const compact = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n);

export interface Insights {
  count: number;
  pct: number;
  continents: number;
  perCont: { k: string; n: number; total: number }[];
  landPct: number;
  popPct: number;
  pop: number;
  farthest: { iso: string; km: number } | null;
  closest: { iso: string; km: number } | null;
  totalKm: number;
  laps: number;
  north: string | null;
  south: string | null;
  east: string | null;
  west: string | null;
  languages: number;
  currencies: number;
  timezones: number;
  hemispheres: string[];
  next: string[];
  level: ReturnType<typeof levelOf>;
}

/** Everything the panel and the share image show, from the visited list. */
export function computeInsights(visited: string[], home: string): Insights {
  const away = visited.filter((v) => v !== home && F[v]);
  const all = [...new Set([home, ...away])].filter((v) => F[v]);
  const perCont = CONT_ORDER.map((k) => ({ k, total: LIST.filter((c) => c.cont === k).length, n: all.filter((i) => BY_ISO.get(i)?.cont === k).length }));
  const dist = away.map((iso) => ({ iso, km: kmBetween(home, iso) })).sort((a, b) => b.km - a.km);
  const totalKm = dist.reduce((s, d) => s + d.km, 0);
  const by = (fn: (f: Fact) => number) => (all.length ? all.reduce((best, i) => (fn(F[i]) > fn(F[best]) ? i : best), all[0]) : null);
  const langs = new Set(all.flatMap((i) => F[i].lang));
  const curs = new Set(all.flatMap((i) => F[i].cur));
  const tz = all.reduce((s, i) => s + F[i].tz, 0);
  const hemi = new Set<string>();
  for (const i of all) {
    const [lat, lng] = F[i].ll;
    hemi.add(lat >= 0 ? "Northern" : "Southern");
    hemi.add(lng >= 0 ? "Eastern" : "Western");
  }
  const counts = new Map<string, number>();
  for (const i of all) for (const nb of F[i].nb) if (!all.includes(nb)) counts.set(nb, (counts.get(nb) || 0) + 1);
  const next = [...counts.entries()].sort((a, b) => b[1] - a[1] || (F[b[0]]?.pop || 0) - (F[a[0]]?.pop || 0)).slice(0, 6).map(([i]) => i);
  const pop = all.reduce((s, i) => s + (F[i].pop || 0), 0);
  const area = all.reduce((s, i) => s + (F[i].area || 0), 0);
  return {
    count: away.length,
    pct: Math.min(100, Math.round((away.length / TOTAL) * 1000) / 10),
    continents: perCont.filter((c) => c.n > 0).length,
    perCont,
    landPct: Math.round((area / WORLD_AREA) * 1000) / 10,
    popPct: Math.round((pop / WORLD_POP) * 1000) / 10,
    pop,
    farthest: dist[0] || null,
    closest: dist.length ? dist[dist.length - 1] : null,
    totalKm,
    laps: Math.round((totalKm / CIRCUMFERENCE_KM) * 10) / 10,
    north: by((f) => f.ll[0]),
    south: by((f) => -f.ll[0]),
    east: by((f) => f.ll[1]),
    west: by((f) => -f.ll[1]),
    languages: langs.size,
    currencies: curs.size,
    timezones: tz,
    hemispheres: [...hemi],
    next,
    level: levelOf(away.length),
  };
}

export { fmt };
