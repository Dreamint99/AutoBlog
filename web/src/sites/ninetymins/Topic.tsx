import type { Site, Article } from "@/lib/types";
import { Shell, Card } from "./Chrome";
import type { NmComp } from "./comps";
import { LeagueFixtures, LeagueTable } from "./LiveScores";
import { bundesligaScorers } from "./free";

/* Competition hub → ESPN feeds for its rail (fixtures, and a table where one exists). */
const HUB_FEED: Record<string, { fx?: string; table?: string; tableTitle?: string }> = {
  "champions-league": { fx: "uefa.champions" },
  "premier-league": { fx: "eng.1", table: "eng.1", tableTitle: "Premier League table" },
  football: { fx: "eng.1,esp.1,ita.1,ger.1,ind.1", table: "esp.1", tableTitle: "LaLiga table" },
  "world-cup": { fx: "fifa.worldq.afc,fifa.friendly" },
  basketball: { fx: "nba" },
  cricket: { fx: "cricket" },
  "formula-1": { fx: "f1" },
  tennis: { fx: "atp" },
};

export default async function NinetyminsTopic({ site, comp, articles }: { site: Site; comp: NmComp; articles: Article[] }) {
  const feed = HUB_FEED[comp.slug] || {};
  const scorers = comp.slug === "football" ? await bundesligaScorers(10) : [];
  return (
    <Shell site={site}>
      <section className="nm-hub" style={{ background: comp.color }}>
        <div className="nm-wrap">
          <span className="nm-hub-sport">{comp.sport}</span>
          <h1>{comp.label}</h1>
          <p>{comp.blurb}</p>
          <span className="nm-hub-count">{articles.length} guides</span>
        </div>
      </section>
      <div className="nm-wrap nm-hub-grid">
        <div>
          {articles.length ? (
            <div className="nm-grid3">
              {articles.map((a) => (
                <Card site={site} article={a} dek key={a.id} />
              ))}
            </div>
          ) : (
            <div className="nm-empty">
              <h2>No {comp.label} guides yet</h2>
              <p>New fixtures, kick-off times and where-to-watch guides are on the way.</p>
            </div>
          )}
        </div>
        <aside className="nm-rail2">
          {feed.fx ? <LeagueFixtures league={feed.fx} title={`${comp.label} — live & upcoming`} /> : null}
          {feed.table ? <LeagueTable league={feed.table} title={feed.tableTitle} rows={20} /> : null}
          {scorers.length ? (
            <section className="nm-box nm-table" aria-label="Bundesliga top scorers">
              <h3 className="nm-box-h">Bundesliga top scorers</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Goals</th>
                  </tr>
                </thead>
                <tbody>
                  {scorers.map((g, i) => (
                    <tr key={g.name}>
                      <td>{i + 1}</td>
                      <td className="nm-t-team">{g.name}</td>
                      <td>
                        <b>{g.goals}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="nm-box-note">Data: OpenLigaDB</p>
            </section>
          ) : null}
        </aside>
      </div>
    </Shell>
  );
}
