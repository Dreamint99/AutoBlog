import "./theme.css";
import Link from "next/link";
import { fontVars } from "./fonts";
import { top10Articles, topNumber } from "./categories";
import LiveTicker from "./LiveTicker";
import NewsletterForm from "./NewsletterForm";
import type { SiteHomeProps, Article } from "@/lib/types";

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
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4 4 10-10.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
export function IconArrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconArrowUR() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCpu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.4" stroke="currentColor" strokeWidth="1.7" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" opacity=".25" />
      <path d="M9 3.5v3M15 3.5v3M9 17.5v3M15 17.5v3M3.5 9h3M3.5 15h3M17.5 9h3M17.5 15h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 19c.6-3 2.9-4.7 5.5-4.7s4.9 1.7 5.5 4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 5.6a3 3 0 0 1 0 5.7M17.8 18.8c-.3-2-1.3-3.5-2.8-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 20.5V5.2a1.2 1.2 0 0 1 1.2-1.2h7.6A1.2 1.2 0 0 1 15 5.2v15.3" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M15 9.5h3.3A1.2 1.2 0 0 1 19.5 10.7v9.8" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M3.5 20.5h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 7.5h1.5M11 7.5h1.5M8 11h1.5M11 11h1.5M8 14.5h1.5M11 14.5h1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconWifi() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 9.2C8.5 5 15.5 5 20.5 9.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6.5 12.6c3.3-2.7 7.7-2.7 11 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.4 15.9c1.6-1.3 3.6-1.3 5.2 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="19" r="1.3" fill="currentColor" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4.5h10v3.2a5 5 0 0 1-10 0V4.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 5.5H4.4v1.6a3 3 0 0 0 3 3M17 5.5h2.6v1.6a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 12.8v3.4M9 19.5h6M10 16.2h4l.6 3.3h-5.2L10 16.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function IconDatabase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7" ry="2.8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 6v12c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 12c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconScale() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v16M7 20h10M5 8h14M9 4.6 5 8M15 4.6 19 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 12.5 5 8l2.5 4.5a2.5 2.5 0 0 1-5 0ZM16.5 12.5 19 8l2.5 4.5a2.5 2.5 0 0 1-5 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
export function IconCompass() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" fill="currentColor" opacity=".25" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* Decorative hero data motif — bars + sparkline, no real data, aria-hidden. */
function HeroMotif() {
  return (
    <svg className="cn-motif" viewBox="0 0 420 300" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="cnBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a5b4fc" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="cnLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      {/* baseline grid */}
      {[60, 120, 180, 240].map((y) => (
        <line key={y} x1="20" y1={y} x2="400" y2={y} stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" />
      ))}
      {/* bars */}
      {[
        { x: 40, h: 70 },
        { x: 95, h: 120 },
        { x: 150, h: 95 },
        { x: 205, h: 165 },
        { x: 260, h: 135 },
        { x: 315, h: 205 },
      ].map((b) => (
        <rect key={b.x} x={b.x} y={260 - b.h} width="30" height={b.h} rx="5" fill="url(#cnBar)" fillOpacity="0.85" />
      ))}
      {/* sparkline */}
      <path
        d="M40 150 L95 110 L150 125 L205 70 L260 88 L315 40 L370 55"
        stroke="url(#cnLine)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [40, 150],
        [95, 110],
        [150, 125],
        [205, 70],
        [260, 88],
        [315, 40],
        [370, 55],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" fill="#fff" />
      ))}
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const CATEGORIES = [
  { icon: <IconCpu />, slug: "ai-chatgpt", label: "AI & ChatGPT", blurb: "Users, adoption and AI-market numbers." },
  { icon: <IconUsers />, slug: "social-media", label: "Social Media", blurb: "Platform users and time-spent by country." },
  { icon: <IconBuilding />, slug: "companies", label: "Companies", blurb: "Employees, stores, revenue and subscribers." },
  { icon: <IconWifi />, slug: "internet", label: "Internet", blurb: "Connectivity, websites and ecommerce data." },
  { icon: <IconGlobe />, slug: "countries", label: "Countries", blurb: "Digital and market data, country by country." },
  { icon: <IconTrophy />, slug: "rankings", label: "Rankings", blurb: "Largest, fastest-growing and most valuable." },
];

