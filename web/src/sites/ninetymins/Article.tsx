import Link from "next/link";
import type { SiteArticleProps, Article as A, TocItem } from "@/lib/types";
import { Shell, Card, Badge } from "./Chrome";
import { compOf, fmtDate, ago } from "./comps";
import { LeagueFixtures } from "./LiveScores";

/* Competition → ESPN feed shown in the article rail. */
const FEED: Record<string, [string, string]> = {
  "champions-league": ["uefa.champions", "Champions League fixtures"],
  "premier-league": ["eng.1", "Premier League fixtures"],
  basketball: ["nba", "NBA games"],
  "formula-1": ["f1", "Formula 1"],
  tennis: ["atp", "ATP tennis"],
  football: ["eng.1,esp.1,ita.1", "Top-league fixtures"],
  "world-cup": ["eng.1,uefa.champions", "Top fixtures"],
};

function Toc({ items, variant }: { items: TocItem[]; variant: "inline" | "rail" }) {
  if (!items.length) return null;
  return (
    <details className={`nm-toc nm-toc-${variant}`} open={variant === "rail"}>
      <summary>On this page</summary>
      <ol>
        {items.map((it) => (
          <li className={it.level >= 3 ? "l3" : "l2"} key={it.id}>
            <a href={`#${it.id}`}>{it.text}</a>
          </li>
        ))}
      </ol>
    </details>
  );
}

function Share({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return (
    <div className="nm-share" aria-label="Share">
      <a href={`https://twitter.com/intent/tweet?url=${u}&text=${t}`} target="_blank" rel="noopener noreferrer">X</a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noopener noreferrer">Facebook</a>
      <a href={`https://wa.me/?text=${t}%20${u}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
    </div>
  );
}

export default function Article({ site, article, related, bodyHtml, toc, popular = [] }: SiteArticleProps) {
  const s = `/s/${site.id}`;
  const c = compOf(article);
  const feed = FEED[c.slug];
  const url = `https://${site.domain}/${article.slug}`;
  const sameComp = [...related, ...popular].filter((a, i, arr) => compOf(a).slug === c.slug && arr.findIndex((x) => x.id === a.id) === i).slice(0, 5);
  const more: A[] = related.filter((a) => !sameComp.some((x) => x.id === a.id)).slice(0, 5);

  return (
    <Shell site={site}>
      <article className="nm-article">
        <header className="nm-wrap nm-art-head">
          <nav className="nm-crumbs" aria-label="Breadcrumb">
            <Link href={s}>Home</Link>
            <span aria-hidden="true">›</span>
            <Link href={`${s}/topic/${c.slug}`}>{c.label}</Link>
          </nav>
          <span className="nm-art-kicker" style={{ background: c.color }}>
            {c.label}
          </span>
          <h1 className="nm-art-h">{article.title}</h1>
          {article.excerpt ? <p className="nm-art-dek">{article.excerpt}</p> : null}
          <div className="nm-art-meta">
            <span className="nm-byline">
              <span className="nm-avatar" aria-hidden="true">90</span>
              <span>
                <b>NinetyMins Desk</b>
                <small>
                  Updated {fmtDate(article.created_at)} · {article.reading_time} min read
                </small>
              </span>
            </span>
            <Share url={url} title={article.title} />
          </div>
        </header>

        {article.image_url ? (
          <figure className="nm-wrap nm-art-hero">
            <img src={article.image_url} alt={article.title} />
          </figure>
        ) : null}

        <div className="nm-wrap nm-art-grid">
          <div className="nm-art-main">
            <Toc items={toc} variant="inline" />
            <div id="article-body" className="article-content" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            <aside className="nm-art-note">
              <b>Before kick-off:</b> broadcast rights and kick-off times can change. Confirm with the official
              broadcaster or competition organiser — NinetyMins lists legal viewing options only.
            </aside>
            {article.tags.length ? (
              <div className="nm-art-tags">
                {article.tags.slice(0, 8).map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="nm-art-rail">
            <Toc items={toc} variant="rail" />
            {feed ? <LeagueFixtures league={feed[0]} title={feed[1]} /> : null}
            {sameComp.length ? (
              <section className="nm-box">
                <h3 className="nm-box-h">More {c.label}</h3>
                <ul className="nm-railist">
                  {sameComp.map((a) => (
                    <li key={a.id}>
                      <Link href={`${s}/${a.slug}`}>{a.title}</Link>
                      <small>{ago(a.created_at)}</small>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {more.length ? (
              <section className="nm-box">
                <h3 className="nm-box-h">Latest</h3>
                <ul className="nm-railist">
                  {more.map((a) => (
                    <li key={a.id}>
                      <Badge comp={compOf(a)} />
                      <Link href={`${s}/${a.slug}`}>{a.title}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        </div>

        {related.length ? (
          <section className="nm-wrap nm-row" aria-label="Related">
            <div className="nm-rowhead">
              <h2>Read next</h2>
            </div>
            <div className="nm-grid4">
              {related.slice(0, 4).map((a) => (
                <Card site={site} article={a} key={a.id} />
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </Shell>
  );
}
