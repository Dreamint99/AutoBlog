import Link from "next/link";
import type { SiteHomeProps, Article } from "@/lib/types";
import { Shell } from "./Chrome";
import { ago } from "./comps";
import { LeagueTable } from "./LiveScores";
import { Livescore, type LsEvent } from "./Livescore";
import { LS_SPORTS, PLAY_URL } from "./sports";
import { getScores, NM_LEAGUES, leagueToSlug } from "./live";

/* Home = the scoreboard. Every match the feeds expose, grouped by competition,
   with sport tabs, a date strip and live filters in the middle; competitions on
   the left; the app, a mini table and a small stories column on the right.
   Article URLs are unchanged — stories just moved into the side column. */

const TOP = ["eng.1", "uefa.champions", "esp.1", "ita.1", "ger.1", "fra.1", "uefa.europa", "afc.saff.championship", "fifa.worldq.afc", "ind.1", "usa.1"];
const OTHER = ["cricket", "nba", "nfl", "nhl", "mlb", "atp", "wta", "ufc", "f1"];

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
  return `/league/${leagueToSlug(l)}`;
}

export default async function Home({ site, articles }: SiteHomeProps) {
  const s = `/s/${site.id}`;
  const href = (a: Article) => `${s}/${a.slug}`;
  const stories = [...articles.filter((a) => !a.is_mock), ...articles.filter((a) => a.is_mock)].slice(0, 8);
  // Server day in UTC; the client re-fetches if the visitor's local day differs.
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const initial = await todayFootball(day);

  return (
    <Shell site={site} home>
      <div className="lv-page">
        <div className="nm-wrap lv-top">
          <h1>
            Live scores <span>· football, cricket &amp; more</span>
          </h1>
        </div>

        <div className="nm-wrap lv-grid">
          {/* Left: competitions */}
          <aside className="lv-left" aria-label="Competitions">
            <h2>Top competitions</h2>
            <ul>
              {TOP.filter((l) => NM_LEAGUES[l]).map((l) => (
                <li key={l}>
                  <Link href={leagueHref(l)}>{NM_LEAGUES[l].label}</Link>
                </li>
              ))}
            </ul>
            <h2>Other sports</h2>
            <ul>
              {OTHER.filter((l) => NM_LEAGUES[l]).map((l) => (
                <li key={l}>
                  <Link href={leagueHref(l)}>{NM_LEAGUES[l].label}</Link>
                </li>
              ))}
            </ul>
            <h2>Browse</h2>
            <ul>
              <li><Link href={`${s}/today`}>Today&apos;s matches</Link></li>
              <li><Link href={`${s}/tomorrow`}>Tomorrow</Link></li>
              <li><Link href={`${s}/saff`}>SAFF Championship</Link></li>
              <li><Link href={`${s}/widgets`}>Free score widgets</Link></li>
            </ul>
          </aside>

          {/* Centre: the board */}
          <div className="lv-main" id="scores">
            <Livescore initial={initial} day={day} />
          </div>

          {/* Right: app, table, stories */}
          <aside className="lv-right" aria-label="App, table and stories">
            <a className="lv-app" href={PLAY_URL("home-side")} target="_blank" rel="noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/ninetymins-app-icon.webp" alt="" width={44} height={44} />
              <span>
                <b>NinetyMins app</b>
                <small>Goal alerts &amp; live scores · free</small>
              </span>
              <em>Get it</em>
            </a>

            <LeagueTable league="eng.1" title="Premier League" rows={8} />

            {stories.length ? (
              <section className="lv-stories" aria-label="Stories">
                <h2>Stories</h2>
                <ul>
                  {stories.map((a) => (
                    <li key={a.id}>
                      <Link href={href(a)}>{a.title}</Link>
                      <small>{ago(a.created_at)}</small>
                    </li>
                  ))}
                </ul>
                <Link className="lv-more" href={`${s}/archive`}>
                  All stories →
                </Link>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </Shell>
  );
}
