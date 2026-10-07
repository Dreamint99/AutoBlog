import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import CricketCenter from "@/sites/ninetymins/CricketCenter";
import { getCricketMatch, type CrMatch } from "@/sites/ninetymins/cricket";

export const dynamic = "force-dynamic";

/* NinetyMins cricket centre: /cricket/<uuid>-<team-a>-vs-<team-b>. */

type P = { params: Promise<{ site: string; id: string }> };

async function load({ params }: P) {
  const { site: sid, id: raw } = await params;
  const site = getSite(sid);
  const id = raw.slice(0, 36);
  if (!site || site.id !== "ninetymins" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const m = await getCricketMatch(id);
  return m ? { m, site, path: `/cricket/${raw}` } : null;
}

function titleOf(m: CrMatch): string {
  const [a, b] = m.teams;
  const t = m.type ? ` ${m.type}` : "";
  if (m.state === "in") return `LIVE: ${a.name} vs ${b.name}${t} live cricket score`;
  if (m.state === "post") return `${a.name} vs ${b.name}${t}: result & scorecard — ${m.status}`;
  return `${a.name} vs ${b.name}${t} live score, start time & venue`;
}

export async function generateMetadata(p: P): Promise<Metadata> {
  const r = await load(p);
  if (!r) return { title: "Match not found", robots: { index: false } };
  const { m, site, path } = r;
  const title = `${titleOf(m)} | ${site.name}`;
  const description = `${m.name}${m.venue ? ` at ${m.venue}` : ""}. ${m.status || "Live score, innings totals and result, updated automatically."}`;
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: path },
    openGraph: { title, description, type: "website", url: path },
  };
}

export default async function CricketPage(p: P) {
  const r = await load(p);
  if (!r) notFound();
  const { m, site, path } = r;
  const base = siteBaseUrl(site);
  const [a, b] = m.teams;
  return (
    <Shell site={site}>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            name: m.name,
            sport: "Cricket",
            startDate: m.date,
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            competitor: [
              { "@type": "SportsTeam", name: a.name },
              { "@type": "SportsTeam", name: b.name },
            ],
            location: { "@type": "Place", name: m.venue || "TBC", address: m.venue || "TBC" },
            url: `${base}${path}`,
          },
          breadcrumbSchema([
            { name: site.name, url: `${base}/` },
            { name: "Cricket", url: `${base}/topic/cricket` },
            { name: `${a.name} vs ${b.name}`, url: `${base}${path}` },
          ]),
        ]}
      />
      <nav className="nm-wrap nm-crumbs nm-mc-crumbs" aria-label="Breadcrumb">
        <a href={`/s/${site.id}`}>Home</a>
        <span>/</span>
        <a href={`/s/${site.id}/topic/cricket`}>Cricket</a>
        <span>/</span>
        <span>{m.type || "Match"}</span>
      </nav>
      <h1 className="nm-sr">{titleOf(m)}</h1>
      <CricketCenter initial={m} />
    </Shell>
  );
}
