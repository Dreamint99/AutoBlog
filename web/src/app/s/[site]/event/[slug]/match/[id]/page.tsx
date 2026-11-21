import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import { sitePrefix } from "@/lib/public-path";
import { feedMatch, getEventMatch, knownTeam } from "@/sites/ninetymins/events/directory";
import { liveFor } from "@/sites/ninetymins/events/liveBoard";
import { getHub } from "@/sites/ninetymins/events/catalog";
import { ZONES, formatKick, formatVenueDate } from "@/sites/ninetymins/events/zones";
import { matchPath, teamPath } from "@/sites/ninetymins/events/paths";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; slug: string; id: string }> };

async function load(slug: string, id: string) {
  const hub = getHub(slug);
  const listed = getEventMatch(slug, id);
  if (listed) return listed;
  if (!hub) return undefined;
  const live = await liveFor(hub);
  return live.map((hit) => feedMatch(slug, hit)).find((m) => m && m.slug === id) || undefined;
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
          sport: "Cricket",
          url: `${base}${path}`,
          ...(place ? { location: { "@type": "Place", name: place, address: { "@type": "PostalAddress", addressLocality: fx.city || place, addressCountry: fx.country } } } : {}),
          ...(fx.home && fx.away ? { competitor: [{ "@type": "SportsTeam", name: fx.home }, { "@type": "SportsTeam", name: fx.away }] } : {}),
        }] : []),
      ]} />
      <nav className="nm-wrap nm-crumbs" aria-label="Breadcrumb">
        <Link href={prefix || "/"}>NinetyMins</Link> / <Link href={`${prefix}/event`}>Events</Link> / <Link href={`${prefix}/event/${slug}`}>{row.eventTitle}</Link> / <span>{fx.name}</span>
      </nav>
      <article className="nm-wrap nv-ev nv-ev-prose">
        <p className="nv-ev-kicker">{fx.stage}</p>
        <h1>{fx.home && fx.away ? <>{knownTeam(slug, fx.home) ? <Link href={`${prefix}${teamPath(slug, fx.home)}`}>{fx.home}</Link> : fx.home} vs {knownTeam(slug, fx.away) ? <Link href={`${prefix}${teamPath(slug, fx.away)}`}>{fx.away}</Link> : fx.away}</> : fx.name}</h1>
        <p>{row.summary}</p>
        {hit ? <p>{hit.state === "in" ? "Live" : hit.state === "post" ? "Result" : "Scheduled"}: {hit.score || hit.detail}. This line comes from the same cricket feed as the live board.</p> : <p>No score for this fixture is in the live feed yet.</p>}
        <h2>Time and place</h2>
        {fx.start ? (
          <ul>
            {ZONES.filter((z) => z.id).map((z) => <li key={z.id}>{z.label}: {formatKick(fx.start!, z.id)}</li>)}
          </ul>
        ) : <p>{fx.localDate ? `${formatVenueDate(fx.localDate)} at the venue. No kick-off time is in the feed.` : "No date is in the feed."}</p>}
        <p>{place || "Venue not in the feed."}{fx.country ? `, ${fx.country}` : ""}</p>
        {row.h2h ? <p>Head to head in the Cricsheet {row.h2h.season} file: {row.h2h.matches} meetings, {row.h2h.homeWins} won by {fx.home}, {row.h2h.awayWins} by {fx.away}. © Cricsheet, ODC-By.</p> : null}
        {fx.note ? <p>{fx.note}</p> : null}
        <p><Link href={`${prefix}/event/${slug}`}>Back to {row.eventTitle}</Link></p>
      </article>
    </Shell>
  );
}
