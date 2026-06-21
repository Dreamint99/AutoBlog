import "./theme.css";
import Link from "next/link";
import type { SiteArticleProps, Site, Article, TocItem } from "@/lib/types";

/* ────────────────────────────────────────────────────────────
   Inline icons — server-safe, no client JS, no extra packages
   ──────────────────────────────────────────────────────────── */
function IconPearl() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5 3.5 12 12 21.5 20.5 12 12 2.5Z" fill="currentColor" opacity=".16" />
      <path d="M12 2.5 3.5 12 12 21.5 20.5 12 12 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.1" fill="currentColor" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.2l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 21.3 6.9 18.9 8 13.2 3.7 9.2l5.8-.7L12 3.2Z"
        fill="currentColor"
      />
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
function IconChevron() {
  return (
    <svg className="qx-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
function IconArrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconArrowLeft() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H6M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function categoryOf(article: Article): string {
  const tag = article.tags.find((t) => t.trim().length > 0);
  if (tag) return tag;
  if (article.keyword) return article.keyword;
  return "Qatar";
}

function Wordmark() {
  return (
    <>
      <span className="qx-logo">
        <IconPearl />
      </span>
      <span className="qx-wordmark">
        <b>
          Qatar<span>Experts</span>
        </b>
        <small>The Insider&rsquo;s Guide</small>
      </span>
    </>
  );
}

const NAV_LINKS: { label: string; hash: string }[] = [
  { label: "Living in Qatar", hash: "#living" },
  { label: "Doha", hash: "#doha" },
  { label: "Food", hash: "#food" },
  { label: "Culture", hash: "#culture" },
  { label: "Guides", hash: "#guides" },
];

function RelatedCard({ siteId, article }: { siteId: string; article: Article }) {
  const href = `/s/${siteId}/${article.slug}`;
  return (
    <article className="qx-card">
      <Link href={href} className="qx-card-media" aria-label={article.title}>
        {article.image_url ? (
          <img src={article.image_url} alt={article.title} loading="lazy" />
        ) : (
          <span aria-hidden="true" />
        )}
        <span className="qx-card-cat">
          <span className="qx-chip qx-chip-cat">{categoryOf(article)}</span>
        </span>
      </Link>
      <div className="qx-card-body">
        <h3>
          <Link href={href}>{article.title}</Link>
        </h3>
        <p className="qx-excerpt">{article.excerpt || article.meta_description}</p>
        <div className="qx-card-foot">
          <div className="qx-meta">
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
      <SiteHeader site={site} />

      <article className="qx-article">
        {/* ── ARTICLE HEAD ── */}
        <div className="qx-article-head">
          <div className="qx-wrap">
            <nav className="qx-crumbs" aria-label="Breadcrumb">
              <Link href={`/s/${site.id}`}>Home</Link>
              <IconChevronRight />
              {primaryTag ? (
                <>
                  <Link href={`/s/${site.id}`}>{primaryTag}</Link>
                  <IconChevronRight />
                </>
              ) : null}
              <span className="qx-crumb-current">{article.title}</span>
            </nav>

            <span className="qx-chip qx-chip-cat">{categoryOf(article)}</span>

            <h1>{article.title}</h1>
            {article.excerpt ? <p className="qx-lede">{article.excerpt}</p> : null}

            <div className="qx-meta">
              <span>
                <IconCalendar />
                Updated {updated}
              </span>
              <span className="qx-dot" aria-hidden="true" />
              <span>
                <IconClock />
                {article.reading_time} min read
              </span>
              {article.keyword ? (
                <>
                  <span className="qx-dot" aria-hidden="true" />
                  <span className="qx-kw">
                    <IconTarget />
                    {article.keyword}
                  </span>
                </>
              ) : null}
            </div>

            {article.tags.length > 0 ? (
              <div className="qx-chips">
                {article.tags.slice(0, 5).map((t) => (
                  <span className="qx-chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            {article.image_url ? (
              <div className="qx-hero-img">
                <img src={article.image_url} alt={article.title} loading="lazy" />
              </div>
            ) : null}
          </div>
        </div>

        {/* ── BODY (2-col: sticky TOC aside + article) ── */}
        <div className="qx-wrap">
          <div className="qx-article-grid">
            {/* TOC — inline <details> on mobile, sticky aside on desktop */}
            {toc.length > 0 ? (
              <aside className="qx-toc-col">
                <details className="qx-toc" open>
                  <summary>
                    <span className="qx-toc-title">
                      <IconList />
                      On this page
                    </span>
                    <IconChevron />
                  </summary>
                  <nav aria-label="Table of contents">
                    <ol>
                      {toc.map((item: TocItem) => (
                        <li key={item.id} className={item.level === 3 ? "qx-toc-l3" : "qx-toc-l2"}>
                          <a href={`#${item.id}`}>{item.text}</a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </details>
              </aside>
            ) : null}

            {/* MAIN */}
            <div className="qx-article-main">
              <div className="qx-article-body">
                {/* insider note */}
                <div className="qx-note" role="note">
                  <span className="qx-note-ico">
                    <IconInfo />
                  </span>
                  <div>
                    <b>An insider&rsquo;s note</b>
                    <p>
                      Qatar moves fast — rules, prices and opening hours can change with little warning. Use this guide
                      as your trusted starting point, then confirm the latest details with the relevant official source
                      before you go.
                    </p>
                  </div>
                </div>

                <div className="article-content" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

                <div className="qx-article-foot">
                  <span className="qx-verified">
                    <IconVerified />
                    Curated by the {site.name} editorial desk
                  </span>
                  <span className="qx-dot" aria-hidden="true" />
                  <span>Last updated {updated}</span>
                </div>
              </div>

              {/* RELATED — More from QatarExperts */}
              {related.length > 0 ? (
                <section className="qx-related" aria-label="More from QatarExperts">
                  <h2>More from QatarExperts</h2>
                  <div className="qx-grid">
                    {related.slice(0, 3).map((a) => (
                      <RelatedCard key={a.id} siteId={site.id} article={a} />
                    ))}
                  </div>
                </section>
              ) : (
                <section className="qx-related" aria-label="Keep reading">
                  <h2>Keep exploring Qatar</h2>
                  <div className="qx-emptywrap">
                    <span className="qx-empty-ico">
                      <IconCompass />
                    </span>
                    <h3>Browse more stories</h3>
                    <p>
                      Head back to the homepage to explore our full library of refined guides to living, dining and
                      exploring Qatar.
                    </p>
                  </div>
                </section>
              )}

              <p className="qx-backlink">
                <Link href={`/s/${site.id}`} className="qx-readmore">
                  <IconArrowLeft /> Back to all stories
                </Link>
              </p>
            </div>
          </div>
        </div>
      </article>

      <SiteFooter site={site} />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Header (CSS-only mobile nav, shared shape with Home)
   ──────────────────────────────────────────────────────────── */
function SiteHeader({ site }: { site: Site }) {
  return (
    <header className="qx-header">
      <div className="qx-topnote">
        <div className="qx-wrap">
          <IconStar />
          <span>The insider&rsquo;s guide to living, dining &amp; exploring Qatar — refined for expats &amp; newcomers.</span>
        </div>
      </div>
      <div className="qx-wrap">
        <div className="qx-bar">
          <Link href={`/s/${site.id}`} className="qx-brand" aria-label={`${site.name} home`}>
            <Wordmark />
          </Link>

          {/* CSS-only mobile nav (checkbox hack) */}
          <input type="checkbox" id="qx-nav-toggle" className="qx-nav-toggle" aria-hidden="true" />
          <label className="qx-burger" htmlFor="qx-nav-toggle" aria-label="Toggle navigation">
            <svg className="qx-burger-open" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <svg className="qx-burger-close" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </label>

          <nav className="qx-nav" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={`/s/${site.id}${l.hash}`}>
                {l.label}
              </Link>
            ))}
            <Link href={`/s/${site.id}`} className="qx-nav-cta">
              Explore Qatar
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

/* ────────────────────────────────────────────────────────────
   Footer (shared shape with Home)
   ──────────────────────────────────────────────────────────── */
function SiteFooter({ site }: { site: Site }) {
  const year = new Date().getFullYear();
  return (
    <footer className="qx-footer">
      <div className="qx-wrap">
        <div className="qx-foot-top">
          <div>
            <Link href={`/s/${site.id}`} className="qx-brand" aria-label={`${site.name} home`}>
              <Wordmark />
            </Link>
            <p className="qx-foot-about">
              {site.tagline
                ? site.tagline
                : "QatarExperts is a premium lifestyle magazine for expats and newcomers — refined, insider guidance on living, dining and exploring Qatar."}
            </p>
          </div>
          <div className="qx-foot-cols">
            <div>
              <h4>Explore</h4>
              <ul>
                {NAV_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link href={`/s/${site.id}${l.hash}`}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Magazine</h4>
              <ul>
                <li>
                  <Link href={`/s/${site.id}`}>About us</Link>
                </li>
                <li>
                  <Link href={`/s/${site.id}`}>Editorial policy</Link>
                </li>
                <li>
                  <Link href={`/s/${site.id}`}>Contact</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="qx-foot-disclaimer">
          <b>A note for readers.</b> {site.name} shares lifestyle guidance and cultural insight for general information
          only. Regulations, prices, opening hours and entry requirements in Qatar change frequently — always confirm
          current details with the relevant official authority or venue before you travel or act.
        </div>

        <div className="qx-foot-bottom">
          <span>
            &copy; {year} {site.name}
            {site.domain ? ` · ${site.domain}` : ""}
          </span>
          <span>Made in the spirit of Qatari hospitality.</span>
        </div>
      </div>
    </footer>
  );
}
