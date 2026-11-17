import type { Fixture } from "./engine";
import { teamLogo } from "./media";
import { TeamLink } from "./Media";

export default async function FixtureList({ fixtures, compact = false }: { fixtures: Fixture[]; compact?: boolean }) {
  const logos = new Map<string, string>();
  for (const f of fixtures) for (const [slug, side] of [[f.home_slug, f.ev.home], [f.away_slug, f.ev.away]] as const) if (slug && !logos.has(slug)) logos.set(slug, await teamLogo(slug, side.name, side.national));
  return <div style={{ overflowX: "auto" }}><table className="nm-fixtures"><caption>Fixtures and results · times in UTC</caption>
    <thead><tr><th scope="col">Date / time (UTC)</th><th scope="col">Match</th><th scope="col">Score / status</th>{!compact && <th scope="col">Competition</th>}</tr></thead>
    <tbody>{[...fixtures].sort((a, b) => a.starts.localeCompare(b.starts)).map(f => <tr key={f.key}>
      <td><time dateTime={f.starts}>{new Date(f.starts).toISOString().slice(0, 16).replace("T", " ")}</time></td>
      <td><span className="nm-fx-match"><TeamLink slug={f.home_slug} name={f.ev.home.name} url={logos.get(f.home_slug)} color={f.ev.home.color} /><a className="nm-fx-score" href={f.path} aria-label={`${f.ev.home.name} vs ${f.ev.away.name}: match centre`}>{f.state === "pre" ? "vs" : `${f.ev.home.score}–${f.ev.away.score}`}</a><TeamLink slug={f.away_slug} name={f.ev.away.name} url={logos.get(f.away_slug)} color={f.ev.away.color} /></span></td>
      <td><a href={f.path}>{f.state === "pre" ? f.ev.detail || "Scheduled" : f.ev.detail || "Result"}</a></td>
      {!compact && <td><a href={`/league/${f.league}`}>{f.ev.leagueName}</a></td>}
    </tr>)}</tbody>
  </table>{!fixtures.length && <p>No confirmed fixtures in this window.</p>}</div>;
}

export const itemList = (fixtures: Fixture[]) => ({ "@context": "https://schema.org", "@type": "ItemList", numberOfItems: fixtures.length,
  itemListElement: fixtures.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: `${f.ev.home.name} vs ${f.ev.away.name}`, url: `https://ninetymins.com${f.path}` })) });
