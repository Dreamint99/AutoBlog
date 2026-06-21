import "./theme.css";
import Link from "next/link";
import type { SiteHomeProps, Article } from "@/lib/types";

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
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4 4 10-10.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSearch() {
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
function IconArrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSteps() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19h4v-4H4v4ZM10 19h4V9h-4v10ZM16 19h4V5h-4v14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3.5h7l5 5V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13 3.5V8.5h5M9 13h6M9 16.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" stroke="currentColor" strokeWidth="1.8" />
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

function ArticleMeta({ article }: { article: Article }) {
  return (
    <div className="vx-meta">
      <span>
        <IconClock />
        {article.reading_time} min read
      </span>
      <span className="vx-dot" aria-hidden="true" />
      <span>
        <IconCalendar />
        Updated {fmtDate(article.created_at)}
      </span>
    </div>
  );
}

function CardChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="vx-chips">
      {tags.slice(0, 2).map((t) => (
        <span className="vx-chip" key={t}>
          {t}
        </span>
      ))}
    </div>
  );
}

function GuideCard({ siteId, article }: { siteId: string; article: Article }) {
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
        <CardChips tags={article.tags} />
        <h3>
          <Link href={href}>{article.title}</Link>
        </h3>
        <p className="vx-excerpt">{article.excerpt || article.meta_description}</p>
        <div className="vx-card-foot">
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
  const latestDate = featured ? fmtDate(featured.created_at) : fmtDate(new Date().toISOString());

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

      {/* ── HERO ── */}
      <section className="vx-hero">
        <div className="vx-wrap">
          <span className="vx-eyebrow">
            <IconShield />
            {site.niche || "Visa & Immigration"}
          </span>
          <h1>
            {site.tagline ? (
              site.tagline
            ) : (
              <>
                Move abroad with <em>confidence</em> and clarity.
              </>
            )}
          </h1>
          <p className="vx-sub">
            Clear, step-by-step visa and immigration guides written for {site.audience || "applicants worldwide"} —
            requirements, costs, timelines and document checklists, explained in plain language.
          </p>

          {/* faux search — visual only, no client JS */}
          <div className="vx-search" role="presentation" aria-hidden="true">
            <IconSearch />
            <span className="vx-search-text">Search a visa, country or requirement…</span>
            <span className="vx-search-btn">Search</span>
          </div>

          <div className="vx-trustrow">
            <span>
              <span className="vx-check">
                <IconCheck />
              </span>
              Step-by-step instructions
            </span>
            <span>
              <span className="vx-check">
                <IconCheck />
              </span>
              Official source references
            </span>
            <span>
              <span className="vx-check">
                <IconCheck />
              </span>
              Updated {latestDate}
            </span>
          </div>
        </div>
      </section>

      {/* ── FEATURED GUIDE ── */}
      {featured ? (
        <section className="vx-section">
          <div className="vx-wrap">
            <div className="vx-sec-head">
              <div>
                <span className="vx-sec-kicker">Featured guide</span>
                <h2>Start with the essentials</h2>
              </div>
            </div>

            <div className="vx-featured">
              <Link
                href={`/s/${site.id}/${featured.slug}`}
                className="vx-featured-media"
                aria-label={featured.title}
              >
                {featured.image_url ? (
                  <img src={featured.image_url} alt={featured.title} loading="lazy" />
                ) : (
                  <span aria-hidden="true" />
                )}
                <span className="vx-badge">
                  <IconCheck /> Editor’s pick
                </span>
              </Link>
              <div className="vx-featured-body">
                <CardChips tags={featured.tags} />
                <h3>
                  <Link href={`/s/${site.id}/${featured.slug}`}>{featured.title}</Link>
                </h3>
                <p className="vx-excerpt">{featured.excerpt || featured.meta_description}</p>
                <ArticleMeta article={featured} />
                <Link href={`/s/${site.id}/${featured.slug}`} className="vx-readmore">
                  Read the full guide <IconArrow />
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── ALL GUIDES ── */}
      <section className={`vx-section${featured ? " alt" : ""}`}>
        <div className="vx-wrap">
          <div className="vx-sec-head">
            <div>
              <span className="vx-sec-kicker">All guides</span>
              <h2>{featured ? "More immigration guides" : "Immigration guides"}</h2>
              <p>Requirements, costs and timelines — kept current and easy to follow.</p>
            </div>
          </div>

          {articles.length === 0 ? (
            <div className="vx-emptywrap">
              <span className="vx-empty-ico">
                <IconCompass />
              </span>
              <h3>New guides are on the way</h3>
              <p>
                We’re preparing detailed, source-checked visa guides for {site.audience || "travellers and applicants"}.
                Please check back shortly.
              </p>
            </div>
          ) : rest.length === 0 ? (
            <div className="vx-emptywrap">
              <span className="vx-empty-ico">
                <IconCompass />
              </span>
              <h3>More guides coming soon</h3>
              <p>Our featured guide above is the first of many. Additional country and visa guides are in progress.</p>
            </div>
          ) : (
            <div className="vx-grid">
              {rest.map((a) => (
                <GuideCard key={a.id} siteId={site.id} article={a} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="vx-section">
        <div className="vx-wrap">
          <div className="vx-sec-head">
            <div>
              <span className="vx-sec-kicker">Why VisaExpert</span>
              <h2>Guidance you can rely on</h2>
            </div>
          </div>
          <div className="vx-trust-grid">
            <div className="vx-trust-card">
              <span className="vx-trust-ico">
                <IconSteps />
              </span>
              <h3>Step-by-step clarity</h3>
              <p>
                Every guide breaks the process into clear stages — eligibility, documents, fees and submission — so you
                always know the next move.
              </p>
            </div>
            <div className="vx-trust-card">
              <span className="vx-trust-ico">
                <IconDoc />
              </span>
              <h3>Documents &amp; checklists</h3>
              <p>
                Practical requirement and cost tables you can work through, with the supporting documents most
                applications ask for.
              </p>
            </div>
            <div className="vx-trust-card">
              <span className="vx-trust-ico">
                <IconGlobe />
              </span>
              <h3>Verified against sources</h3>
              <p>
                We point you back to official government and embassy resources, because visa rules change and accuracy
                matters most.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Footer (shared shape with Article)
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
