import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import { sitePrefix } from "@/lib/public-path";
import { getHub } from "@/sites/ninetymins/events/catalog";
import { HubView } from "@/sites/ninetymins/events/HubView";
import { liveFor } from "@/sites/ninetymins/events/liveBoard";
import { storedStats } from "@/sites/ninetymins/events/feed";
import { buildTable, extraFixtures } from "@/sites/ninetymins/events/table";
import type { Fx, Hub } from "@/sites/ninetymins/events/types";
import statsJson from "@/sites/ninetymins/events/stats.json";
import type { LeagueStats } from "@/sites/ninetymins/events/stats-type";

export const dynamic = "force-dynamic";

const STATS = statsJson as Record<string, LeagueStats>;

type P = { params: Promise<{ site: string; slug: string }> };

function ld(hub: Hub, pageUrl: string) {
  return hub.fixtures.filter((f) => f.schema !== "none" && (f.start || f.localDate)).map((f: Fx) => {
    const teams = [f.home, f.away].filter(Boolean) as string[];
    const place = f.venue || f.city;
    return {
      "@context": "https://schema.org",
      "@type": f.schema === "event" ? "Event" : "SportsEvent",
      name: f.name,
      startDate: f.start || f.localDate,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      ...(f.schema === "sports" ? { sport: hub.sport === "cricket" ? "Cricket" : "Association football" } : {}),
      ...(place
        ? {
            location: {
              "@type": "Place",
              name: place,
              address: { "@type": "PostalAddress", addressLocality: f.city || place, addressCountry: f.country || undefined },
            },
          }
        : {}),
      ...(f.schema === "sports" && teams.length === 2
        ? { competitor: teams.map((name) => ({ "@type": "SportsTeam", name })) }
        : {}),
      url: pageUrl,
    };
  });
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { site: sid, slug } = await params;
  const site = getSite(sid);
  const hub = getHub(slug);
  if (!site || site.id !== "ninetymins" || !hub) return {};
  return {
    title: `${hub.title} | ${site.name}`,
    description: hub.description,
    alternates: { canonical: `/event/${hub.slug}` },
    robots: { index: true, follow: true, "max-image-preview": "large" },
    openGraph: { title: hub.title, description: hub.description, url: `/event/${hub.slug}`, images: [{ url: "/og/ninetymins.png", width: 1200, height: 630 }] },
  };
}

export default async function EventHubPage({ params }: P) {
  const { site: sid, slug } = await params;
  const site = getSite(sid);
  const hub = getHub(slug);
  if (!site || site.id !== "ninetymins" || !hub) notFound();
  const base = siteBaseUrl(site).replace(/\/$/, "");
  const pageUrl = `${base}/event/${hub.slug}`;
  const prefix = sitePrefix(site.id);
  const live = await liveFor(hub);
  const stored = await storedStats();
  const stats = (hub.statsKey && stored?.[hub.statsKey]) || (hub.statsKey ? STATS[hub.statsKey] : null);
  const teams = hub.live.kind === "cricket" ? hub.live.teams : [];
  const table = buildTable(stats, live, teams);
  const schedule = [...hub.fixtures, ...extraFixtures(hub.fixtures, live, teams)];
  return (
    <Shell site={site}>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: `${base}/` },
            { name: "Events", url: `${base}/event` },
            { name: hub.h1, url: pageUrl },
          ]),
          ...ld({ ...hub, fixtures: schedule }, pageUrl),
        ]}
      />
      <nav className="nm-wrap nm-crumbs" aria-label="Breadcrumb">
        <a href={prefix || "/"}>NinetyMins</a>
        <span aria-hidden="true"> / </span>
        <a href={`${prefix}/event`}>Events</a>
        <span aria-hidden="true"> / </span>
        <span>{hub.h1}</span>
      </nav>
      <HubView hub={hub} live={live} stats={stats} prefix={prefix} schedule={schedule} table={table} />
    </Shell>
  );
}
