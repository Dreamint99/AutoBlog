import type { Site, Article } from "@/lib/types";
import { Shell, Card } from "./Chrome";
import type { NmComp } from "./comps";
import { LeagueFixtures, LeagueTable } from "./LiveScores";

/* Competition hub → ESPN feeds for its rail (fixtures, and a table where one exists). */
const HUB_FEED: Record<string, { fx?: string; table?: string; tableTitle?: string }> = {
  "champions-league": { fx: "uefa.champions" },
  "premier-league": { fx: "eng.1", table: "eng.1", tableTitle: "Premier League table" },
  football: { fx: "eng.1,esp.1,ita.1,ger.1", table: "esp.1", tableTitle: "LaLiga table" },
  "world-cup": { fx: "eng.1,uefa.champions" },
  basketball: { fx: "nba" },
  "formula-1": { fx: "f1" },
  tennis: { fx: "atp" },
};

export default function NinetyminsTopic({ site, comp, articles }: { site: Site; comp: NmComp; articles: Article[] }) {
  const feed = HUB_FEED[comp.slug] || {};
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
        </aside>
      </div>
    </Shell>
  );
}
