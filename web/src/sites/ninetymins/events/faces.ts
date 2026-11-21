import bundled from "./portraits.json";

export type Face = {
  name: string;
  source: "wikidata" | "thesportsdb";
  role?: "Keeper" | "Batter" | "All-rounder" | "Bowler";
  thumb?: string;
  width?: number;
  height?: number;
  author?: string;
  license?: string;
};

const BUNDLED = bundled as Record<string, Face>;

export function faceKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** D1 rows override the file shipped with the site. A request never calls Wikidata. */
export function faceFor(name: string, stored?: Record<string, Face> | null): Face | undefined {
  const key = faceKey(name);
  return stored?.[key] || BUNDLED[key];
}
