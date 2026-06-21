import "./theme.css";
import Link from "next/link";
import type { SiteHomeProps, Site, Article } from "@/lib/types";

/* ---------- tiny presentational helpers (server-safe, no hooks) ---------- */

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

function categoryOf(article: Article): string {
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

        {/* CSS-only mobile nav (checkbox hack) */}
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

/* ---------- article visuals ---------- */

function CardImage({ article }: { article: Article }) {
  if (!article.image_url) {
    return (
      <span className="bd-card__media-ph" aria-hidden="true">
        <LeafMark />
      </span>
    );
  }
  return (
    <img
      className="bd-card__img"
      src={article.image_url}
      alt={article.title}
      loading="lazy"
    />
  );
}

function StoryCard({ site, article }: { site: Site; article: Article }) {
  return (
    <Link href={`/s/${site.id}/${article.slug}`} className="bd-card">
      <div className="bd-card__media">
        <CardImage article={article} />
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
          <span>{article.reading_time || Math.max(1, Math.round(article.word_count / 200))} min read</span>
        </div>
      </div>
    </Link>
  );
}

function RailItem({ site, article }: { site: Site; article: Article }) {
  return (
    <Link href={`/s/${site.id}/${article.slug}`} className="bd-rail__item">
      {article.image_url ? (
        <img className="bd-rail__thumb" src={article.image_url} alt={article.title} loading="lazy" />
      ) : (
        <span className="bd-rail__thumb bd-rail__thumb--ph" aria-hidden="true">
          <LeafMark />
        </span>
      )}
      <span>
        <span className="bd-rail__title">{article.title}</span>
        <span className="bd-rail__meta">
          {categoryOf(article)} · {article.reading_time || 4} min
        </span>
      </span>
    </Link>
  );
}

/* ---------- empty state ---------- */

function EmptyState() {
  return (
    <div className="bd-empty">
      <div className="bd-empty__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
          <path
            d="M5 19c0-7 5.5-13 14-14 .4 5.5-1.2 9.6-4.2 12.1C12.3 19 8.4 19.5 5 19Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M9 16c2.4-3.4 5-5.6 8-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h3>Fresh stories are on the way</h3>
      <p>
        Our local experts are out exploring Bangladesh right now. Check back soon for travel routes,
        food trails, and culture guides.
      </p>
    </div>
  );
}

/* ====================================================================== */

export default function Home({ site, articles }: SiteHomeProps) {
  const hasArticles = articles.length > 0;
  const [featured, ...rest] = articles;
  const railArticles = rest.slice(0, 4);
  const gridArticles = rest.slice(4);

  // category ribbon derived from real tags across the catalogue
  const categories = Array.from(
    new Set(articles.flatMap((a) => a.tags).map((t) => t.trim()).filter(Boolean))
  ).slice(0, 8);

  return (
    <>
      <SiteHeader site={site} />

      <main className="bd-main">
        {hasArticles ? (
          <>
            {/* HERO */}
            <section className="bd-hero" aria-label="Featured stories">
              <div className="bd-wrap bd-hero__inner">
                <Link href={`/s/${site.id}/${featured.slug}`} className="bd-hero__feature">
                  {featured.image_url ? (
                    <img
                      className="bd-hero__media"
                      src={featured.image_url}
                      alt={featured.title}
                      loading="lazy"
                    />
                  ) : null}
                  <div className="bd-hero__feat-body">
                    <span className="bd-chip bd-chip--solid">{categoryOf(featured)}</span>
                    <h1 className="bd-hero__feat-title">{featured.title}</h1>
                    {featured.excerpt ? (
                      <p className="bd-hero__feat-excerpt">{featured.excerpt}</p>
                    ) : null}
                    <div className="bd-hero__feat-meta">
                      <time dateTime={featured.created_at}>{formatDate(featured.created_at)}</time>
                      <span className="bd-dot" aria-hidden="true">
                        ·
                      </span>
                      <span>{featured.reading_time || 5} min read</span>
                    </div>
                  </div>
                </Link>

                <aside className="bd-hero__rail" aria-label="Editor's picks">
                  <div className="bd-rail__head">Editor&apos;s picks</div>
                  {railArticles.length > 0 ? (
                    railArticles.map((a) => <RailItem key={a.id} site={site} article={a} />)
                  ) : (
                    <p className="bd-rail__meta" style={{ padding: "4px 8px" }}>
                      More handpicked stories coming soon.
                    </p>
                  )}
                </aside>
              </div>
            </section>

            {/* CATEGORY RIBBON */}
            {categories.length > 0 ? (
              <nav className="bd-wrap bd-ribbon" aria-label="Browse by topic">
                {categories.map((c) => (
                  <Link key={c} href={`/s/${site.id}`} className="bd-ribbon__pill">
                    {c}
                  </Link>
                ))}
              </nav>
            ) : null}

            {/* STORY GRID */}
            <section className="bd-section" id="guides" aria-label="Latest stories">
              <div className="bd-wrap">
                <div className="bd-section__head">
                  <h2 className="bd-section__title">
                    Latest from BangladeshExpert
                    <small>Travel routes, food trails &amp; culture guides from the ground</small>
                  </h2>
                  <span className="bd-section__rule" aria-hidden="true" />
                </div>

                {gridArticles.length > 0 ? (
                  <div className="bd-grid">
                    {gridArticles.map((a) => (
                      <StoryCard key={a.id} site={site} article={a} />
                    ))}
                  </div>
                ) : (
                  <div className="bd-grid">
                    {/* fall back to showing the rail items as cards if the catalogue is small */}
                    {rest.map((a) => (
                      <StoryCard key={a.id} site={site} article={a} />
                    ))}
                    {rest.length === 0 ? (
                      <p className="bd-card__excerpt">More stories are being written right now.</p>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <section className="bd-section" aria-label="No stories yet">
            <div className="bd-wrap">
              <EmptyState />
            </div>
          </section>
        )}
      </main>

      <SiteFooter site={site} />
    </>
  );
}
