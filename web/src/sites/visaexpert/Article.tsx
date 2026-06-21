import "./theme.css";
import Link from "next/link";
import type { SiteArticleProps, Article, TocItem } from "@/lib/types";

/* ────────────────────────────────────────────────────────────
   Inline icons (no client JS, no extra packages)
   ──────────────────────────────────────────────────────────── */
function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5 4.5 5.5v5.2c0 4.7 3.2 9 7.5 10.3 4.3-1.3 7.5-5.6 7.5-10.3V5.5L12 2.5Z"
        fill="currentColor"
        opacity=".15"
      />
      <path
        d="M12 2.5 4.5 5.5v5.2c0 4.7 3.2 9 7.5 10.3 4.3-1.3 7.5-5.6 7.5-10.3V5.5L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
    <svg className="vx-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    <article className="vx-card">
      <Link href={href} className="vx-card-media" aria-label={article.title}>
        {article.image_url ? (
          <img src={article.image_url} alt={article.title} loading="lazy" />
        ) : (
          <span aria-hidden="true" />
        )}
      </Link>
      <div className="vx-card-body">
        {article.tags.length > 0 ? (
          <div className="vx-chips">
            <span className="vx-chip">{article.tags[0]}</span>
          </div>
        ) : null}
        <h3>
          <Link href={href}>{article.title}</Link>
        </h3>
        <p className="vx-excerpt">{article.excerpt || article.meta_description}</p>
        <div className="vx-card-foot">
          <div className="vx-meta">
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
export default function Article({ site, article, related, bodyHtml, toc }: SiteArticleProps) {
  const primaryTag = article.tags[0];
  const updated = fmtDate(article.created_at);

  return (
    <>
      {/* ── HEADER ── */}
      <header className="vx-header">
        <div className="vx-topnote">
          <div className="vx-wrap">
            <IconShield />
            <span>Independent, regularly-updated immigration guidance — verify details with official sources.</span>
          </div>
        </div>
        <div className="vx-wrap">
          <div className="vx-bar">
            <Link href={`/s/${site.id}`} className="vx-brand" aria-label={`${site.name} home`}>
              <span className="vx-logo">
                <IconShield />
              </span>
              <span className="vx-wordmark">
                <b>
                  Visa<span>Expert</span>
                </b>
                <small>Trusted Immigration Guides</small>
              </span>
            </Link>
            <nav className="vx-nav" aria-label="Primary">
              <Link href={`/s/${site.id}`}>Guides</Link>
              <Link href={`/s/${site.id}`}>Visas</Link>
              <Link href={`/s/${site.id}`}>About</Link>
              <Link href={`/s/${site.id}`} className="vx-nav-cta">
                Start here
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <article className="vx-article">
        {/* ── ARTICLE HEAD ── */}
        <div className="vx-article-head">
          <div className="vx-wrap">
            <nav className="vx-crumbs" aria-label="Breadcrumb">
              <Link href={`/s/${site.id}`}>Home</Link>
              <IconChevronRight />
              {primaryTag ? (
                <>
                  <Link href={`/s/${site.id}`}>{primaryTag}</Link>
                  <IconChevronRight />
                </>
              ) : null}
              <span className="vx-crumb-current">{article.title}</span>
            </nav>

            <h1>{article.title}</h1>
            {article.excerpt ? <p className="vx-lede">{article.excerpt}</p> : null}

            <div className="vx-meta">
              <span>
                <IconClock />
                {article.reading_time} min read
              </span>
              <span className="vx-dot" aria-hidden="true" />
              <span>
                <IconCalendar />
                Updated {updated}
              </span>
              {article.keyword ? (
                <>
                  <span className="vx-dot" aria-hidden="true" />
                  <span>
                    <IconTarget />
                    {article.keyword}
                  </span>
                </>
              ) : null}
            </div>

            {article.tags.length > 0 ? (
              <div className="vx-chips">
                {article.tags.slice(0, 5).map((t) => (
                  <span className="vx-chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            {article.image_url ? (
              <div className="vx-hero-img">
                <img src={article.image_url} alt={article.title} loading="lazy" />
              </div>
            ) : null}
          </div>
        </div>

        {/* ── BODY (2-col) ── */}
        <div className="vx-wrap">
          <div className="vx-article-grid">
            {/* TOC — collapsible on mobile, sticky on desktop */}
            {toc.length > 0 ? (
              <aside className="vx-toc-col">
                <details className="vx-toc" open>
                  <summary>
                    <span className="vx-toc-title">
                      <IconList />
                      On this page
                    </span>
                    <IconChevron />
                  </summary>
                  <nav aria-label="Table of contents">
                    <ol>
                      {toc.map((item: TocItem) => (
                        <li key={item.id} className={item.level === 3 ? "vx-toc-l3" : "vx-toc-l2"}>
                          <a href={`#${item.id}`}>{item.text}</a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </details>
              </aside>
            ) : null}

            {/* MAIN */}
            <div className="vx-article-main">
              {/* key-facts / disclaimer note */}
              <div className="vx-note" role="note">
                <span className="vx-note-ico">
                  <IconInfo />
                </span>
                <div>
                  <b>Before you rely on this guide</b>
                  <p>
                    Immigration rules, fees and processing times change often and depend on your nationality and
                    circumstances. Use this as a starting point, then confirm the current requirements with the relevant
                    official government department or embassy.
                  </p>
                </div>
              </div>

              <div className="article-content" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

              <div className="vx-article-foot">
                <span className="vx-verified">
                  <IconVerified />
                  Reviewed by the {site.name} editorial team
                </span>
                <span className="vx-dot" aria-hidden="true" />
                <span>Last updated {updated}</span>
              </div>

              {/* RELATED */}
              {related.length > 0 ? (
                <section className="vx-related" aria-label="Related guides">
                  <h2>Related guides</h2>
                  <div className="vx-grid">
                    {related.slice(0, 3).map((a) => (
                      <RelatedCard key={a.id} siteId={site.id} article={a} />
                    ))}
                  </div>
                </section>
              ) : (
                <section className="vx-related" aria-label="Continue reading">
                  <h2>Keep exploring</h2>
                  <div className="vx-emptywrap">
                    <span className="vx-empty-ico">
                      <IconCompass />
                    </span>
                    <h3>Browse more visa guides</h3>
                    <p>
                      Head back to the homepage to explore our full library of step-by-step immigration and visa guides.
                    </p>
                  </div>
                </section>
              )}

              <p style={{ marginTop: "2rem" }}>
                <Link href={`/s/${site.id}`} className="vx-readmore" style={{ display: "inline-flex", alignItems: "center", gap: ".45rem", fontWeight: 700 }}>
                  <IconArrow /> Back to all guides
                </Link>
              </p>
            </div>
          </div>
        </div>
      </article>

      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Footer (shared shape with Home)
   ──────────────────────────────────────────────────────────── */
function SiteFooter({ siteName, siteId, domain }: { siteName: string; siteId: string; domain: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="vx-footer">
      <div className="vx-wrap">
        <div className="vx-foot-top">
          <div>
            <Link href={`/s/${siteId}`} className="vx-brand" aria-label={`${siteName} home`}>
              <span className="vx-logo">
                <IconShield />
              </span>
              <span className="vx-wordmark">
                <b>
                  Visa<span>Expert</span>
                </b>
                <small>Trusted Immigration Guides</small>
              </span>
            </Link>
            <p className="vx-foot-about">
              {siteName} publishes clear, regularly-updated guides to visas and immigration. We are an independent
              information resource, not a law firm or government agency.
            </p>
          </div>
          <div className="vx-foot-cols">
            <div>
              <h4>Explore</h4>
              <ul>
                <li>
                  <Link href={`/s/${siteId}`}>All guides</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}`}>Visa types</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}`}>Countries</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>Resource</h4>
              <ul>
                <li>
                  <Link href={`/s/${siteId}`}>About us</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}`}>Editorial policy</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}`}>Contact</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="vx-foot-disclaimer">
          <b>Disclaimer.</b> The information on {siteName} is provided for general guidance only and does not constitute
          legal or immigration advice. Visa rules, fees and processing times change frequently and vary by individual
          circumstances. Always confirm current requirements with the relevant official government department, embassy
          or a qualified immigration professional before acting.
        </div>

        <div className="vx-foot-bottom">
          <span>
            © {year} {siteName}
            {domain ? ` · ${domain}` : ""}
          </span>
          <span>Made for applicants, kept up to date.</span>
        </div>
      </div>
    </footer>
  );
}
