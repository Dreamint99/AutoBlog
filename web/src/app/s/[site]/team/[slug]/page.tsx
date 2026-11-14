import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import { teamFixtures, players } from "@/sites/ninetymins/engine";
import FixtureList, { itemList } from "@/sites/ninetymins/FixtureList";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { site, slug } = await params;
  if (site !== "ninetymins") return {};
  const fs = await teamFixtures(slug), f = fs[0];
  if (!f) return { robots: { index: false, follow: true } };
  const team = f.home_slug === slug ? f.ev.home : f.ev.away;
  return { title: `${team.name}: fixtures, live scores & results`, alternates: { canonical: `/team/${slug}` }, robots: { index: true, follow: true, "max-image-preview": "large" }, openGraph: { images: [{ url: "/og/ninetymins.png", width: 1200, height: 630 }] } };
}
export default async function TeamPage({ params }: P) {
  const { site: sid, slug } = await params, site = getSite(sid);
  if (sid !== "ninetymins" || !site) notFound();
  const fs = await teamFixtures(slug), f = fs[0];
  if (!f) notFound();
  const team = f.home_slug === slug ? f.ev.home : f.ev.away;
  const results = fs.filter(x => x.state === "post").slice(0, 5);
  const squad = await players("team_slug", slug);
  const url = `https://ninetymins.com/team/${slug}`;
  return <Shell site={site}><main className="nm-wrap nm-engine">
    <JsonLd data={[{ "@context": "https://schema.org", "@type": f.ev.sport === "tennis" || f.ev.sport === "mma" ? "Person" : "SportsTeam", name: team.name, url, sport: f.ev.sport }, itemList(fs), breadcrumbSchema([{ name: "NinetyMins", url: "https://ninetymins.com/" }, { name: team.name, url }])]} />
    <h1>{team.name}: fixtures & results</h1><p>{team.name} has {fs.filter(x => x.state === "pre").length} confirmed upcoming fixtures and {fs.filter(x => x.state === "post").length} recorded results in our catalogue. Scores and scheduled times come from ESPN.</p>
    {results.length > 0 && <><h2>Recent form</h2><p>{results.map(r => `${new Date(r.starts).toISOString().slice(0, 10)}: ${r.ev.home.name} ${r.ev.home.score}–${r.ev.away.score} ${r.ev.away.name}`).join("; ")}.</p></>}
    <FixtureList fixtures={fs} />{squad.length > 0 && <><h2>Player statistics</h2><ul>{squad.map(p => <li key={p.path}><a href={p.path}>{p.data.name}</a> — {p.data.position}</li>)}</ul></>}<h2>Competitions</h2><ul>{[...new Map(fs.map(x => [x.league, x.ev.leagueName])).entries()].map(([slug, label]) => <li key={slug}><a href={`/league/${slug}`}>{label}</a></li>)}</ul>
    <p>Latest data change: <time dateTime={fs.reduce((a, b) => a > b.lastmod ? a : b.lastmod, "")}>{fs.reduce((a, b) => a > b.lastmod ? a : b.lastmod, "")}</time>. <a href="https://www.espn.com/">Source: ESPN</a>.</p>
  </main></Shell>;
}
