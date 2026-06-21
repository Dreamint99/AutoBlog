import "./theme.css";
import Link from "next/link";
import type { SiteHomeProps, Site, Article } from "@/lib/types";

/* ────────────────────────────────────────────────────────────
   Inline icons — server-safe, no client JS, no extra packages
   ──────────────────────────────────────────────────────────── */
function IconPearl() {
  // small geometric / pearl wordmark motif
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
function IconArrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
function IconKey() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="15" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="m11 12 8-8M16.5 6.5l2 2M14.5 8.5l2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19 10.7C19 15.6 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconGem() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4h12l3 5-9 11L3 9l3-5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M3 9h18M9 4l-3 5 6 11 6-11-3-5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" opacity=".6" />
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

const NAV_LINKS: { label: string; hash: string }[] = [
  { label: "Living in Qatar", hash: "#living" },
  { label: "Doha", hash: "#doha" },
  { label: "Food", hash: "#food" },
  { label: "Culture", hash: "#culture" },
  { label: "Guides", hash: "#guides" },
];

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

function ArticleMeta({ article }: { article: Article }) {
  return (
    <div className="qx-meta">
      <span>
        <IconClock />
        {article.reading_time} min read
      </span>
      <span className="qx-dot" aria-hidden="true" />
      <span>
        <IconCalendar />
        {fmtDate(article.created_at)}
      </span>
    </div>
  );
}

function StoryCard({ siteId, article }: { siteId: string; article: Article }) {
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
  const editorsPick: Article | undefined = articles[1];
  const grid: Article[] = articles.slice(featured && editorsPick ? 2 : 1);
  const latestDate = featured ? fmtDate(featured.created_at) : fmtDate(new Date().toISOString());

  return (
    <>
      <SiteHeader site={site} />

      {/* ── HERO: magazine cover featuring the latest article ── */}
      <section className="qx-hero">
        <div className="qx-wrap">
          {featured ? (
            <div className="qx-hero-feat">
              <Link
                href={`/s/${site.id}/${featured.slug}`}
                className="qx-hero-media"
                aria-label={featured.title}
              >
                {featured.image_url ? (
                  <img src={featured.image_url} alt={featured.title} loading="lazy" />
                ) : (
                  <span aria-hidden="true" />
                )}
                <span className="qx-hero-badge">
                  <span className="qx-badge">
                    <IconStar /> Latest story
                  </span>
                </span>
              </Link>

              <div className="qx-hero-copy">
                <span className="qx-eyebrow">
                  <IconPearl />
                  {(site.niche || "Qatar Living & Lifestyle").split(",")[0]}
                </span>
                <h1>
                  <Link href={`/s/${site.id}/${featured.slug}`}>{featured.title}</Link>
                </h1>
                <p className="qx-hero-excerpt">
                  {featured.excerpt || featured.meta_description || site.tagline}
                </p>
                <Link href={`/s/${site.id}/${featured.slug}`} className="qx-readmore">
                  Read the story <IconArrow />
                </Link>

                <div className="qx-hero-ribbon">
                  <span>
                    <IconGem />
                    Curated for {site.audience || "expats & newcomers"}
                  </span>
                  <span>
                    <IconCalendar />
                    Updated {latestDate}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* graceful hero when there are no articles yet */
            <div className="qx-hero-copy">
              <span className="qx-eyebrow">
                <IconPearl />
                {(site.niche || "Qatar Living & Lifestyle").split(",")[0]}
              </span>
              <h1>{site.tagline || "Your refined insider's guide to life in Qatar."}</h1>
              <p className="qx-hero-excerpt">
                Aspirational, trustworthy stories on living, dining and exploring Qatar — written for{" "}
                {site.audience || "expats and newcomers"} who want the insider&rsquo;s view of Doha and beyond.
              </p>
              <div className="qx-hero-ribbon">
                <span>
                  <IconGem />A premium Qatar lifestyle magazine
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── EDITOR'S PICK (second article, landscape feature) ── */}
      {editorsPick ? (
        <section className="qx-section" id="guides">
          <div className="qx-wrap">
            <div className="qx-sec-head">
              <div>
                <span className="qx-sec-kicker">Editor&rsquo;s pick</span>
                <h2>This week&rsquo;s must-read</h2>
              </div>
              <Link href={`/s/${site.id}`} className="qx-sec-link">
                All stories <IconArrow />
              </Link>
            </div>

            <article className="qx-feature">
              <Link
                href={`/s/${site.id}/${editorsPick.slug}`}
                className="qx-feature-media"
                aria-label={editorsPick.title}
              >
                {editorsPick.image_url ? (
                  <img src={editorsPick.image_url} alt={editorsPick.title} loading="lazy" />
                ) : (
                  <span aria-hidden="true" />
                )}
                <span className="qx-badge">
                  <IconStar /> Editor&rsquo;s pick
                </span>
              </Link>
              <div className="qx-feature-body">
                <span className="qx-chip qx-chip-cat">{categoryOf(editorsPick)}</span>
                <h3>
                  <Link href={`/s/${site.id}/${editorsPick.slug}`}>{editorsPick.title}</Link>
                </h3>
                <p className="qx-excerpt">{editorsPick.excerpt || editorsPick.meta_description}</p>
                <ArticleMeta article={editorsPick} />
                <Link href={`/s/${site.id}/${editorsPick.slug}`} className="qx-readmore">
                  Read the full feature <IconArrow />
                </Link>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {/* ── STORY GRID ── */}
      <section className={`qx-section${editorsPick ? " alt" : ""}`} id="living">
        <div className="qx-wrap">
          <div className="qx-sec-head">
            <div>
              <span className="qx-sec-kicker">The magazine</span>
              <h2>{grid.length > 0 ? "Latest from Qatar" : "Our stories"}</h2>
              <p>Living, dining, culture and city guides — the refined insider&rsquo;s view of life in Qatar.</p>
            </div>
          </div>

          {articles.length === 0 ? (
            <div className="qx-emptywrap">
              <span className="qx-empty-ico">
                <IconCompass />
              </span>
              <h3>Fresh stories are on the way</h3>
              <p>
                We&rsquo;re curating beautiful, insider guides to living in Qatar for{" "}
                {site.audience || "expats and newcomers"}. Please check back very soon.
              </p>
            </div>
          ) : grid.length === 0 ? (
            <div className="qx-emptywrap">
              <span className="qx-empty-ico">
                <IconCompass />
              </span>
              <h3>More stories coming soon</h3>
              <p>The features above are the first of many. New Qatar lifestyle guides are being prepared.</p>
            </div>
          ) : (
            <div className="qx-grid">
              {grid.map((a) => (
                <StoryCard key={a.id} siteId={site.id} article={a} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── WHY QATAREXPERTS ── */}
      <section className="qx-section" id="culture">
        <div className="qx-wrap">
          <div className="qx-sec-head">
            <div>
              <span className="qx-sec-kicker">Why QatarExperts</span>
              <h2>Your trusted insider in Qatar</h2>
            </div>
          </div>
          <div className="qx-value-grid">
            <div className="qx-value-card">
              <span className="qx-value-ico">
                <IconKey />
              </span>
              <h3>Settle in with ease</h3>
              <p>
                Practical, up-to-date guides on housing, paperwork and daily life — everything a newcomer needs to feel
                at home in Qatar, minus the guesswork.
              </p>
            </div>
            <div className="qx-value-card">
              <span className="qx-value-ico">
                <IconHeart />
              </span>
              <h3>Eat &amp; explore like a local</h3>
              <p>
                From majlis hospitality to Doha&rsquo;s finest tables and hidden souqs, we share the places and
                experiences locals genuinely love.
              </p>
            </div>
            <div className="qx-value-card">
              <span className="qx-value-ico">
                <IconGem />
              </span>
              <h3>Refined &amp; reliable</h3>
              <p>
                Carefully researched, elegantly written stories with cultural respect at their heart — the polished
                guidance you can actually trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter site={site} />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Header (CSS-only mobile nav, shared shape with Article)
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
   Footer (shared shape with Article)
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
