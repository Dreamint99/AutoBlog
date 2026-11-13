import MatchContext from "@/sites/ninetymins/MatchContext";
import { publicPath } from "@/lib/site-context";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import MatchCenter from "@/sites/ninetymins/MatchCenter";
import { getMatch, slugToLeague, matchPath, type NmMatch } from "@/sites/ninetymins/live";
import { loadMatch, answer, sourceUrl, type Fixture } from "@/sites/ninetymins/engine";
import { getStandings } from "@/sites/ninetymins/live";
import { wikiSummary } from "@/sites/ninetymins/free";

function wikiHints(name: string, sport: string): string[] {
  if (sport === "basketball") return [name];
  return [`${name} national football team`, `${name} F.C.`, `${name} FC`, name];
}

export const dynamic = "force-dynamic";

/* NinetyMins match centre: /match/<league-slug>/<espnId>-<home>-vs-<away>. */

type P = { params: Promise<{ site: string; league: string; id: string }> };

async function load({ params }: P): Promise<{ m: NmMatch; site: NonNullable<ReturnType<typeof getSite>>; path: string; fixture: Fixture | null } | null> {
  const { site: sid, league: ls, id: raw } = await params;
  const site = getSite(sid);
  const league = slugToLeague(ls) || ls;
  const id = raw.match(/^\d+/)?.[0];
  if (!site || site.id !== "ninetymins" || !league || !id) return null;
  const loaded = await loadMatch(ls, id);
  if (!loaded) return null;
  const m = loaded.match;
  return { m, site, fixture: loaded.fixture, path: loaded.fixture?.path || matchPath(league, id, m.home.name, m.away.name) };
}

function titleOf(m: NmMatch): string {
  const vs = `${m.home.full} vs ${m.away.full}`;
  if (m.state === "pre") return `${vs} live score, line-ups & where to watch — ${new Date(m.date).toISOString().slice(0, 10)}`;
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
    openGraph: { title, description, type: "website", url: path, images: [{ url: "/og/ninetymins.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og/ninetymins.png"] },
    robots: { index: true, follow: true, "max-image-preview": "large" },
  };
}

export default async function MatchPage(p: P) {
  const { id: raw } = await p.params;
  const r = await load(p);
  if (!r) notFound();
  const { m, site, path, fixture } = r;
  // Old/short links (no team slug) → the canonical readable URL.
  const { league: requestedLeague } = await p.params;
  if (`/match/${requestedLeague}/${raw}` !== path) permanentRedirect(publicPath(site.id, path));
  const base = siteBaseUrl(site);
  const about = (await Promise.all([m.home, m.away].map((t) => wikiSummary(t.full, wikiHints(t.full, m.sport))))).filter(
    (w): w is NonNullable<typeof w> => !!w,
  );

  const event: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${m.home.full} vs ${m.away.full}`,
    startDate: m.date,
    eventStatus: /cancel|abandon/i.test(m.detail) ? "https://schema.org/EventCancelled" : /postpon/i.test(m.detail) ? "https://schema.org/EventPostponed" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    sport: m.sport === "soccer" ? "Soccer" : m.sport,
    description: answer(m),
    image: `${base}/og/ninetymins.png`,
    superEvent: { "@type": "SportsEvent", name: m.leagueLabel },
    homeTeam: { "@type": "SportsTeam", name: m.home.full, ...(m.home.logo ? { logo: m.home.logo } : {}) },
    awayTeam: { "@type": "SportsTeam", name: m.away.full, ...(m.away.logo ? { logo: m.away.logo } : {}) },
    competitor: [
      { "@type": "SportsTeam", name: m.home.full },
      { "@type": "SportsTeam", name: m.away.full },
    ],
    url: `${base}${path}`,
    ...(m.venue ? { location: { "@type": "Place", name: m.venue, ...(m.city ? { address: m.city } : {}) } } : {}),
  };

  const standings = m.state === "pre" ? await getStandings(m.league) : [];
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
      <section className="nm-wrap nm-engine">
        <h1>{titleOf(m)}</h1><p>{answer(m)}</p>
        {fixture && <><p><a href={`/team/${fixture.home_slug}`}>{m.home.full} fixtures</a> · <a href={`/team/${fixture.away_slug}`}>{m.away.full} fixtures</a> · <a href={`/league/${fixture.league}`}>{m.leagueLabel} hub</a> · <a href={`/embed/match/${fixture.league}_${m.id}`}>Score widget</a></p><p>Data changed: <time dateTime={fixture.lastmod}>{fixture.lastmod}</time>. <a href={sourceUrl(fixture.ev)}>Source: ESPN</a>.</p></>}
        {m.state === "post" && <p>{m.home.full} and {m.away.full} finished {m.home.score}–{m.away.score}. {m.events.filter(e => ["goal", "own", "pen"].includes(e.kind)).map(e => `${e.player || e.text} (${e.min})`).join("; ")}</p>}
        {standings.length > 0 && <p>League position before this match: {standings.filter(t => [m.home.name, m.home.full, m.away.name, m.away.full].includes(t.team)).map(t => `${t.team}: ${t.rank}, ${t.points} points from ${t.played} played`).join("; ")}. <a href={`/league/${fixture?.league || m.league.replace(/\./g, "-")}`}>Full standings</a>.</p>}
      </section>
      <MatchCenter initial={m} />
      {fixture && <MatchContext fixture={fixture} />}
      {about.length ? (
        <section className="nm-wrap nm-mc-body nm-about" aria-label="About the teams">
          <h2 className="nm-saff-h">About the teams</h2>
          <div className="nm-about-grid">
            {about.map((w) => (
              <article className="nm-box" key={w.url}>
                <h3 className="nm-box-h">{w.title}</h3>
                <p>{w.extract}</p>
                <a href={w.url} rel="nofollow noopener" target="_blank" className="nm-box-note">
                  Source: Wikipedia (CC BY-SA)
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </Shell>
  );
}
