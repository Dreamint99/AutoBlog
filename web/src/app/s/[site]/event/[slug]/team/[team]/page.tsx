import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, d1 } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import { sitePrefix } from "@/lib/public-path";
import { getEventTeam } from "@/sites/ninetymins/events/directory";
import { storedPortraits } from "@/sites/ninetymins/events/feed";
import { formatKick, formatVenueDate } from "@/sites/ninetymins/events/zones";
import { matchPath, teamPath } from "@/sites/ninetymins/events/paths";
import { initials, teamColour } from "@/sites/ninetymins/events/colours";
import { faceFor, type Face } from "@/sites/ninetymins/events/faces";
import { IPL_RETAINED } from "@/sites/ninetymins/events/retentions";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; slug: string; team: string }> };
const GROUPS = ["Keeper", "Batter", "All-rounder", "Bowler", "Role not listed"] as const;

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
  const portraits = await storedPortraits();
  const links = await playerHrefs(row.players.map((p) => p.name));
  const colour = teamColour(row.name);
  const purse = slug === "ipl-2027" ? IPL_RETAINED.find((t) => t.team === row.name)?.purseLeftCr : undefined;
  const now = Date.now();
  const dated = row.fixtures.filter((f) => f.start || f.localDate);
  const upcoming = dated.filter((f) => !f.start || new Date(f.start).getTime() >= now).slice(0, 4);
  const nextUp = upcoming.length ? upcoming : dated.slice(0, 4);
  const venues = [...new Set(row.fixtures.map((f) => [f.venue, f.city].filter(Boolean).join(", ")).filter(Boolean))];
  const credits: { name: string; face: Face }[] = [];
  const grouped = new Map<string, typeof row.players>();
  for (const player of row.players) {
    const face = faceFor(player.name, portraits);
    const group = face?.role || "Role not listed";
    grouped.set(group, [...(grouped.get(group) || []), player]);
    if (face?.thumb) credits.push({ name: player.name, face });
  }
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
      <article className="nv-face">
        <header className="nv-face-hero" style={{ ["--a" as string]: colour.a, ["--b" as string]: colour.b }}>
          <div className="nm-wrap nv-face-hero-in">
            <p className="nv-ev-kicker">{row.eventTitle}</p>
            <div className="nv-face-id">
              <span className="nv-avatar nv-avatar-lg" aria-hidden="true">{initials(row.name)}</span>
              <h1>{row.name}</h1>
            </div>
            <p>{row.summary}</p>
          </div>
        </header>
        <div className="nm-wrap nv-ev-facts nv-face-stats">
          <p><small>Squad</small><b>{row.players.length || "—"}</b></p>
          <p><small>Overseas</small><b>{row.players.filter((p) => p.overseas).length || "—"}</b></p>
          <p><small>Played</small><b>{row.record ? row.record.p : "—"}</b></p>
          <p><small>Won</small><b>{row.record ? row.record.w : "—"}</b></p>
          {purse ? <p><small>Purse left</small><b>₹{purse} cr</b></p> : null}
        </div>
        <section className="nm-wrap">
          <h2>Squad</h2>
          {row.players.length ? GROUPS.filter((g) => grouped.get(g)?.length).map((g) => (
            <div key={g} className="nv-role">
              <h3>{g}</h3>
              <ul className="nv-squad">
                {grouped.get(g)!.map((p) => {
                  const face = faceFor(p.name, portraits);
                  return (
                    <li key={p.name}>
                      {face?.thumb ? (
                        <img src={face.thumb} width={96} height={96} alt={p.name} loading="lazy" decoding="async" />
                      ) : (
                        <span className="nv-avatar" aria-hidden="true">{initials(p.name)}</span>
                      )}
                      <b>{links[p.name] ? <Link href={`${prefix}${links[p.name]}`}>{p.name}</Link> : p.name}</b>
                      <small>{face?.role || "Role not in the free sources"}</small>
                      <span className="nv-badges">
                        {slug === "ipl-2027" ? <i>Retained</i> : null}
                        {p.overseas ? <i>Overseas</i> : null}
                        {p.traded ? <i>Traded in</i> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )) : <p>No squad list is in an official feed for this side yet. Names are not guessed.</p>}
        </section>
        <section className="nm-wrap nv-face-split">
          <div>
            <h2>Next on the schedule</h2>
            {nextUp.length ? (
              <ul className="nv-strip">
                {nextUp.map((f) => (
                  <li key={f.id}><Link href={`${prefix}${matchPath(slug, f.id)}`}>{f.name}</Link><small>{when(f)}{f.city ? ` · ${f.city}` : ""}</small></li>
                ))}
              </ul>
            ) : <p>No fixture naming {row.name} has been published.</p>}
          </div>
          <div>
            <h2>Recent form</h2>
            {row.record?.form ? (
              <p className="nv-form" aria-label={`Last matches ${row.record.form}`}>
                {row.record.form.split("").map((ch, i) => <i key={i} className={ch === "W" ? "is-w" : ch === "L" ? "is-l" : ""}>{ch}</i>)}
                <small>Cricsheet {row.record.season}</small>
              </p>
            ) : <p>No recent form is in the Cricsheet file for this side.</p>}
            <h2>Venues on this schedule</h2>
            {venues.length ? <ul className="nv-venue">{venues.map((v) => <li key={v}>{v}</li>)}</ul> : <p>No ground is named for this side. A city on a fixture is not treated as a home venue.</p>}
          </div>
        </section>
        {row.h2h.length ? (
          <section className="nm-wrap">
            <h2>Head to head in the latest Cricsheet season</h2>
            <ul className="nv-strip">
              {row.h2h.map((h) => (
                <li key={h.opponent}><Link href={`${prefix}${teamPath(slug, h.opponent)}`}>{h.opponent}</Link><small>{h.wins}–{h.losses} in {h.matches}</small></li>
              ))}
            </ul>
          </section>
        ) : null}
        {credits.length ? (
          <section className="nm-wrap nv-credits">
            <h2>Image credits</h2>
            <ul>
              {credits.map(({ name, face }) => (
                <li key={name}>{name}: {face.author || "Wikimedia Commons"}, {face.license}. {face.source === "wikidata" ? "Wikidata P18 / Wikimedia Commons." : "TheSportsDB."}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <p className="nm-wrap"><Link href={`${prefix}/event/${slug}`}>Back to {row.eventTitle}</Link></p>
      </article>
    </Shell>
  );
}