/* Shared header (brand + primary nav) — used by Home and the topic pages so the
   nav links resolve to real category pages everywhere. */
export function CnHeader({ site }: { site: { id: string; name: string } }) {
  return (
    <header className="cn-header">
      <div className="cn-topnote">
        <div className="cn-wrap">
          <IconDatabase />
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
            <Link href={`/s/${site.id}/top10`}>Top 10</Link>
            <Link href={`/s/${site.id}/crypto`}>Crypto</Link>
            <Link href={`/s/${site.id}/currency-converter`}>Converter</Link>
            <Link href={`/s/${site.id}/topic/rankings`}>Rankings</Link>
            <Link href={`/s/${site.id}/top10`} className="cn-nav-cta">
              Top 10 lists <IconArrowUR />
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

function ArticleMeta({ article }: { article: Article }) {
  return (
    <div className="cn-meta">
      <span>
        <IconClock />
        {article.reading_time} min read
      </span>
      <span className="cn-dot" aria-hidden="true" />
      <span>
        <IconCalendar />
        {fmtDate(article.created_at)}
      </span>
    </div>
  );
}

function CardChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="cn-chips">
      {tags.slice(0, 2).map((t) => (
        <span className="cn-chip" key={t}>
          {t}
        </span>
      ))}
    </div>
  );
}

