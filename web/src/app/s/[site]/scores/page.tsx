import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import { Scoreboard, LeagueTable } from "@/sites/ninetymins/LiveScores";
import { BOARD_LEAGUES } from "@/sites/ninetymins/comps";
import { getScores, NM_LEAGUES } from "@/sites/ninetymins/live";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") return {};
  const title = `Live Football Scores Today — Premier League, Champions League, LaLiga, ISL & NBA | ${site.name}`;
  const description =
    "Live scores, today's fixtures and results from the Premier League, Champions League, LaLiga, Serie A, Bundesliga, Indian Super League, AFC qualifiers and the NBA. Updates every 30 seconds, kick-offs in your timezone.";
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/scores" },
    openGraph: { title, description, type: "website", url: "/scores" },
  };
}

export default async function ScoresPage({ params }: P) {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") notFound();
  const base = siteBaseUrl(site);
  const initial = (await Promise.all(BOARD_LEAGUES.map((l) => getScores(l)))).flat();
  const live = initial.filter((e) => e.state === "in").length;

  return (
    <Shell site={site}>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: `${base}/` }, { name: "Live scores", url: `${base}/scores` }])} />
      <section className="nm-hub nm-hub-scores">
        <div className="nm-wrap">
          <span className="nm-hub-sport">
            <i className="nm-dot" /> {live ? `${live} matches live now` : "Live centre"}
          </span>
          <h1>Live Scores Today</h1>
          <p>Every kick-off, goal and final whistle from the competitions we cover — updated every 30 seconds. Tap any match for the live timeline, line-ups and stats.</p>
        </div>
      </section>
      <div className="nm-wrap nm-hub-grid">
        <Scoreboard initial={initial} />
        <aside className="nm-rail2">
          <LeagueTable league="eng.1" title="Premier League table" rows={20} />
          <section className="nm-box">
            <h3 className="nm-box-h">Competitions on this page</h3>
            <ul className="nm-railist">
              {BOARD_LEAGUES.map((l) => (
                <li key={l}>{NM_LEAGUES[l].label}</li>
              ))}
            </ul>
            <p className="nm-box-note">
              Looking for South Asia? See the <Link href={`/s/${site.id}/topic/saff-championship`}>SAFF Championship hub</Link>.
            </p>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
