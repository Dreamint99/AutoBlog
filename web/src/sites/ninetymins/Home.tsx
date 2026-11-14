import Link from "next/link";
import type { SiteHomeProps, Article } from "@/lib/types";
import { Shell, Card, Thumb } from "./Chrome";
import { NM_COMPS, compOf, ago } from "./comps";
import { LeagueTable, LeagueFixtures, MatchdayBoard } from "./LiveScores";
import { heroSrc } from "@/lib/img";

/* Sports-first home. Live scores, today's fixtures, league tables and the app
   download come first; the blog is kept (every article URL stays the same) and
   sits below as "Latest reads". Live parts are client components that poll
   /api/scores, so the page updates without a rebuild. */

/** Hands out articles once per page; real reports before mock ones. */
function picker(all: Article[]) {
  const used = new Set<string>();
  const pool = [...all.filter((a) => !a.is_mock), ...all.filter((a) => a.is_mock)];
  return (from: Article[] | null, n: number): Article[] => {
    const out: Article[] = [];
    for (const a of from ?? pool) {
      if (out.length >= n) break;
      if (used.has(a.id) || (from && a.is_mock)) continue;
      used.add(a.id);
      out.push(a);
    }
    return out;
  };
}

const PLAY = "https://play.google.com/store/apps/details?id=com.ninetymins.app";
const ROWS = ["saff-championship", "champions-league", "premier-league", "world-cup", "cricket", "basketball", "formula-1", "tennis", "football"];

export default function Home({ site, articles }: SiteHomeProps) {
  const s = `/s/${site.id}`;
  const href = (a: Article) => `${s}/${a.slug}`;
  const take = picker(articles);

  const latest = take(null, 8);
  const rows = ROWS.map((slug) => ({
    comp: NM_COMPS.find((c) => c.slug === slug)!,
    items: take(articles.filter((a) => compOf(a).slug === slug), 4),
  })).filter((r) => r.comp && r.items.length >= 2);

  return (
    <Shell site={site} strip={articles.slice(0, 10)}>
      {/* ── 1. MATCHDAY HERO: live + today's matches, auto-refreshing ── */}
      <section className="nm-mdhero" aria-label="Live scores and today's matches">
        <div className="nm-wrap">
          <div className="nm-mdhero-head">
            <div>
              <h1>Live scores &amp; today&apos;s matches</h1>
              <p>Football, cricket and NBA — updates every minute, kick-offs in your time zone.</p>
            </div>
            <div className="nm-mdhero-links">
              <Link href={`${s}/today`}>Today</Link>
              <Link href={`${s}/tomorrow`}>Tomorrow</Link>
              <Link href={`${s}/scores`}>All scores</Link>
            </div>
          </div>
          <MatchdayBoard />
        </div>
      </section>

      {/* ── 2. TABLES · FIXTURES · APP ── */}
      <section className="nm-wrap nm-hub">
        <div className="nm-hub-tables">
          <LeagueTable league="eng.1" title="Premier League table" rows={10} />
          <LeagueTable league="esp.1" title="LaLiga table" rows={10} />
        </div>
        <div className="nm-hub-fx">
          <LeagueFixtures league="uefa.champions" title="Champions League" />
          <LeagueFixtures league="eng.1" title="Premier League fixtures" />
        </div>
        <aside className="nm-hub-side">
          <section className="nm-appcard" aria-label="Get the NinetyMins app">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/ninetymins-app-icon.webp" alt="" width={56} height={56} />
            <h3>NinetyMins app</h3>
            <ul>
              <li>Instant goal &amp; wicket alerts</li>
              <li>Live scores for every match</li>
              <li>Free, no sign-up needed</li>
            </ul>
            <a className="nm-appbtn" href={`${PLAY}&referrer=${encodeURIComponent("utm_source=ninetymins.com&utm_medium=home")}`} target="_blank" rel="noopener">
              Get it on Google Play
            </a>
          </section>
          <section className="nm-box">
            <h3 className="nm-box-h">Competitions</h3>
            <div className="nm-comps">
              {NM_COMPS.map((c) => (
                <Link href={`${s}/topic/${c.slug}`} key={c.slug}>
                  {c.label}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>

      {/* ── 3. COMPETITION FIXTURES ── */}
      {rows.map(({ comp, items }) => (
        <section className="nm-wrap nm-row" key={comp.slug} aria-label={comp.label}>
          <div className="nm-rowhead" style={{ borderColor: comp.color }}>
            <h2>
              <span className="nm-rowchip" style={{ background: comp.color }}>
                {comp.short}
              </span>
              {comp.label}
            </h2>
            <Link href={`${s}/topic/${comp.slug}`} className="nm-more">
              See all <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="nm-grid4">
            {items.map((a) => (
              <Card site={site} article={a} key={a.id} />
            ))}
          </div>
        </section>
      ))}

      {/* ── 4. LATEST READS (blog, same URLs) ── */}
      {latest.length ? (
        <section className="nm-wrap nm-river" aria-label="Latest reads">
          <div>
            <div className="nm-rowhead">
              <h2>Latest reads</h2>
            </div>
            <div className="nm-list">
              {latest.map((a) => (
                <article className="nm-listrow" key={a.id}>
                  <div>
                    <h3 className="nm-h">
                      <Link href={href(a)}>{a.title}</Link>
                    </h3>
                    {a.excerpt ? <p className="nm-dek">{a.excerpt}</p> : null}
                    <span className="nm-time">{ago(a.created_at)} · {a.reading_time} min read</span>
                  </div>
                  <Thumb href={href(a)} article={a} ratio="4 / 3" />
                </article>
              ))}
            </div>
          </div>
          <aside className="nm-rail2">
            <section className="nm-box nm-promise">
              <h3 className="nm-box-h">How we cover a match</h3>
              <ul>
                <li><b>Kick-off in your timezone</b> UK, US ET/PT, India IST and Australia.</li>
                <li><b>Legal ways to watch</b> Official broadcasters and streaming services only.</li>
                <li><b>Checked against rights holders</b> Rights and times change — confirm before kick-off.</li>
              </ul>
            </section>
          </aside>
        </section>
      ) : null}
    </Shell>
  );
}
