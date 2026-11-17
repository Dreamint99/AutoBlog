import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import { teamFixtures, players, playerIndexable, stat } from "@/sites/ninetymins/engine";
import FixtureList, { itemList } from "@/sites/ninetymins/FixtureList";
import { h2hPath } from "@/sites/ninetymins/h2h";
import { teamLogo, playerPhotos, flagUrl } from "@/sites/ninetymins/media";
import { Crest, Avatar, Flag, TeamLink } from "@/sites/ninetymins/Media";
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
  const squad = (await players("team_slug", slug)).sort((a, b) => (stat(b, "appearances") ?? 0) - (stat(a, "appearances") ?? 0));
  const ranked = squad.filter(playerIndexable);
  const comps = [...new Map(fs.map(x => [x.league, x.ev.leagueName])).entries()];
  const sportName = ({ football: "Soccer", basketball: "Basketball", nfl: "American football", hockey: "Ice hockey", baseball: "Baseball", cricket: "Cricket" } as Record<string, string>)[f.ev.sport] || f.ev.sport;
  const url = `https://ninetymins.com/team/${slug}`;
  const logo = await teamLogo(slug, team.name, team.national, "small");
  const photos = await playerPhotos(squad.map(p => p.path));
  const opp = [...new Map(fs.map(x => { const o = x.home_slug === slug ? x.away_slug : x.home_slug; const s = x.home_slug === slug ? x.ev.away : x.ev.home; return [o, s] as [string, typeof s]; })).entries()].filter(([o]) => o && o !== slug).slice(0, 40);
  const oppLogos = new Map<string, string>();
  for (const [o, s] of opp) oppLogos.set(o, await teamLogo(o, s.name, s.national));
  return <Shell site={site}><main className="nm-wrap nm-engine">
    <JsonLd data={[{ "@context": "https://schema.org", "@type": f.ev.sport === "tennis" || f.ev.sport === "mma" ? "Person" : "SportsTeam", name: team.name, url, sport: sportName, ...(logo ? { logo } : {}), ...(f.ev.sport === "tennis" || f.ev.sport === "mma" ? {} : { memberOf: comps.map(([c, label]) => ({ "@type": "SportsOrganization", name: label, url: `https://ninetymins.com/league/${c}` })), ...(ranked.length ? { athlete: ranked.map(p => ({ "@type": "Person", name: p.data.name, url: `https://ninetymins.com${p.path}` })) } : {}) }) }, itemList(fs), breadcrumbSchema([{ name: "NinetyMins", url: "https://ninetymins.com/" }, { name: team.name, url }])]} />
    <div className="nm-hero-id"><Crest url={logo} name={team.name} size={64} color={team.color} eager /><h1>{team.name}: fixtures & results</h1></div><p>{team.name} has {fs.filter(x => x.state === "pre").length} confirmed upcoming fixtures and {fs.filter(x => x.state === "post").length} recorded results in our catalogue. Scores and scheduled times come from ESPN.</p>
    {results.length > 0 && <><h2>Recent form</h2><p>{results.map(r => `${new Date(r.starts).toISOString().slice(0, 10)}: ${r.ev.home.name} ${r.ev.home.score}–${r.ev.away.score} ${r.ev.away.name}`).join("; ")}.</p></>}
    <FixtureList fixtures={fs} />{squad.length > 0 && <><h2>{team.name} squad statistics</h2><p>{squad[0].data.season || "Current season"} figures from the club roster, most appearances first.</p><div style={{ overflowX: "auto" }}><table className="nm-fixtures"><thead><tr><th>Player</th><th>Position</th><th>Apps</th><th>Goals</th><th>Assists</th></tr></thead><tbody>{squad.map(p => <tr key={p.path}><th scope="row"><span className="nm-person"><Avatar url={photos.get(p.path)} name={p.data.name} size={32} /><a href={p.path}>{p.data.name}</a><Flag url={flagUrl(p.data.nationality, 20)} country={p.data.nationality} w={18} /></span></th><td>{p.data.position}</td><td>{stat(p, "appearances") ?? "–"}</td><td>{stat(p, "totalGoals") ?? "–"}</td><td>{stat(p, "goalAssists") ?? "–"}</td></tr>)}</tbody></table></div></>}{opp.length > 0 && <><h2>Head to head</h2><ul className="nm-team-grid">{opp.map(([o, s]) => <li key={o}><a className="nm-team-link" href={h2hPath(slug, o)}><Crest url={oppLogos.get(o)} name={s.name} size={22} color={s.color} /><span>{team.name} vs {s.name}</span></a></li>)}</ul></>}<h2>Competitions</h2><ul>{comps.map(([slug, label]) => <li key={slug}><a href={`/league/${slug}`}>{label}</a></li>)}</ul>
    <p>Latest data change: <time dateTime={fs.reduce((a, b) => a > b.lastmod ? a : b.lastmod, "")}>{fs.reduce((a, b) => a > b.lastmod ? a : b.lastmod, "")}</time>. <a href="https://www.espn.com/">Source: ESPN</a>.</p>
  </main></Shell>;
}
