import F1Hub from "@/sites/ninetymins/F1Hub";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import { leagueFixtures, players } from "@/sites/ninetymins/engine";
import { getStandings } from "@/sites/ninetymins/live";
import FixtureList, { itemList } from "@/sites/ninetymins/FixtureList";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { site, slug } = await params;
  if (site !== "ninetymins") return {};
  if (slug === "f1") return { title: "Formula 1 sessions & results", alternates: { canonical: "/league/f1" } };
  const fs = await leagueFixtures(slug);
  return { title: `${fs[0]?.ev.leagueName || "Competition"}: fixtures, scores & standings`, alternates: { canonical: `/league/${slug}` }, robots: { index: fs.length > 0, follow: true, "max-image-preview": "large" }, openGraph: { images: [{ url: "/og/ninetymins.png", width: 1200, height: 630 }] } };
}
export default async function LeaguePage({ params }: P) {
  const { site: sid, slug } = await params, site = getSite(sid);
  if (sid !== "ninetymins" || !site) notFound();
  if (slug === "f1") return <Shell site={site}><F1Hub /></Shell>;
  const fs = await leagueFixtures(slug), e = fs[0]?.ev;
  if (!e) notFound();
  const table = await getStandings(e.league);
  const scorers = (await players("league", slug)).map(p => ({ ...p, goals: p.data.stats.find(s => s.key === "totalGoals")?.numeric })).filter(p => p.goals != null).sort((a, b) => b.goals! - a.goals!).slice(0, 20);
  const teams = [...new Map(fs.flatMap(f => [[f.home_slug, f.ev.home.name], [f.away_slug, f.ev.away.name]] as [string, string][])).entries()];
  return <Shell site={site}><main className="nm-wrap nm-engine">
    <JsonLd data={[itemList(fs), breadcrumbSchema([{ name: "NinetyMins", url: "https://ninetymins.com/" }, { name: e.leagueName, url: `https://ninetymins.com/league/${slug}` }])]} />
    <h1>{e.leagueName}: fixtures, scores & results</h1><p>{fs.length} confirmed {e.leagueName} fixtures and results, including {fs.filter(f => f.state === "in").length} live matches. Times are shown in UTC; open a match for your local kick-off time.</p>
    <FixtureList fixtures={fs} />
    {table.length > 0 && <><h2>League standings</h2><div style={{ overflowX: "auto" }}><table className="nm-fixtures"><thead><tr><th>Rank</th><th>Team</th><th>Played</th><th>Points</th><th>Goal difference</th></tr></thead><tbody>{table.map(r => <tr key={r.team}><td>{r.rank}</td><td>{r.team}</td><td>{r.played}</td><td>{r.points}</td><td>{r.gd}</td></tr>)}</tbody></table></div><p>Source: <a href={`https://site.api.espn.com/apis/v2/sports/soccer/${e.league}/standings`}>ESPN league standings</a>.</p></>}
    <h2>Recorded scorers</h2><p>Players with available roster statistics; this list may not cover every squad.</p><ol>{scorers.map(p => <li key={p.path}><a href={p.path}>{p.data.name}</a>: {p.goals} goals ({p.data.season})</li>)}</ol><h2>Teams & participants</h2><ul>{teams.map(([slug, name]) => <li key={slug}><a href={`/team/${slug}`}>{name}</a></li>)}</ul>
    <p><a href={`/embed/league/${slug}`}>Preview the free score widget</a> · <a href="/widgets">Get the embed code</a> · <a href="/today">Today's matches</a> · <a href="/tomorrow">Tomorrow's matches</a></p>
    <p>Source: <a href="https://www.espn.com/">ESPN</a>. Updated when the provider reports a change.</p>
  </main></Shell>;
}
