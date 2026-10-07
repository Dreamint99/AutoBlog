import type { Article } from "@/lib/types";

/** NinetyMins competitions — nav, colour badges, front-page rows and the
 *  /topic/<slug> hubs. Pure data (no JSX) so routes and components share it. */
export interface NmComp {
  slug: string;
  label: string;
  short: string;
  sport: string;
  color: string;
  blurb: string;
  /** Tested against the TITLE first, then tags (the writer tags broadly). */
  re: RegExp;
}

// First match wins, so specific competitions come before their sport.
export const NM_COMPS: NmComp[] = [
  {
    slug: "saff-championship", label: "SAFF Championship", short: "SAFF", sport: "Football", color: "#0a8f4e",
    blurb: "South Asia's national-team championship — history, records, teams and how to watch.",
    re: /\bsaff\b/i,
  },
  {
    slug: "champions-league", label: "Champions League", short: "UCL", sport: "Football", color: "#1d3c9c",
    blurb: "UEFA Champions League fixtures, kick-off times and where to watch, every matchday.",
    re: /champions league|\bucl\b/i,
  },
  {
    slug: "premier-league", label: "Premier League", short: "EPL", sport: "Football", color: "#4b1260",
    blurb: "Premier League schedules, TV channels and streaming options in every timezone.",
    re: /premier league|\bepl\b/i,
  },
  {
    slug: "world-cup", label: "World Cup", short: "WC", sport: "Football", color: "#8a1538",
    blurb: "FIFA World Cup and qualifiers — results, schedules and viewing guides.",
    re: /world cup|\bfifa\b|qualif/i,
  },
  {
    slug: "cricket", label: "Cricket", short: "CRI", sport: "Cricket", color: "#0b7a8a",
    blurb: "IPL, T20, ODI and Test cricket — fixtures, times and where to stream.",
    re: /cricket|\bipl\b|\bt20\b|\bodi\b|test match|\bbpl\b/i,
  },
  {
    slug: "basketball", label: "NBA & Basketball", short: "NBA", sport: "Basketball", color: "#c8102e",
    blurb: "NBA schedules, national TV slots and League Pass options.",
    re: /\bnba\b|basketball/i,
  },
  {
    slug: "formula-1", label: "Formula 1", short: "F1", sport: "Motorsport", color: "#e10600",
    blurb: "Grand Prix weekends — session times by country and how to watch live.",
    re: /formula 1|\bf1\b|grand prix/i,
  },
  {
    slug: "tennis", label: "Tennis", short: "TEN", sport: "Tennis", color: "#2e7d32",
    blurb: "Grand Slams, ATP and WTA — order of play and where to watch.",
    re: /tennis|wimbledon|us open|french open|roland garros|australian open|\batp\b|\bwta\b/i,
  },
  {
    slug: "football", label: "Football", short: "FTB", sport: "Football", color: "#111827",
    blurb: "Every league, every kick-off — today's matches and how to watch them legally.",
    re: /football|soccer|la liga|serie a|bundesliga|ligue 1|\bmls\b|match(es)? today|international break/i,
  },
];

const FALLBACK: NmComp = {
  slug: "football", label: "Sports", short: "90", sport: "Sports", color: "#111827",
  blurb: "", re: /$^/,
};

export function getComp(slug: string): NmComp | undefined {
  return NM_COMPS.find((c) => c.slug === slug);
}

export function compOf(a: Article): NmComp {
  for (const hay of [a.title, (a.tags || []).join(" ")]) {
    const c = NM_COMPS.find((x) => x.re.test(hay));
    if (c) return c;
  }
  return FALLBACK;
}

export function articlesInComp(articles: Article[], slug: string): Article[] {
  if (slug === "football") return articles.filter((a) => compOf(a).sport === "Football");
  return articles.filter((a) => compOf(a).slug === slug);
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "2h ago" / "3d ago" style freshness label, falling back to the date. */
export function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return fmtDate(iso);
}