export function StatCard({ siteId, article, index }: { siteId: string; article: Article; index: number }) {
  const href = `/s/${siteId}/${article.slug}`;
  return (
    <article className="cn-card">
      <Link href={href} className="cn-card-media" aria-label={article.title}>
        {article.image_url ? (
          <img src={article.image_url} alt={article.title} loading="lazy" />
        ) : (
          <span aria-hidden="true" />
        )}
        <span className="cn-card-index" aria-hidden="true">
          {String(index).padStart(2, "0")}
        </span>
      </Link>
      <div className="cn-card-body">
        <CardChips tags={article.tags} />
        <h3>
          <Link href={href}>{article.title}</Link>
        </h3>
        <p className="cn-excerpt">{article.excerpt || article.meta_description}</p>
        <div className="cn-card-foot">
          <ArticleMeta article={article} />
        </div>
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */
export default function Home({ site, articles }: SiteHomeProps) {
  const featured: Article | undefined = articles[0];
  const rest: Article[] = articles.slice(1);
  const top10: Article[] = top10Articles(articles).slice(0, 6);
  const latestDate = featured ? fmtDate(featured.created_at) : fmtDate(new Date().toISOString());
  // Real, derived "by the numbers" stats (no fake counters).
  const reportsCount = articles.length;
  const countryCount = articles.filter((a) => /richest people in /i.test(a.title)).length;
  const topListCount = articles.filter((a) => /\btop\s*\d/i.test(a.title)).length;

  return (
    <div className={`cn-root ${fontVars}`}>
      <LiveTicker />
      {/* ── HEADER ── */}
      <CnHeader site={site} />

      {/* ── HERO (dark, editorial) ── */}
      <section className="cn-hero">
        <div className="cn-hero-aurora" aria-hidden="true" />
        <div className="cn-wrap">
          <div className="cn-hero-grid">
            <div className="cn-hero-copy">
              <span className="cn-eyebrow">
                <span className="cn-eyebrow-dot" aria-hidden="true" />
                Global Statistics &amp; Data
              </span>
              <h1>
                Understand the world <em>through numbers.</em>
              </h1>
              <p className="cn-sub">
                Updated statistics, rankings and data-driven insights about technology, AI, social media, companies,
                countries and global markets — with sources and a clear methodology on every page.
              </p>

              {/* real search — HTML GET form, no client JS needed */}
              <form className="cn-search" action={`/s/${site.id}/search`} method="get" role="search">
                <IconSearch />
                <input
                  className="cn-search-input"
                  type="search"
                  name="q"
                  placeholder="Search a statistic, company or country…"
                  aria-label="Search"
                />
                <button className="cn-search-btn" type="submit">
                  Search
                </button>
              </form>

              <div className="cn-trustrow">
                <span>
                  <span className="cn-check">
                    <IconCheck />
                  </span>
                  Sources cited &amp; dated
                </span>
                <span>
                  <span className="cn-check">
                    <IconCheck />
                  </span>
                  Estimates labelled clearly
                </span>
                <span>
                  <span className="cn-check">
                    <IconCheck />
                  </span>
                  Updated {latestDate}
                </span>
              </div>
            </div>

            {/* visual panel */}
            <aside className="cn-hero-panel" aria-hidden="true">
              <div className="cn-hero-card">
                <div className="cn-hero-card-head">
                  <span className="cn-hero-card-kicker">Featured metric trend</span>
                  <span className="cn-hero-card-badge">Illustrative</span>
                </div>
                <HeroMotif />
                <div className="cn-hero-card-foot">
                  <span>2020</span>
                  <span>2026</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── BY THE NUMBERS (Forbes-style stat band) ── */}
      <section className="cn-statband">
        <div className="cn-wrap">
          <div className="cn-statband-grid">
            <div className="cn-stat">
              <b>{reportsCount}+</b>
              <span>Data reports</span>
            </div>
            <div className="cn-stat">
              <b>{countryCount}+</b>
              <span>Countries ranked</span>
            </div>
            <div className="cn-stat">
              <b>{topListCount}+</b>
              <span>Top 10 lists</span>
            </div>
            <div className="cn-stat">
              <b>Daily</b>
              <span>Updated · {latestDate}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="cn-section">
        <div className="cn-wrap">
          <div className="cn-sec-head">
            <div>
              <span className="cn-sec-kicker">Explore by topic</span>
              <h2>Six data categories</h2>
              <p>From AI adoption to company size to country-level digital data.</p>
            </div>
          </div>
          <div className="cn-cat-grid">
            {CATEGORIES.map((c, i) => (
              <Link href={`/s/${site.id}/topic/${c.slug}`} className="cn-cat-card" key={c.label}>
                <span className="cn-cat-num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="cn-cat-ico">{c.icon}</span>
                <div className="cn-cat-text">
                  <b>{c.label}</b>
                  <p>{c.blurb}</p>
                </div>
                <span className="cn-cat-arrow" aria-hidden="true">
                  <IconArrowUR />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOP 10 HIGHLIGHT ── */}
      <section className="cn-section">
        <div className="cn-wrap">
          <div className="cn-sec-head">
            <div>
              <span className="cn-sec-kicker">Rankings</span>
              <h2>Trending Top 10 lists</h2>
              <p>Worldwide rankings — banks, universities, companies, hotels and more, country by country.</p>
            </div>
            <Link href={`/s/${site.id}/top10`} className="cn-readmore">
              View all Top 10 <IconArrow />
            </Link>
          </div>

          {top10.length > 0 ? (
            <div className="cn-top10-grid">
              {top10.map((a) => {
                const href = `/s/${site.id}/${a.slug}`;
                const n = topNumber(a.title);
                return (
                  <article className="cn-top10-card" key={a.id}>
                    <Link href={href} className="cn-top10-media" aria-label={a.title}>
                      {a.image_url ? (
                        <img src={a.image_url} alt={a.title} loading="lazy" />
                      ) : (
                        <span aria-hidden="true" />
                      )}
                      <span className="cn-top10-ribbon">
                        <IconTrophy /> Top {n}
                      </span>
                      <span className="cn-top10-rank" aria-hidden="true">
                        {n}
                      </span>
                    </Link>
                    <div className="cn-top10-body">
                      <h3>
                        <Link href={href}>{a.title}</Link>
                      </h3>
                      <p className="cn-excerpt">{a.excerpt || a.meta_description}</p>
                      <div className="cn-top10-foot">
                        <Link href={href} className="cn-top10-view">
                          View ranking <IconArrow />
                        </Link>
                        <span className="cn-top10-date">{fmtDate(a.created_at)}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="cn-top10-banner">
              <div>
                <h2>
                  Explore our <em>Top 10</em> lists
                </h2>
                <p>Worldwide rankings — banks, universities, companies, hotels and more. Sourced, dated and updated.</p>
              </div>
              <Link href={`/s/${site.id}/top10`} className="cn-top10-cta">
                <IconTrophy /> Browse Top 10 lists
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURED ── */}
      {featured ? (
        <section className="cn-section alt">
          <div className="cn-wrap">
            <div className="cn-sec-head">
              <div>
                <span className="cn-sec-kicker">Featured report</span>
                <h2>Start with the headline numbers</h2>
              </div>
            </div>

            <div className="cn-featured">
              <Link
                href={`/s/${site.id}/${featured.slug}`}
                className="cn-featured-media"
                aria-label={featured.title}
              >
                {featured.image_url ? (
                  <img src={featured.image_url} alt={featured.title} loading="lazy" />
                ) : (
                  <span aria-hidden="true" />
                )}
                <span className="cn-badge">
                  <IconChart /> Data report
                </span>
              </Link>
              <div className="cn-featured-body">
                <CardChips tags={featured.tags} />
                <h3>
                  <Link href={`/s/${site.id}/${featured.slug}`}>{featured.title}</Link>
                </h3>
                <p className="cn-excerpt">{featured.excerpt || featured.meta_description}</p>
                <ArticleMeta article={featured} />
                <Link href={`/s/${site.id}/${featured.slug}`} className="cn-readmore">
                  Read the full report <IconArrow />
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── ALL REPORTS ── */}
      <section className="cn-section">
        <div className="cn-wrap">
          <div className="cn-sec-head">
            <div>
              <span className="cn-sec-kicker">All statistics</span>
              <h2>{featured ? "More data reports" : "Latest data reports"}</h2>
              <p>Numbers, tables and country breakdowns — sourced and kept current.</p>
            </div>
          </div>

          {articles.length === 0 ? (
            <div className="cn-emptywrap">
              <span className="cn-empty-ico">
                <IconCompass />
              </span>
              <h3>New data reports are on the way</h3>
              <p>
                We&apos;re compiling sourced, dated statistics on AI, social media, companies and countries.
                Please check back shortly.
              </p>
            </div>
          ) : rest.length === 0 ? (
            <div className="cn-emptywrap">
              <span className="cn-empty-ico">
                <IconCompass />
              </span>
              <h3>More reports coming soon</h3>
              <p>Our featured report above is the first of many. Additional statistics and rankings are in progress.</p>
            </div>
          ) : (
            <div className="cn-grid">
              {rest.map((a, i) => (
                <StatCard key={a.id} siteId={site.id} article={a} index={i + 2} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── METHODOLOGY / SOURCING STRIP ── */}
      <section className="cn-section alt">
        <div className="cn-wrap">
          <div className="cn-sec-head">
            <div>
              <span className="cn-sec-kicker">How we work</span>
              <h2>Numbers you can check</h2>
            </div>
          </div>
          <div className="cn-trust-grid">
            <div className="cn-trust-card">
              <span className="cn-trust-ico">
                <IconDatabase />
              </span>
              <h3>Sourced figures</h3>
              <p>
                Numbers are compiled from public sources — company filings, government databases and industry reports —
                and we name the source types behind each report.
              </p>
            </div>
            <div className="cn-trust-card">
              <span className="cn-trust-ico">
                <IconScale />
              </span>
              <h3>Estimates, labelled</h3>
              <p>
                Where an exact figure isn&apos;t published, we say so and give a range or estimate instead of false
                precision. Official vs estimated is always distinguished.
              </p>
            </div>
            <div className="cn-trust-card">
              <span className="cn-trust-ico">
                <IconCalendar />
              </span>
              <h3>Dated &amp; updated</h3>
              <p>
                Statistics change fast, so every report carries a &ldquo;last updated&rdquo; date and a reminder to
                re-verify before you cite the numbers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <NewsletterForm />
      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Footer (shared shape with Article)
   ──────────────────────────────────────────────────────────── */
export function SiteFooter({ siteName, siteId, domain }: { siteName: string; siteId: string; domain: string }) {
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
                  <Link href={`/s/${siteId}/topic/ai-chatgpt`}>AI &amp; ChatGPT</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}/topic/social-media`}>Social media</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}/topic/companies`}>Companies</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>About</h4>
              <ul>
                <li>
                  <Link href={`/s/${siteId}/contact`}>Contact</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}/privacy`}>Privacy Policy</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}/terms`}>Terms of Service</Link>
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
