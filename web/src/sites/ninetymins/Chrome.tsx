import "./theme.css";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Site, Article } from "@/lib/types";
import { fontVars } from "./fonts";
import { NM_COMPS, compOf, ago, type NmComp } from "./comps";
import { ScoreStrip } from "./LiveScores";

/* Shared NinetyMins chrome: watch-guide strip (scoreboard style), header with
   the sport rail, footer, and the card primitives every page uses. */

const NAV_SLUGS = [
  "champions-league", "premier-league", "saff-championship", "world-cup",
  "cricket", "basketball", "formula-1", "tennis",
];

export function Badge({ comp }: { comp: NmComp }) {
  return (
    <span className="nm-badge" style={{ background: comp.color }}>
      {comp.short}
    </span>
  );
}

export function Kicker({ comp, siteId }: { comp: NmComp; siteId: string }) {
  return (
    <Link href={`/s/${siteId}/topic/${comp.slug}`} className="nm-kicker" style={{ color: comp.color === "#111827" ? undefined : comp.color }}>
      {comp.label}
    </Link>
  );
}

/** Horizontal strip of the freshest watch guides — reads like a scoreboard. */
function GuideStrip({ site, articles }: { site: Site; articles: Article[] }) {
  if (!articles.length) return null;
  return (
    <div className="nm-strip" aria-label="Latest watch guides">
      <div className="nm-strip-in">
        <span className="nm-strip-label">
          <i aria-hidden="true" /> Watch guides
        </span>
        <div className="nm-strip-row">
          {articles.slice(0, 10).map((a) => {
            const c = compOf(a);
            return (
              <Link href={`/s/${site.id}/${a.slug}`} className="nm-chip" key={a.id}>
                <span className="nm-chip-top">
                  <Badge comp={c} />
                  <small>{ago(a.created_at)}</small>
                </span>
                <b>{a.title}</b>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Header({ site }: { site: Site }) {
  const s = `/s/${site.id}`;
  return (
    <>
      <ScoreStrip />
      <header className="nm-header">
        <div className="nm-wrap nm-header-row">
          <Link href={s} className="nm-logo" aria-label={`${site.name} home`}>
            <span className="nm-logo-mark" aria-hidden="true">
              90<sup>&prime;</sup>
            </span>
            <span className="nm-logo-word">
              Ninety<b>Mins</b>
            </span>
          </Link>
          <span className="nm-tag">{site.tagline}</span>
          <span className="nm-live" aria-hidden="true">
            <i /> Live guides
          </span>
        </div>
        <nav className="nm-rail" aria-label="Sports">
          <div className="nm-wrap nm-rail-in">
            <Link href={s} className="nm-rail-home">
              Home
            </Link>
            {NAV_SLUGS.map((slug) => {
              const c = NM_COMPS.find((x) => x.slug === slug)!;
              return (
                <Link href={`${s}/topic/${c.slug}`} key={c.slug}>
                  {c.label}
                </Link>
              );
            })}
            <Link href={`${s}/topic/football`}>All Football</Link>
          </div>
        </nav>
      </header>
    </>
  );
}

export function Footer({ site }: { site: Site }) {
  const s = `/s/${site.id}`;
  const year = new Date().getFullYear();
  return (
    <footer className="nm-footer">
      <div className="nm-wrap">
        <div className="nm-foot-grid">
          <div>
            <Link href={s} className="nm-logo" aria-label={`${site.name} home`}>
              <span className="nm-logo-mark" aria-hidden="true">
                90<sup>&prime;</sup>
              </span>
              <span className="nm-logo-word">
                Ninety<b>Mins</b>
              </span>
            </Link>
            <p>
              Independent viewing guides: dates, kick-off times by timezone and legal ways to watch. We are not
              affiliated with any league, club or broadcaster — always confirm with the official rights holder.
            </p>
          </div>
          <div>
            <h4>Competitions</h4>
            <ul>
              {NM_COMPS.slice(0, 5).map((c) => (
                <li key={c.slug}>
                  <Link href={`${s}/topic/${c.slug}`}>{c.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>More sports</h4>
            <ul>
              {NM_COMPS.slice(5).map((c) => (
                <li key={c.slug}>
                  <Link href={`${s}/topic/${c.slug}`}>{c.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>NinetyMins</h4>
            <ul>
              <li><Link href={`${s}/about`}>About</Link></li>
              <li><Link href={`${s}/contact`}>Contact</Link></li>
              <li><Link href={`${s}/privacy`}>Privacy Policy</Link></li>
              <li><Link href={`${s}/terms`}>Terms</Link></li>
              <li><Link href={`${s}/disclaimer`}>Disclaimer</Link></li>
            </ul>
          </div>
        </div>
        <div className="nm-foot-base">
          <span>© {year} {site.name}</span>
          <span>Never miss a match.</span>
        </div>
      </div>
    </footer>
  );
}

/** Page wrapper: fonts in scope + header + footer. */
export function Shell({ site, strip, children }: { site: Site; strip?: Article[]; children: ReactNode }) {
  return (
    <div className={`nm-root ${fontVars}`}>
      <a href="#nm-main" className="nm-skip">
        Skip to content
      </a>
      <Header site={site} />
      {strip?.length ? <GuideStrip site={site} articles={strip} /> : null}
      <main id="nm-main">{children}</main>
      <Footer site={site} />
    </div>
  );
}

export function Thumb({ href, article, ratio = "16 / 9", children }: { href: string; article: Article; ratio?: string; children?: ReactNode }) {
  return (
    <Link href={href} className="nm-thumb" style={{ aspectRatio: ratio }} aria-label={article.title} tabIndex={-1}>
      {article.image_url ? <img src={article.image_url} alt="" loading="lazy" /> : <span className="nm-thumb-ph" />}
      {children}
    </Link>
  );
}

/** Standard story card (image, competition kicker, headline, time). */
export function Card({ site, article, dek = false }: { site: Site; article: Article; dek?: boolean }) {
  const href = `/s/${site.id}/${article.slug}`;
  const c = compOf(article);
  return (
    <article className="nm-card">
      <Thumb href={href} article={article}>
        <span className="nm-card-bar" style={{ background: c.color }} />
      </Thumb>
      <div className="nm-card-body">
        <Kicker comp={c} siteId={site.id} />
        <h3 className="nm-h">
          <Link href={href}>{article.title}</Link>
        </h3>
        {dek && article.excerpt ? <p className="nm-dek">{article.excerpt}</p> : null}
        <span className="nm-time">{ago(article.created_at)} · {article.reading_time} min read</span>
      </div>
    </article>
  );
}
