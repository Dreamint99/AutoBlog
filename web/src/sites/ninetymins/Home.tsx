import Link from "next/link";
import type { SiteHomeProps, Article } from "@/lib/types";
import { Shell, Card, Badge, Kicker, Thumb } from "./Chrome";
import { NM_COMPS, compOf, ago } from "./comps";
import { LeagueTable, LeagueFixtures } from "./LiveScores";

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

// Front-page order: the competitions readers come for first.
const ROWS = ["saff-championship", "champions-league", "premier-league", "world-cup", "cricket", "basketball", "formula-1", "tennis", "football"];

export default function Home({ site, articles }: SiteHomeProps) {
  const s = `/s/${site.id}`;
  const href = (a: Article) => `${s}/${a.slug}`;
  const take = picker(articles);

  const [hero] = take(null, 1);
  const seconds = take(null, 3);
  const headlines = take(null, 8);
  const rows = ROWS.map((slug) => ({
    comp: NM_COMPS.find((c) => c.slug === slug)!,
    items: take(articles.filter((a) => compOf(a).slug === slug), 4),
  })).filter((r) => r.items.length >= 2);
  const latest = take(null, 12);

  if (!hero) {
    return (
      <Shell site={site}>
        <div className="nm-wrap nm-empty">
          <h1>Match guides are on the way</h1>
          <p>Fixtures, kick-off times and where to watch — landing here soon.</p>
        </div>
      </Shell>
    );
  }

  const hc = compOf(hero);
  return (
    <Shell site={site} strip={articles.slice(0, 10)}>
      {/* ── TOP: headlines | hero | table ── */}
      <div className="nm-wrap nm-top">
        <aside className="nm-headlines" aria-label="Top headlines">
          <h2 className="nm-box-h">Top Headlines</h2>
          <ol>
            {headlines.map((a) => (
              <li key={a.id}>
                <Badge comp={compOf(a)} />
                <Link href={href(a)}>{a.title}</Link>
              </li>
            ))}
          </ol>
        </aside>

        <div className="nm-heroCol">
          <article className="nm-hero">
            <Link href={href(hero)} className="nm-thumb nm-hero-link">
              {hero.image_url ? <img src={hero.image_url} alt="" /> : <span className="nm-thumb-ph" />}
              <span className="nm-hero-shade" />
              <div className="nm-hero-copy">
                <span className="nm-hero-kicker" style={{ background: hc.color }}>
                  {hc.label}
                </span>
                <h1 className="nm-hero-h">{hero.title}</h1>
                {hero.excerpt ? <p>{hero.excerpt}</p> : null}
                <span className="nm-time light">{ago(hero.created_at)} · {hero.reading_time} min read</span>
              </div>
            </Link>
          </article>
          <div className="nm-seconds">
            {seconds.map((a) => (
              <article className="nm-mini" key={a.id}>
                <Thumb href={href(a)} article={a} ratio="16 / 10" />
                <Kicker comp={compOf(a)} siteId={site.id} />
                <h3 className="nm-h sm">
                  <Link href={href(a)}>{a.title}</Link>
                </h3>
              </article>
            ))}
          </div>
        </div>

        <aside className="nm-rightCol">
          <LeagueTable league="eng.1" title="Premier League table" rows={10} />
        </aside>
      </div>

      {/* ── COMPETITION ROWS ── */}
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

      {/* ── LATEST + RAIL ── */}
      {latest.length ? (
        <section className="nm-wrap nm-river" aria-label="Latest">
          <div>
            <div className="nm-rowhead">
              <h2>Latest</h2>
            </div>
            <div className="nm-list">
              {latest.map((a) => (
                <article className="nm-listrow" key={a.id}>
                  <div>
                    <Kicker comp={compOf(a)} siteId={site.id} />
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
            <LeagueFixtures league="uefa.champions" title="Champions League fixtures" />
            <section className="nm-box nm-promise">
              <h3 className="nm-box-h">How we cover a match</h3>
              <ul>
                <li><b>Kick-off in your timezone</b> UK, US ET/PT, India IST and Australia.</li>
                <li><b>Legal ways to watch</b> Official broadcasters and streaming services only.</li>
                <li><b>Checked against rights holders</b> Rights and times change — confirm before kick-off.</li>
              </ul>
            </section>
            <section className="nm-box">
              <h3 className="nm-box-h">Competitions</h3>
              <div className="nm-comps">
                {NM_COMPS.map((c) => (
                  <Link href={`${s}/topic/${c.slug}`} key={c.slug}>
                    <Badge comp={c} /> {c.label}
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </section>
      ) : null}
    </Shell>
  );
}
