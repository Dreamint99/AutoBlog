import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import MatchCenter from "@/sites/ninetymins/MatchCenter";
import { getMatch, slugToLeague, matchPath, type NmMatch } from "@/sites/ninetymins/live";

export const dynamic = "force-dynamic";

/* NinetyMins match centre: /match/<league-slug>/<espnId>-<home>-vs-<away>. */

type P = { params: Promise<{ site: string; league: string; id: string }> };

async function load({ params }: P): Promise<{ m: NmMatch; site: NonNullable<ReturnType<typeof getSite>>; path: string } | null> {
  const { site: sid, league: ls, id: raw } = await params;
  const site = getSite(sid);
  const league = slugToLeague(ls);
  const id = raw.match(/^\d+/)?.[0];
  if (!site || site.id !== "ninetymins" || !league || !id) return null;
  const m = await getMatch(league, id);
  if (!m) return null;
  return { m, site, path: matchPath(league, id, m.home.name, m.away.name) };
}

function titleOf(m: NmMatch): string {
  const vs = `${m.home.full} vs ${m.away.full}`;
  if (m.state === "pre") return `${vs} live score, line-ups & kick-off time — ${m.leagueLabel}`;
  if (m.state === "in") return `LIVE: ${m.home.full} ${m.home.score}-${m.away.score} ${m.away.full} — ${m.leagueLabel} live score`;
  return `${m.home.full} ${m.home.score}-${m.away.score} ${m.away.full}: result, goals & stats — ${m.leagueLabel}`;
}

export async function generateMetadata(p: P): Promise<Metadata> {
  const r = await load(p);
  if (!r) return { title: "Match not found", robots: { index: false } };
  const { m, site, path } = r;
  const title = `${titleOf(m)} | ${site.name}`;
  const when = new Date(m.date).toUTCString().slice(0, 16);
  const description =
    m.state === "pre"
      ? `${m.home.full} vs ${m.away.full} (${m.leagueLabel}) on ${when}${m.venue ? ` at ${m.venue}` : ""}: kick-off in your timezone, live score, line-ups and stats as they happen.`
      : `${m.home.full} ${m.home.score}-${m.away.score} ${m.away.full} (${m.leagueLabel}): live timeline, goalscorers, line-ups and match stats${m.venue ? ` from ${m.venue}` : ""}.`;
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: path },
    openGraph: { title, description, type: "website", url: path, images: m.home.logo ? [m.home.logo] : undefined },
    twitter: { card: "summary", title, description },
  };
}

export default async function MatchPage(p: P) {
  const { id: raw } = await p.params;
  const r = await load(p);
  if (!r) notFound();
  const { m, site, path } = r;
  // Old/short links (no team slug) → the canonical readable URL.
  if (!raw.includes("-")) permanentRedirect(`/s/${site.id}${path}`);
  const base = siteBaseUrl(site);

  const event: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${m.home.full} vs ${m.away.full}`,
    startDate: m.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    sport: m.sport === "basketball" ? "Basketball" : "Soccer",
    superEvent: { "@type": "SportsEvent", name: m.leagueLabel },
    homeTeam: { "@type": "SportsTeam", name: m.home.full, ...(m.home.logo ? { logo: m.home.logo } : {}) },
    awayTeam: { "@type": "SportsTeam", name: m.away.full, ...(m.away.logo ? { logo: m.away.logo } : {}) },
    competitor: [
      { "@type": "SportsTeam", name: m.home.full },
      { "@type": "SportsTeam", name: m.away.full },
    ],
    url: `${base}${path}`,
    ...(m.venue
      ? { location: { "@type": "Place", name: m.venue, address: m.city || m.venue } }
      : { location: { "@type": "Place", name: m.leagueLabel, address: m.city || "TBC" } }),
  };

  return (
    <Shell site={site}>
      <JsonLd
        data={[
          event,
          breadcrumbSchema([
            { name: site.name, url: `${base}/` },
            { name: "Live scores", url: `${base}/scores` },
            { name: `${m.home.full} vs ${m.away.full}`, url: `${base}${path}` },
          ]),
        ]}
      />
      <nav className="nm-wrap nm-crumbs nm-mc-crumbs" aria-label="Breadcrumb">
        <a href={`/s/${site.id}`}>Home</a>
        <span>/</span>
        <a href={`/s/${site.id}/scores`}>Live scores</a>
        <span>/</span>
        <span>{m.leagueLabel}</span>
      </nav>
      <h1 className="nm-sr">{titleOf(m)}</h1>
      <MatchCenter initial={m} />
    </Shell>
  );
}
