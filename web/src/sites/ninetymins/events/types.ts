/** Event hubs share one shape so later batches add data, not a new template. */

export type Fx = {
  id: string;
  name: string;
  stage: string;
  /** Clock time the organizer published, with a numeric offset. */
  start?: string;
  /** Venue-local calendar date when no clock time was published. */
  localDate?: string;
  home?: string;
  away?: string;
  venue?: string;
  city?: string;
  country?: string;
  note?: string;
  /** sports = SportsEvent, event = a real non-match (the auction), none = visible but not schema. */
  schema: "sports" | "event" | "none";
};

export type LiveQuery =
  | { kind: "none" }
  | { kind: "ucl" }
  | { kind: "cricket"; series: string[]; teams: string[] };

export type Hub = {
  slug: string;
  h1: string;
  title: string;
  description: string;
  sport: "cricket" | "football";
  kicker: string;
  lede: string[];
  window: string;
  windowStatus: "confirmed" | "partial" | "tbc";
  facts: { label: string; value: string }[];
  fixtures: Fx[];
  fixtureNote: string;
  watch: { place: string; how: string }[];
  watchNote: string;
  statsKey?: "ipl" | "ilt20" | "bbl" | "sa20" | "psl";
  live: LiveQuery;
  links: { href: string; label: string }[];
  sources: { label: string; url: string }[];
};

export type LiveHit = {
  id: string;
  name: string;
  state: "pre" | "in" | "post";
  detail: string;
  date: string;
  href: string;
  home: string;
  away: string;
  score: string;
};
