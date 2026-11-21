import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, d1 } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import { sitePrefix } from "@/lib/public-path";
import { getEventTeam } from "@/sites/ninetymins/events/directory";
import { storedSquads } from "@/sites/ninetymins/events/feed";
import { formatKick, formatVenueDate } from "@/sites/ninetymins/events/zones";
import { matchPath, teamPath } from "@/sites/ninetymins/events/paths";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; slug: string; team: string }> };

async function playerHrefs(names: string[]): Promise<Record<string, string>> {
  const db = d1();
  if (!db || !names.length) return {};
  try {
    const { results } = await db.prepare(`SELECT path, json_extract(body,'$.name') AS name FROM seo_players WHERE json_extract(body,'$.name') IN (${names.map(() => "?").join(",")})`).bind(...names).all<{ path: string; name: string }>();
    return Object.fromEntries((results || []).filter((r) => r.path && r.name).map((r) => [r.name, r.path]));
  } catch {
    return {};
  }
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { site: sid, slug, team } = await params;
  const site = getSite(sid);
  const row = getEventTeam(slug, team);
  if (!site || site.id !== "ninetymins" || !row) return {};
  const title = `${row.name} — ${row.eventTitle}`;
  return {
    title: `${title} | ${site.name}`,
    description: row.summary,
    alternates: { canonical: teamPath(slug, row.name) },
    robots: { index: row.index, follow: true },
    openGraph: { title, description: row.summary, url: teamPath(slug, row.name) },
  };
}

export default async function EventTeamPage({ params }: P) {
  const { site: sid, slug, team } = await params;
  const site = getSite(sid);
  const row = getEventTeam(slug, team);
  if (!site || site.id !== "ninetymins" || !row) notFound();
  const prefix = sitePrefix(site.id);
  const base = siteBaseUrl(site).replace(/\/$/, "");
  const path = teamPath(slug, row.name);
  const squads = await storedSquads();
  const fed = squads[slug]?.[row.slug];
  const players = fed?.length ? fed.map((name) => ({ name })) : row.players;
  const links = await playerHrefs(players.map((p) => p.name));
  const when = (f: (typeof row.fixtures)[number]) => f.start ? formatKick(f.start, "UTC") : f.localDate ? formatVenueDate(f.localDate) : "Date not published";
  return (
    <Shell site={site}>
      <JsonLd data={[
        breadcrumbSchema([
          { name: site.name, url: `${base}/` },
          { name: "Events", url: `${base}/event` },
          { name: row.eventTitle, url: `${base}/event/${slug}` },
          { name: row.name, url: `${base}${path}` },
        ]),
        { "@context": "https://schema.org", "@type": "SportsTeam", name: row.name, sport: "Cricket", url: `${base}${path}`, memberOf: { "@type": "SportsOrganization", name: row.eventTitle, url: `${base}/event/${slug}` } },
      ]} />
      <nav className="nm-wrap nm-crumbs" aria-label="Breadcrumb">
        <Link href={prefix || "/"}>NinetyMins</Link> / <Link href={`${prefix}/event`}>Events</Link> / <Link href={`${prefix}/event/${slug}`}>{row.eventTitle}</Link> / <span>{row.name}</span>
      </nav>
      <article className="nm-wrap nv-ev nv-ev-prose">
        <h1>{row.name}</h1>
        <p>{row.summary}</p>
        {row.record ? <p>Cricsheet {row.record.season}: {row.record.p} played, {row.record.w} won, {row.record.l} lost, {row.record.nr} no-result. Last five: {row.record.form}. Figures © Cricsheet, ODC-By.</p> : null}
        <h2>Squad</h2>
        {players.length ? (
          <ul>
            {players.map((p) => (
              <li key={p.name}>
                {links[p.name] ? <Link href={`${prefix}${links[p.name]}`}>{p.name}</Link> : p.name}
                {"overseas" in p && p.overseas ? " · overseas" : ""}
                {"traded" in p && p.traded ? " · traded" : ""}
              </li>
            ))}
          </ul>
        ) : <p>No squad list is in the feeds for this side yet.</p>}
        <h2>Fixtures and results</h2>
        {row.fixtures.length ? (
          <ul>
            {row.fixtures.map((f) => (
              <li key={f.id}><Link href={`${prefix}${matchPath(slug, f.id)}`}>{f.name}</Link> — {when(f)}{f.city ? `, ${f.city}` : ""}</li>
            ))}
          </ul>
        ) : <p>No fixture naming {row.name} has been published in the feeds used here.</p>}
        {row.h2h.length ? (
          <>
            <h2>Head to head in the latest Cricsheet season</h2>
            <ul>
              {row.h2h.map((h) => (
                <li key={h.opponent}><Link href={`${prefix}${teamPath(slug, h.opponent)}`}>{h.opponent}</Link>: {h.wins}–{h.losses} in {h.matches}</li>
              ))}
            </ul>
          </>
        ) : null}
        <p><Link href={`${prefix}/event/${slug}`}>Back to {row.eventTitle}</Link></p>
      </article>
    </Shell>
  );
}
