import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { Shell } from "@/sites/ninetymins/Chrome";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { players, playerIndexable, stat, teamFixtures, type Player } from "@/sites/ninetymins/engine";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; slug: string }> };
const BASE = "https://ninetymins.com";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const age = (birth: string) => { const b = new Date(birth), n = new Date(); let a = n.getUTCFullYear() - b.getUTCFullYear(); if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) a--; return Number.isFinite(a) && a > 0 ? a : 0; };
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** One factual sentence built only from the stored season numbers (no invented claims). */
function summary(p: Player): string {
  const d = p.data, apps = stat(p, "appearances") ?? 0, subs = stat(p, "subIns") ?? 0;
  const comp = d.season || d.league;
  if (!apps) return `${d.name} has no recorded appearances for ${d.team} in the ${comp} so far.`;
  const parts = [`${plural(apps, "appearance")}${subs ? ` (${subs} as a substitute)` : ""}`];
  if (/goalkeeper/i.test(d.position)) {
    const saves = stat(p, "saves"), against = stat(p, "goalsConceded");
    if (saves != null) parts.push(plural(saves, "save"));
    if (against != null) parts.push(`${against} goals conceded`);
  } else {
    parts.push(plural(stat(p, "totalGoals") ?? 0, "goal"), plural(stat(p, "goalAssists") ?? 0, "assist"));
  }
  const y = stat(p, "yellowCards") ?? 0, r = stat(p, "redCards") ?? 0;
  if (y || r) parts.push(`${plural(y, "yellow card")}${r ? ` and ${plural(r, "red card")}` : ""}`);
  return `${d.name} has made ${parts.join(", ")} for ${d.team} in the ${comp}.`;
}

async function load(sid: string, slug: string) {
  if (sid !== "ninetymins") return null;
  const row = (await players("path", `/player/${slug}`))[0];
  if (!row) return null;
  const fs = await teamFixtures(row.team_slug);
  return { row, fs, indexable: playerIndexable(row) && fs.length > 0 };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { site, slug } = await params;
  const r = await load(site, slug);
  if (!r) return { title: "Player not found", robots: { index: false, follow: true } };
  const d = r.row.data;
  return {
    title: `${d.name} stats ${d.season ? d.season.slice(0, 7) : ""}: ${d.team} ${d.position.toLowerCase()} profile`.replace(/\s+/g, " "),
    description: summary(r.row).slice(0, 300),
    alternates: { canonical: `/player/${slug}` },
    robots: { index: r.indexable, follow: true },
  };
}

export default async function PlayerPage({ params }: P) {
  const { site: sid, slug } = await params, site = getSite(sid);
  if (site?.id !== "ninetymins") notFound();
  const r = await load(sid, slug); if (!r) notFound();
  const { row, fs } = r, p = row.data, url = `${BASE}${row.path}`, teamUrl = `${BASE}/team/${row.team_slug}`;
  const leagueName = fs.find(f => f.league === row.league)?.ev.leagueName || p.league;
  const results = fs.filter(f => f.state === "post").slice(0, 5);
  const next = [...fs].reverse().find(f => f.state !== "post" && Date.parse(f.starts) > Date.now() - 3 * 3600000);
  const mates = (await players("team_slug", row.team_slug)).filter(x => x.path !== row.path && playerIndexable(x)).sort((a, b) => (stat(b, "appearances") ?? 0) - (stat(a, "appearances") ?? 0)).slice(0, 16);
  const shown = p.stats.filter(s => s.value !== "");
  const a = p.birthDate ? age(p.birthDate) : 0;
  const person = {
    "@type": "Person", name: p.name, url, ...(p.birthDate ? { birthDate: p.birthDate } : {}),
    ...(p.nationality ? { nationality: { "@type": "Country", name: p.nationality } } : {}),
    ...(p.height ? { height: p.height } : {}),
    jobTitle: `Professional footballer (${p.position})`,
    memberOf: { "@type": "SportsTeam", name: p.team, sport: "Soccer", url: teamUrl },
    affiliation: { "@type": "SportsTeam", name: p.team, url: teamUrl },
  };
  return <Shell site={site}><main className="nm-wrap nm-engine">
    <JsonLd data={[{ "@context": "https://schema.org", "@type": "ProfilePage", url, dateModified: row.lastmod, mainEntity: person }, breadcrumbSchema([{ name: "NinetyMins", url: `${BASE}/` }, { name: leagueName, url: `${BASE}/league/${row.league}` }, { name: p.team, url: teamUrl }, { name: p.name, url }])]} />
    <nav className="nm-crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> <a href={`/league/${row.league}`}>{leagueName}</a> <span>/</span> <a href={`/team/${row.team_slug}`}>{p.team}</a></nav>
    <h1>{p.name}: stats & profile</h1>
    <p>{p.name}{a ? ` (${a})` : ""} is a {p.position.toLowerCase()}{p.nationality ? ` from ${p.nationality}` : ""} in the <a href={`/team/${row.team_slug}`}>{p.team}</a> squad{p.jersey ? `, wearing number ${p.jersey}` : ""}. {summary(row)}</p>
    <h2>Profile</h2>
    <table className="nm-fixtures"><tbody>{[["Club", p.team], ["Position", p.position], ["Shirt number", p.jersey], ["Nationality", p.nationality], ["Born", p.birthDate ? `${day(p.birthDate)}${a ? ` (age ${a})` : ""}` : ""], ["Height", p.height]].filter(([, v]) => v).map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody></table>
    <h2>{p.season || leagueName} statistics</h2>
    <table className="nm-fixtures"><thead><tr><th>Statistic</th><th>Value</th></tr></thead><tbody>{shown.map(s => <tr key={s.key}><th scope="row">{s.label}</th><td>{s.value}</td></tr>)}</tbody></table>
    <p>Figures cover {p.season || leagueName} only and update when the club roster changes.</p>
    {(results.length > 0 || next) && <><h2>{p.team}: recent form</h2>
      {results.length > 0 && <ul>{results.map(f => <li key={f.key}><time dateTime={f.starts}>{day(f.starts)}</time>: <a href={f.path}>{f.ev.home.name} {f.ev.home.score}–{f.ev.away.score} {f.ev.away.name}</a> · {f.ev.leagueName}</li>)}</ul>}
      {next && <p>Next: <a href={next.path}>{next.ev.home.name} vs {next.ev.away.name}</a>, <time dateTime={next.starts}>{day(next.starts)}</time> ({next.ev.leagueName}).</p>}
      <p className="nm-note">Club results; this page does not list which matches {p.name} played in.</p></>}
    {mates.length > 0 && <><h2>{p.team} teammates</h2><ul>{mates.map(m => <li key={m.path}><a href={m.path}>{m.data.name}</a> · {m.data.position} · {plural(stat(m, "appearances") ?? 0, "appearance")}</li>)}</ul></>}
    <p><a href={`/team/${row.team_slug}`}>{p.team} fixtures & squad</a> · <a href={`/league/${row.league}`}>{leagueName} table</a> · Data: <a href={p.source} rel="nofollow">ESPN roster</a>, last changed <time dateTime={row.lastmod}>{day(row.lastmod)}</time>.</p>
  </main></Shell>;
}
