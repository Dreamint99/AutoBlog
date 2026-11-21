import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import { sitePrefix } from "@/lib/public-path";
import { feedMatchBySlug, getEventMatch, knownTeam } from "@/sites/ninetymins/events/directory";
import { liveFor } from "@/sites/ninetymins/events/liveBoard";
import { getHub } from "@/sites/ninetymins/events/catalog";
import { ZONES, formatKick, formatVenueDate } from "@/sites/ninetymins/events/zones";
import { matchPath, teamPath } from "@/sites/ninetymins/events/paths";
import { initials, teamColour } from "@/sites/ninetymins/events/colours";
import { KickCountdown } from "@/sites/ninetymins/events/Countdown";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; slug: string; id: string }> };

async function load(slug: string, id: string) {
  const hub = getHub(slug);
  const listed = getEventMatch(slug, id);
  if (listed) return listed;
  if (!hub) return undefined;
  return feedMatchBySlug(slug, id, await liveFor(hub));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { site: sid, slug, id } = await params;
  const site = getSite(sid);
  const row = await load(slug, id);
  if (!site || site.id !== "ninetymins" || !row) return {};
  const title = `${row.fx.name} — ${row.eventTitle}`;
  return {
    title: `${title} | ${site.name}`,
    description: row.summary,
    alternates: { canonical: matchPath(slug, row.fx.id) },
    robots: { index: row.index, follow: true },
  };
}

export default async function EventMatchPage({ params }: P) {
  const { site: sid, slug, id } = await params;
  const site = getSite(sid);
  const row = await load(slug, id);
  if (!site || site.id !== "ninetymins" || !row) notFound();
  const hub = getHub(slug);
  const live = hub ? await liveFor(hub) : [];
  const hit = live.find((m) => row.fx.home && row.fx.away && m.home === row.fx.home && m.away === row.fx.away);
  const prefix = sitePrefix(site.id);
  const base = siteBaseUrl(site).replace(/\/$/, "");
  const path = matchPath(slug, row.fx.id);
  const fx = row.fx;
  const place = fx.venue || fx.city;
  const homeC = teamColour(fx.home || row.eventTitle);
  const awayC = teamColour(fx.away || "away");
  const h2hTotal = row.h2h ? Math.max(row.h2h.matches, 1) : 1;
  const side = (name?: string) => name && knownTeam(slug, name) ? <Link href={`${prefix}${teamPath(slug, name)}`}>{name}</Link> : name;
  return (
    <Shell site={site}>
      <JsonLd data={[
        breadcrumbSchema([
          { name: site.name, url: `${base}/` },
          { name: "Events", url: `${base}/event` },
          { name: row.eventTitle, url: `${base}/event/${slug}` },
          { name: fx.name, url: `${base}${path}` },
        ]),
        ...(fx.schema !== "none" && (fx.start || fx.localDate) ? [{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: fx.name,
          startDate: fx.start || fx.localDate,
          eventStatus: "https://schema.org/EventScheduled",
          sport: hub?.sport === "football" ? "Football" : "Cricket",
          url: `${base}${path}`,
          ...(place ? { location: { "@type": "Place", name: place, address: { "@type": "PostalAddress", addressLocality: fx.city || place, addressCountry: fx.country } } } : {}),
          ...(fx.home && fx.away ? { competitor: [{ "@type": "SportsTeam", name: fx.home }, { "@type": "SportsTeam", name: fx.away }] } : {}),
        }] : []),
      ]} />
      <nav className="nm-wrap nm-crumbs" aria-label="Breadcrumb">
        <Link href={prefix || "/"}>NinetyMins</Link> / <Link href={`${prefix}/event`}>Events</Link> / <Link href={`${prefix}/event/${slug}`}>{row.eventTitle}</Link> / <span>{fx.name}</span>
      </nav>
      <article className="nv-face">
        <header className="nv-face-hero nv-face-vs" style={{ ["--a" as string]: homeC.a, ["--b" as string]: awayC.b }}>
          <div className="nm-wrap">
            <p className="nv-ev-kicker">{fx.stage} · {row.eventTitle}</p>
            {fx.home && fx.away ? (
              <div className="nv-vs">
                <div><span className="nv-avatar nv-avatar-lg" aria-hidden="true">{initials(fx.home)}</span><h1>{side(fx.home)}</h1></div>
                <div className="nv-vs-mid"><b>vs</b>{fx.start ? <KickCountdown iso={fx.start} /> : <p className="nv-face-count">No kick-off published</p>}</div>
                <div><span className="nv-avatar nv-avatar-lg" aria-hidden="true">{initials(fx.away)}</span><h1>{side(fx.away)}</h1></div>
              </div>
            ) : <h1>{fx.name}</h1>}
            <p>{row.summary}</p>
          </div>
        </header>
        <section className={`nm-wrap nv-score${hit?.state === "in" ? " is-live" : ""}`}>
          <h2>{hit?.state === "in" ? "Live" : hit?.state === "post" ? "Result" : "Score"}</h2>
          {hit ? <p><b>{hit.score || hit.detail}</b><small>Same live board as the hub.</small></p> : <p>No score for this fixture is on the live board yet.</p>}
        </section>
        <section className="nm-wrap nv-face-split">
          <div>
            <h2>Time</h2>
            {fx.start ? (
              <ul className="nv-clocks">
                {ZONES.filter((z) => z.id).map((z) => <li key={z.id}><span>{z.label}</span><b>{formatKick(fx.start!, z.id)}</b></li>)}
              </ul>
            ) : <p>{fx.localDate ? `${formatVenueDate(fx.localDate)} at the venue. No kick-off time is in the feed.` : "No date is in the feed."}</p>}
          </div>
          <div className="nv-venue-card">
            <h2>Venue</h2>
            <p><b>{place || "Venue not in the feed"}</b>{fx.country ? <small>{fx.country}</small> : null}</p>
          </div>
        </section>
        <section className="nm-wrap">
          <h2>Head to head</h2>
          {row.h2h && fx.home && fx.away ? (
            <>
              <div className="nv-hbar" role="img" aria-label={`${fx.home} ${row.h2h.homeWins}, ${fx.away} ${row.h2h.awayWins}, ${row.h2h.matches} meetings`}>
                <i style={{ width: `${Math.round((row.h2h.homeWins / h2hTotal) * 100)}%`, background: homeC.a }} />
                <i style={{ width: `${Math.round((row.h2h.awayWins / h2hTotal) * 100)}%`, background: awayC.a }} />
              </div>
              <p>{fx.home} {row.h2h.homeWins} · {fx.away} {row.h2h.awayWins} in {row.h2h.matches} meetings, Cricsheet {row.h2h.season}. © Cricsheet, ODC-By.</p>
            </>
          ) : <p>Cricsheet has no meeting for this pair in the latest season file.</p>}
        </section>
        <section className="nm-wrap">
          <h2>Probable XI</h2>
          <p>No probable XI has been published in the feeds used here, so none is shown.</p>
        </section>
        {fx.note ? <p className="nm-wrap">{fx.note}</p> : null}
        <p className="nm-wrap"><Link href={`${prefix}/event/${slug}`}>Back to {row.eventTitle}</Link></p>
      </article>
    </Shell>
  );
}
