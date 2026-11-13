import type { Fixture } from "./engine";

export default function FixtureList({ fixtures, compact = false }: { fixtures: Fixture[]; compact?: boolean }) {
  return <div style={{ overflowX: "auto" }}><table className="nm-fixtures"><caption>Fixtures and results · times in UTC</caption>
    <thead><tr><th scope="col">Date / time (UTC)</th><th scope="col">Match</th><th scope="col">Score / status</th>{!compact && <th scope="col">Competition</th>}</tr></thead>
    <tbody>{[...fixtures].sort((a, b) => a.starts.localeCompare(b.starts)).map(f => <tr key={f.key}>
      <td><time dateTime={f.starts}>{new Date(f.starts).toISOString().slice(0, 16).replace("T", " ")}</time></td>
      <td><a href={f.path}>{f.ev.home.name} vs {f.ev.away.name}</a></td>
      <td>{f.state === "pre" ? f.ev.detail || "Scheduled" : `${f.ev.home.score}–${f.ev.away.score} · ${f.ev.detail}`}</td>
      {!compact && <td><a href={`/league/${f.league}`}>{f.ev.leagueName}</a></td>}
    </tr>)}</tbody>
  </table>{!fixtures.length && <p>No confirmed fixtures in this window.</p>}</div>;
}

export const itemList = (fixtures: Fixture[]) => ({ "@context": "https://schema.org", "@type": "ItemList", numberOfItems: fixtures.length,
  itemListElement: fixtures.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: `${f.ev.home.name} vs ${f.ev.away.name}`, url: `https://ninetymins.com${f.path}` })) });
