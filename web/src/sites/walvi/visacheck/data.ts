import raw from "@/data/visa-check.json";
import type { Article } from "@/lib/types";

export interface VcEntry {
  slug: string;
  country: string;
  iso2: string;
  region: string;
  portal: string;
  url: string;
  app: string;
  need: string[];
  tip: string;
}

export const VC_VERIFIED: string = raw.verified;
export const VC: VcEntry[] = raw.countries as VcEntry[];
export const VC_REGIONS = ["Gulf", "Asia", "Europe", "UK & Americas"] as const;
export const VC_TAG = "Visa Check";

const short = (c: string) => c.replace(/ \(.*\)$/, "").toLowerCase();
const ALIASES: Record<string, string[]> = {
  uae: ["uae", "united arab emirates", "dubai"],
  uk: ["uk", "united kingdom", "britain"],
  usa: ["usa", "united states", "us visa"],
  "south-korea": ["south korea", "korea"],
  "schengen-vfs": ["schengen", "vfs"],
  "north-macedonia": ["north macedonia", "macedonia"],
};

/** The Visa Check entry an article is about (title match), if any. */
export function vcFor(a: Pick<Article, "title" | "tags">): VcEntry | undefined {
  const t = a.title.toLowerCase();
  return VC.find((e) => (ALIASES[e.slug] || [short(e.country)]).some((n) => t.includes(n)));
}

export function isVcArticle(a: Pick<Article, "title" | "tags">): boolean {
  return (a.tags || []).some((t) => t.toLowerCase() === VC_TAG.toLowerCase());
}

export function flagFor(e: VcEntry, w = 80): string {
  return e.iso2 === "eu" ? `https://flagcdn.com/w${w}/eu.png` : `https://flagcdn.com/w${w}/${e.iso2}.png`;
}
