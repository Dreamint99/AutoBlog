import "./theme.css";
import Link from "next/link";
import { fontVars } from "./fonts";
import ShareButtons from "./ShareButtons";
import type { SiteArticleProps, Article, TocItem } from "@/lib/types";

/* ────────────────────────────────────────────────────────────
   Inline icons (no client JS, no extra packages)
   ──────────────────────────────────────────────────────────── */
function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="7" y="12" width="3" height="5" rx="0.6" fill="currentColor" opacity=".25" />
      <rect x="7" y="12" width="3" height="5" rx="0.6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12.5" y="8" width="3" height="9" rx="0.6" fill="currentColor" opacity=".25" />
      <rect x="12.5" y="8" width="3" height="9" rx="0.6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="5" width="3" height="12" rx="0.6" fill="currentColor" opacity=".25" />
      <rect x="18" y="5" width="3" height="12" rx="0.6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconTarget() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}
function IconChevron() {
  return (
    <svg className="cn-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconList() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="4.5" cy="6" r="1.4" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1.4" fill="currentColor" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="7.6" r="1.2" fill="currentColor" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconVerified() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m12 2.6 2.3 1.7 2.85-.2.9 2.7 2.45 1.5-.95 2.7.95 2.7-2.45 1.5-.9 2.7-2.85-.2L12 21.4l-2.3-1.7-2.85.2-.9-2.7-2.45-1.5.95-2.7-.95-2.7 2.45-1.5.9-2.7 2.85.2L12 2.6Z"
        fill="currentColor"
        opacity=".15"
      />
      <path
        d="m12 2.6 2.3 1.7 2.85-.2.9 2.7 2.45 1.5-.95 2.7.95 2.7-2.45 1.5-.9 2.7-2.85-.2L12 21.4l-2.3-1.7-2.85.2-.9-2.7-2.45-1.5.95-2.7-.95-2.7 2.45-1.5.9-2.7 2.85.2L12 2.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCompass() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" fill="currentColor" opacity=".25" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function RelatedCard({ siteId, article }: { siteId: string; article: Article }) {
  const href = `/s/${siteId}/${article.slug}`;
  return (
    <article className="cn-card">
      <Link href={href} className="cn-card-media" aria-label={article.title}>
        {article.image_url ? (
          <img src={article.image_url} alt={article.title} loading="lazy" />
        ) : (
          <span aria-hidden="true" />
        )}
      </Link>
      <div className="cn-card-body">
        {article.tags.length > 0 ? (
          <div className="cn-chips">
            <span className="cn-chip">{article.tags[0]}</span>
          </div>
        ) : null}
        <h3>
          <Link href={href}>{article.title}</Link>
        </h3>
        <p className="cn-excerpt">{article.excerpt || article.meta_description}</p>
        <div className="cn-card-foot">
          <div className="cn-meta">
            <span>
              <IconClock />
              {article.reading_time} min read
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */
export default function Article({ site, article, related, bodyHtml, toc, popular = [] }: SiteArticleProps) {
  const primaryTag = article.tags[0];
  const updated = fmtDate(article.created_at);

  return (
    <div className={`cn-root ${fontVars}`}>
      {/* ── HEADER ── */}
      <header className="cn-header">
        <div className="cn-topnote">
          <div className="cn-wrap">
            <IconChart />
            <span>
              Independent data &amp; statistics — figures are best-available estimates compiled from public sources; verify before citing.
            </span>
          </div>
        </div>
        <div className="cn-wrap">
          <div className="cn-bar">
            <Link href={`/s/${site.id}`} className="cn-brand" aria-label={`${site.name} home`}>
              <span className="cn-logo">
                <IconChart />
              </span>
              <span className="cn-wordmark">
                <b>
                  Count<span>ly</span>
                </b>
                <small>The World in Numbers</small>
              </span>
            </Link>
            <nav className="cn-nav" aria-label="Primary">
              <Link href={`/s/${site.id}`}>Statistics</Link>
              <Link href={`/s/${site.id}`}>Companies</Link>
              <Link href={`/s/${site.id}`}>Rankings</Link>
              <Link href={`/s/${site.id}`} className="cn-nav-cta">
                Browse data
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <article className="cn-article">
        {/* ── ARTICLE HEAD ── */}
        <div className="cn-article-head">
          <div className="cn-wrap">
            <nav className="cn-crumbs" aria-label="Breadcrumb">
              <Link href={`/s/${site.id}`}>Home</Link>
              <IconChevronRight />
              {primaryTag ? (
                <>
                  <Link href={`/s/${site.id}`}>{primaryTag}</Link>
                  <IconChevronRight />
                </>
              ) : null}
              <span className="cn-crumb-current">{article.title}</span>
            </nav>

            <h1>{article.title}</h1>
            {article.excerpt ? <p className="cn-lede">{article.excerpt}</p> : null}

            <div className="cn-meta">
              <span>
                <IconClock />
                {article.reading_time} min read
              </span>
              <span className="cn-dot" aria-hidden="true" />
              <span>
                <IconCalendar />
                Last updated {updated}
              </span>
              {article.keyword ? (
                <>
                  <span className="cn-dot" aria-hidden="true" />
                  <span>
                    <IconTarget />
                    {article.keyword}
                  </span>
                </>
              ) : null}
            </div>

            {article.tags.length > 0 ? (
              <div className="cn-chips">
                {article.tags.slice(0, 5).map((t) => (
                  <span className="cn-chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            <ShareButtons url={`https://${site.domain}/${article.slug}`} title={article.title} />

            {article.image_url ? (
              <div className="cn-hero-img">
                <img src={article.image_url} alt={article.title} loading="lazy" />
              </div>
            ) : null}
          </div>
        </div>

        {/* ── BODY (2-col) ── */}
        <div className="cn-wrap">
          <div className="cn-article-grid">
            {/* TOC — collapsible on mobile, sticky on desktop */}
            {toc.length > 0 ? (
              <aside className="cn-toc-col">
                <details className="cn-toc" open>
                  <summary>
                    <span className="cn-toc-title">
                      <IconList />
                      On this page
                    </span>
                    <IconChevron />
                  </summary>
                  <nav aria-label="Table of contents">
                    <ol>
                      {toc.map((item: TocItem) => (
                        <li key={item.id} className={item.level === 3 ? "cn-toc-l3" : "cn-toc-l2"}>
                          <a href={`#${item.id}`}>{item.text}</a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </details>
              </aside>
            ) : null}

            {/* MAIN */}
            <div className="cn-article-main">
              {/* data note / how to read the numbers */}
              <div className="cn-note" role="note">
                <span className="cn-note-ico">
                  <IconInfo />
                </span>
                <div>
                  <b>How to read these numbers</b>
                  <p>
                    Figures here are best-available statistics compiled from public sources such as company filings,
                    government databases and industry reports, and include estimates where an exact figure is not
                    published. They change over time — last updated {updated}. Always confirm against the original
                    source before citing.
                  </p>
                </div>
              </div>

              <p className="cn-bookmark-tip">
                🔖 <strong>Tip:</strong> bookmark this page — the figures here are kept up to date automatically.
              </p>

              <div className="article-content" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

              <div className="cn-article-foot">
                <span className="cn-verified">
                  <IconVerified />
                  Compiled by the {site.name} data desk
                </span>
                <span className="cn-dot" aria-hidden="true" />
                <span>Last updated {updated}</span>
              </div>

              {/* RELATED */}
              {related.length > 0 ? (
                <section className="cn-related" aria-label="Related reports">
                  <h2>Related data</h2>
                  <div className="cn-grid">
                    {related.slice(0, 6).map((a) => (
                      <RelatedCard key={a.id} siteId={site.id} article={a} />
                    ))}
                  </div>
                </section>
              ) : (
                <section className="cn-related" aria-label="Continue reading">
                  <h2>Keep exploring</h2>
                  <div className="cn-emptywrap">
                    <span className="cn-empty-ico">
                      <IconCompass />
                    </span>
                    <h3>Browse more statistics</h3>
                    <p>Head back to the homepage to explore our full library of sourced data reports and rankings.</p>
                  </div>
                </section>
              )}

              {popular.filter((p) => p.slug !== article.slug).length > 0 ? (
                <section className="cn-popular" aria-label={`Popular on ${site.name}`}>
                  <h2>Popular on {site.name}</h2>
                  <ul className="cn-popular-list">
                    {popular
                      .filter((p) => p.slug !== article.slug)
                      .map((p) => (
                        <li key={p.id}>
                          <Link href={`/s/${site.id}/${p.slug}`}>{p.title}</Link>
                        </li>
                      ))}
                  </ul>
                </section>
              ) : null}

              <p style={{ marginTop: "2rem" }}>
                <Link
                  href={`/s/${site.id}`}
                  className="cn-readmore"
                  style={{ display: "inline-flex", alignItems: "center", gap: ".45rem", fontWeight: 700 }}
                >
                  <IconArrow /> Back to all statistics
                </Link>
              </p>
            </div>
          </div>
        </div>
      </article>

      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Footer (shared shape with Home)
   ──────────────────────────────────────────────────────────── */
function SiteFooter({ siteName, siteId, domain }: { siteName: string; siteId: string; domain: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="cn-footer">
      <div className="cn-wrap">
        <div className="cn-foot-top">
          <div>
            <Link href={`/s/${siteId}`} className="cn-brand" aria-label={`${siteName} home`}>
              <span className="cn-logo">
                <IconChart />
              </span>
              <span className="cn-wordmark">
                <b>
                  Count<span>ly</span>
                </b>
                <small>The World in Numbers</small>
              </span>
            </Link>
            <p className="cn-foot-about">
              {siteName} is an independent data &amp; statistics publication covering technology, AI, social media,
              companies, countries and global markets. We are not affiliated with any analytics company.
            </p>
          </div>
          <div className="cn-foot-cols">
            <div>
              <h4>Topics</h4>
              <ul>
                <li>
                  <Link href={`/s/${siteId}`}>AI &amp; internet</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}`}>Social media</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}`}>Companies</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>About</h4>
              <ul>
                <li>
                  <Link href={`/s/${siteId}`}>Methodology</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}`}>Sources</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}`}>Contact</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="cn-foot-disclaimer">
          <b>About the data.</b> Statistics on {siteName} are best-available figures compiled from public sources and
          include estimates where exact numbers are not published. They are provided for general information only, may
          contain errors, and change over time. Always confirm against the original source before citing or making
          decisions based on these numbers.
        </div>

        <div className="cn-foot-bottom">
          <span>
            © {year} {siteName}
            {domain ? ` · ${domain}` : ""}
          </span>
          <span>Data that explains the world.</span>
        </div>
      </div>
    </footer>
  );
}
