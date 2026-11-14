import { defaultOgImages } from "@/lib/og";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import { LeagueTable } from "@/sites/ninetymins/LiveScores";
import { Livescore, type LsEvent } from "@/sites/ninetymins/Livescore";
import { LS_SPORTS } from "@/sites/ninetymins/sports";
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
    openGraph: { images: defaultOgImages(), title, description, type: "website", url: "/scores" },
  };
}

export default async function ScoresPage({ params }: P) {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") notFound();
  const base = siteBaseUrl(site);
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const initial = (await Promise.all(LS_SPORTS[0].leagues.map((l) => getScores(l, day)))).flat() as LsEvent[];

  return (
    <Shell site={site}>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: `${base}/` }, { name: "Live scores", url: `${base}/scores` }])} />
      <div className="lv-page">
        <div className="nm-wrap lv-top">
          <h1>
            Live scores today <span>· every match, updated live</span>
          </h1>
        </div>
        <div className="nm-wrap lv-grid lv-grid-2">
          <div className="lv-main">
            <Livescore initial={initial} day={day} />
          </div>
          <aside className="lv-right" aria-label="Table and competitions">
            <LeagueTable league="eng.1" title="Premier League" rows={20} />
            <section className="nm-box">
              <h3 className="nm-box-h">Competitions</h3>
              <ul className="nm-railist">
                {Object.entries(NM_LEAGUES).map(([l, v]) => (
                  <li key={l}>
                    <Link href={l === "cricket" ? `/s/${site.id}/cricket` : `/s/${site.id}/league/${l.replace(/\./g, "-")}`}>{v.label}</Link>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
