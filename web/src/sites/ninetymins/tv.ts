// Official free live streams (league / board / broadcaster YouTube channels).
// nm-api tv.ts writes this file; Live TV and the home "Live now" row both read it.
// Nothing here is hardcoded — an empty or failed feed just means "nothing live".

export const TV_FEED = "https://feed.ninetymins.com/v1/tv.json";

export interface TvStream {
  id: string;
  kind: string;
  url?: string;
  title: string;
  channel: string;
  sport: string;
  state: "live" | "upcoming";
  start: string;
  thumb?: string;
  viewers?: number;
  embeddable?: boolean;
  match?: { sport: string; league: string; id: string; name: string };
}

export interface TvFeed {
  t: number;
  live: TvStream[];
  upcoming: TvStream[];
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Watch URL for one official YouTube stream, or null when the row isn't a video we can link. */
export function youtubeWatchUrl(s: Pick<TvStream, "id" | "kind" | "url">): string | null {
  if (s.kind !== "youtube") return null;
  if (YT_ID.test(s.id)) return `https://www.youtube.com/watch?v=${s.id}`;
  if (s.url && /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(s.url)) return s.url;
  return null;
}

/** YouTube titles are shouty and emoji-heavy; keep the words, drop the noise. Mirrors cleanTitle. */
export function cleanStreamTitle(t: string): string {
  return t
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/\s*\|\s*/g, " | ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s|]+|[\s|]+$/g, "")
    .trim();
}

/**
 * Currently-live official YouTube streams.
 * Fixtures the API paired to a match come first, then the rest by concurrent viewers.
 */
export function liveYoutube(feed: TvFeed | null): TvStream[] {
  return (feed?.live || [])
    .filter((s) => youtubeWatchUrl(s))
    .sort((a, b) => Number(Boolean(b.match)) - Number(Boolean(a.match)) || (b.viewers || 0) - (a.viewers || 0));
}

export async function loadTvFeed(): Promise<TvFeed | null> {
  try {
    const r = await fetch(TV_FEED, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    return r.ok ? ((await r.json()) as TvFeed) : null;
  } catch {
    return null;
  }
}
