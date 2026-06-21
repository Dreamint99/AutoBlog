import "./theme.css";
import Link from "next/link";
import type { SiteArticleProps, Site, Article as ArticleType, TocItem } from "@/lib/types";

/* ---------- shared presentational helpers (server-safe, no hooks) ---------- */

function LeafMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 19c0-7 5.5-13 14-14 .4 5.5-1.2 9.6-4.2 12.1C12.3 19 8.4 19.5 5 19Z"
        fill="#fff"
      />
      <path
        d="M9 16c2.4-3.4 5-5.6 8-7"
        stroke="#0d7a3f"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BrandMark() {
  return (
    <span className="bd-brand__mark" aria-hidden="true">
      <LeafMark />
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function categoryOf(article: ArticleType): string {
  const first = article.tags.find((t) => t.trim().length > 0);
  if (first) return first;
  if (article.keyword) return article.keyword;
  return "Bangladesh";
}

const NAV_LINKS: { label: string; hash: string }[] = [
  { label: "Travel", hash: "#travel" },
  { label: "Food", hash: "#food" },
  { label: "Culture", hash: "#culture" },
  { label: "Guides", hash: "#guides" },
];

function SiteHeader({ site }: { site: Site }) {
  return (
    <header className="bd-header">
      <div className="bd-wrap bd-header__bar">
        <Link href={`/s/${site.id}`} className="bd-brand" aria-label={`${site.name} home`}>
          <BrandMark />
          <span className="bd-brand__name">
            <b>Bangladesh</b>
            <span>Expert</span>
            <span className="bd-brand__tag">{site.tagline || "Travel · Food · Culture"}</span>
          </span>
        </Link>

        <input type="checkbox" id="bd-nav-toggle" className="bd-nav-toggle" hidden />
        <label className="bd-burger" htmlFor="bd-nav-toggle" aria-label="Toggle navigation">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </label>

        <nav className="bd-nav" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <Link key={l.label} href={`/s/${site.id}${l.hash}`}>
              {l.label}
            </Link>
          ))}
          <Link href={`/s/${site.id}`} className="bd-nav__cta">
            Explore
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter({ site }: { site: Site }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bd-footer">
      <div className="bd-wrap bd-footer__top">
        <div className="bd-footer__brand-col">
          <Link href={`/s/${site.id}`} className="bd-footer__brand">
            <BrandMark />
            <span>BangladeshExpert</span>
          </Link>
          <p className="bd-footer__about">
            {site.tagline
              ? site.tagline
              : "Your friendly local guide to the very best of Bangladesh — honest travel routes, soul-warming food, and the stories behind the culture."}
          </p>
        </div>

        <div className="bd-footer__col">
          <h4>Explore</h4>
          <ul>
            {NAV_LINKS.map((l) => (
              <li key={l.label}>
                <Link href={`/s/${site.id}${l.hash}`}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="bd-footer__col">
          <h4>About</h4>
          <ul>
            <li>
              <Link href={`/s/${site.id}`}>Our mission</Link>
            </li>
            <li>
              <Link href={`/s/${site.id}`}>Write for us</Link>
            </li>
            <li>
              <Link href={`/s/${site.id}`}>Contact</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="bd-wrap bd-footer__bar">
        <span>
          © {year} {site.name}. Made with care in Bangladesh.
        </span>
        <span>
          A <Link href={`/s/${site.id}`}>local expert</Link> publication.
        </span>
      </div>
    </footer>
  );
}

/* ---------- related card (compact version of the home card) ---------- */

function RelatedCard({ site, article }: { site: Site; article: ArticleType }) {
  return (
    <Link href={`/s/${site.id}/${article.slug}`} className="bd-card">
      <div className="bd-card__media">
        {article.image_url ? (
          <img className="bd-card__img" src={article.image_url} alt={article.title} loading="lazy" />
        ) : (
          <span className="bd-card__media-ph" aria-hidden="true">
            <LeafMark />
          </span>
        )}
        <span className="bd-chip bd-card__tag">{categoryOf(article)}</span>
      </div>
      <div className="bd-card__body">
        <h3 className="bd-card__title">{article.title}</h3>
        {article.excerpt ? <p className="bd-card__excerpt">{article.excerpt}</p> : null}
        <div className="bd-card__meta">
          <time dateTime={article.created_at}>{formatDate(article.created_at)}</time>
          <span className="bd-dot" aria-hidden="true">
            ·
          </span>
          <span>{article.reading_time || 4} min read</span>
        </div>
      </div>
    </Link>
  );
}

/* ---------- table of contents ---------- */

function TocLinks({ toc }: { toc: TocItem[] }) {
  return (
    <ol>
      {toc.map((item) => (
        <li key={item.id} data-level={item.level}>
          <a href={`#${item.id}`}>{item.text}</a>
        </li>
      ))}
    </ol>
  );
}

function TocIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M8 6h12M8 12h12M8 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="3.5" cy="6" r="1.4" fill="currentColor" />
      <circle cx="3.5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="3.5" cy="18" r="1.4" fill="currentColor" />
    </svg>
  );
}

/* ====================================================================== */

export default function Article({ site, article, related, bodyHtml, toc }: SiteArticleProps) {
  const readingTime = article.reading_time || Math.max(1, Math.round(article.word_count / 200));
  const initial = (site.name || "B").trim().charAt(0).toUpperCase();
  const hasToc = toc.length > 0;

  return (
    <>
      <SiteHeader site={site} />

      <main className="bd-article">
        <article>
          {/* breadcrumb */}
          <div className="bd-wrap">
            <nav className="bd-crumbs" aria-label="Breadcrumb">
              <Link href={`/s/${site.id}`}>Home</Link>
              <span aria-hidden="true">/</span>
              <Link href={`/s/${site.id}`}>{categoryOf(article)}</Link>
              <span aria-hidden="true">/</span>
              <span className="bd-crumbs__current">{article.title}</span>
            </nav>
          </div>

          {/* header */}
          <header className="bd-wrap">
            <div className="bd-art-head">
              <div className="bd-art-head__chips">
                <span className="bd-chip bd-chip--green">{categoryOf(article)}</span>
                {article.keyword ? <span className="bd-chip">🎯 {article.keyword}</span> : null}
              </div>
              <h1 className="bd-art-title">{article.title}</h1>
              {article.excerpt ? <p className="bd-art-excerpt">{article.excerpt}</p> : null}

              <div className="bd-art-meta">
                <span className="bd-art-meta__avatar" aria-hidden="true">
                  {initial}
                </span>
                <span>
                  By <strong>{site.name}</strong>
                </span>
                <span className="bd-dot" aria-hidden="true">
                  ·
                </span>
                <span>
                  Updated <time dateTime={article.created_at}>{formatDate(article.created_at)}</time>
                </span>
                <span className="bd-dot" aria-hidden="true">
                  ·
                </span>
                <span>{readingTime} min read</span>
              </div>
            </div>
          </header>

          {/* hero image */}
          <div className="bd-wrap">
            {article.image_url ? (
              <figure className="bd-art-hero">
                <img src={article.image_url} alt={article.title} loading="lazy" />
              </figure>
            ) : (
              <div className="bd-art-hero bd-art-hero--ph" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none">
                  <path
                    d="M5 19c0-7 5.5-13 14-14 .4 5.5-1.2 9.6-4.2 12.1C12.3 19 8.4 19.5 5 19Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path d="M9 16c2.4-3.4 5-5.6 8-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>

          {/* body + sticky TOC aside */}
          <div className="bd-wrap bd-art-layout">
            <div className="bd-art-main">
              {/* inline / collapsible TOC for mobile */}
              {hasToc ? (
                <details className="bd-toc-inline" open>
                  <summary>
                    <TocIcon />
                    On this page
                    <svg
                      className="bd-toc-inline__chev"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <TocLinks toc={toc} />
                </details>
              ) : null}

              <div className="article-content" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

              {/* tags */}
              {article.tags.length > 0 ? (
                <div className="bd-art-tags">
                  <span className="bd-art-tags__label">Topics:</span>
                  {article.tags.map((tag) => (
                    <Link key={tag} href={`/s/${site.id}`} className="bd-tag">
                      #{tag}
                    </Link>
                  ))}
                </div>
              ) : null}

              {/* publication note */}
              <aside className="bd-art-note">
                <span className="bd-art-note__avatar" aria-hidden="true">
                  {initial}
                </span>
                <div className="bd-art-note__body">
                  <strong>Written by the {site.name} team</strong>
                  {site.tagline
                    ? site.tagline
                    : "Friendly local experts sharing honest, on-the-ground guides to travelling, eating and exploring across Bangladesh."}
                </div>
              </aside>
            </div>

            {/* desktop sticky TOC */}
            {hasToc ? (
              <aside className="bd-toc" aria-label="Table of contents">
                <p className="bd-toc__title">
                  <TocIcon />
                  On this page
                </p>
                <TocLinks toc={toc} />
              </aside>
            ) : null}
          </div>
        </article>

        {/* related */}
        {related.length > 0 ? (
          <section className="bd-section bd-related" aria-label={`More from ${site.name}`}>
            <div className="bd-wrap">
              <div className="bd-section__head">
                <h2 className="bd-section__title">
                  More from BangladeshExpert
                  <small>Keep exploring the country, one story at a time</small>
                </h2>
                <span className="bd-section__rule" aria-hidden="true" />
              </div>
              <div className="bd-grid">
                {related.map((a) => (
                  <RelatedCard key={a.id} site={site} article={a} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter site={site} />
    </>
  );
}
