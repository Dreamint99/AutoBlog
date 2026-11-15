import Link from "next/link";
import type { SiteHomeProps } from "@/lib/types";
import { Shell, Card } from "./Chrome";
import { LeagueTable } from "./LiveScores";
import { Livescore, type LsEvent } from "./Livescore";
import { LS_SPORTS } from "./sports";
import { getScores, NM_LEAGUES, leagueToSlug } from "./live";
import { listHighlights, type Highlight } from "./highlights";
import { HlGrid } from "./HighlightsList";

/* Home (v2, 2026-11-15): the live board front and centre (grouped by competition,
   with sport tabs, a 7-day strip and filters) + the Premier League table beside it;
   then top stories, the newest official highlights and competition tiles.
   Article URLs are unchanged. */

const TILES = ["eng.1", "uefa.champions", "esp.1", "ita.1", "ger.1", "fra.1", "uefa.europa", "afc.saff.championship", "ind.1", "cricket", "nba", "atp", "wta", "nfl", "nhl", "mlb", "ufc", "f1"];

async function todayFootball(day: string): Promise<LsEvent[]> {
  try {
    const lists = await Promise.all(LS_SPORTS[0].leagues.map((l) => getScores(l, day)));
    return lists.flat() as LsEvent[];
  } catch {
    return [];
  }
}

function leagueHref(l: string) {
  if (l === "cricket") return "/cricket";
  if (l === "afc.saff.championship") return "/saff";
  return `/league/${leagueToSlug(l)}`;
}

const sportOf = (l: string) => LS_SPORTS.find((s) => s.leagues.includes(l))?.label ?? (l === "wta" ? "Tennis" : "Football");

export default async function Home({ site, articles }: SiteHomeProps) {
  const s = `/s/${site.id}`;
  const stories = [...articles.filter((a) => !a.is_mock), ...articles.filter((a) => a.is_mock)].slice(0, 8);
  // Server day in UTC; the client re-fetches if the visitor's local day differs.
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const [initial, highlights] = await Promise.all([todayFootball(day), listHighlights("", 4).catch((): Highlight[] => [])]);

  return (
    <Shell site={site} home>
      <div className="nv-home">
        <div className="nm-wrap nv-pagehead">
          <h1>Live scores</h1>
          <p>Football, cricket and every other sport — in your time zone.</p>
        </div>

        <div className="nm-wrap nv-home-grid">
          <div className="nv-home-board" id="scores">
            <Livescore initial={initial} day={day} />
          </div>
          <aside className="nv-home-side" aria-label="Premier League table">
            <LeagueTable league="eng.1" title="Premier League" rows={10} />
            <Link className="nv-sidelink" href={`${s}/league/eng-1`}>
              Full table &amp; fixtures →
            </Link>
          </aside>
        </div>

        {stories.length ? (
          <section className="nm-wrap nv-sec" aria-labelledby="nv-top">
            <div className="nv-sec-head">
              <h2 id="nv-top">Top stories</h2>
              <Link href={`${s}/archive`}>All stories →</Link>
            </div>
            <div className="nv-grid4">
              {stories.map((a) => (
                <Card site={site} article={a} key={a.id} />
              ))}
            </div>
          </section>
        ) : null}

        {highlights.length ? (
          <section className="nm-wrap nv-sec" aria-labelledby="nv-hl">
            <div className="nv-sec-head">
              <h2 id="nv-hl">Highlights</h2>
              <Link href={`${s}/highlights`}>All videos →</Link>
            </div>
            <HlGrid site={site} items={highlights} />
          </section>
        ) : null}

        <section className="nm-wrap nv-sec" aria-labelledby="nv-comp">
          <div className="nv-sec-head">
            <h2 id="nv-comp">Competitions</h2>
            <Link href={`${s}/today`}>Today in every sport →</Link>
          </div>
          <ul className="nv-tiles">
            {TILES.filter((l) => NM_LEAGUES[l]).map((l) => (
              <li key={l}>
                <Link href={`${s}${leagueHref(l)}`}>
                  <b>{NM_LEAGUES[l].label}</b>
                  <small>{sportOf(l)}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
