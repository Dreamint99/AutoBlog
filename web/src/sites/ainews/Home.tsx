import "./theme.css";
import Link from "next/link";
import type { SiteHomeProps, Site, Article } from "@/lib/types";

/* ── small pure helpers (no hooks / no state) ── */

const NAV: ReadonlyArray<readonly [string, string]> = [
  ["Latest", "#latest"],
  ["Models", "#models"],
  ["Tools", "#tools"],
  ["Guides", "#guides"],
];

const TICKER_FALLBACK = [
  "LLMs",
  "Agents",
  "Open Source",
  "Benchmarks",
  "GPUs",
  "Safety",
  "Multimodal",
  "Research",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function categoryOf(article: Article): string {
  const tag = article.tags.find((t) => t.trim().length > 0);
  return (tag ?? article.keyword ?? "AI").toUpperCase();
}

/* collect distinct tags across articles for the ticker strip */
function tickerTags(articles: Article[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of articles) {
    for (const t of a.tags) {
      const key = t.trim();
      if (key && !seen.has(key.toLowerCase())) {
        seen.add(key.toLowerCase());
        out.push(key);
      }
      if (out.length >= 10) return out;
    }
  }
  return out.length ? out : TICKER_FALLBACK;
}

/* ── shared chrome ── */

function Ticker({ tags }: { tags: string[] }) {
  return (
    <div className="ticker" aria-label="Trending topics">
      <div className="ticker-inner">
        <span className="ticker-label">Trending</span>
        <span className="ticker-chips">
          {tags.map((t) => (
            <span className="ticker-chip" key={t}>
              {t}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

function Masthead({ site }: { site: Site }) {
  return (
    <header className="masthead">
      <div className="shell masthead-row">
        {/* CSS-only mobile menu toggle */}
        <input type="checkbox" id="ai-nav" className="nav-toggle" aria-hidden="true" />
        <Link href={`/s/${site.id}`} className="logo" aria-label={`${site.name} home`}>
          <span className="logomark" aria-hidden="true">
            AI<span className="dot" />
          </span>
          <span className="wordmark">
            AI<b>News</b>
            <span className="tld">.io</span>
          </span>
        </Link>

        <nav className="nav" aria-label="Primary">
          {NAV.map(([label, href]) => (
            <a href={href} key={label}>
              {label}
            </a>
          ))}
          <span className="live-pill" aria-hidden="true">
            Live
          </span>
        </nav>

        <label className="nav-burger" htmlFor="ai-nav" aria-label="Toggle navigation menu">
          <span />
        </label>
      </div>
    </header>
  );
}

function Footer({ site }: { site: Site }) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-row">
          <Link href={`/s/${site.id}`} className="logo" aria-label={`${site.name} home`}>
            <span className="logomark" aria-hidden="true">
              AI<span className="dot" />
            </span>
            <span className="wordmark">
              AI<b>News</b>
            </span>
          </Link>
          <p className="footer-tag">{site.tagline}</p>
          <nav className="footer-nav" aria-label="Footer">
            {NAV.map(([label, href]) => (
              <a href={href} key={label}>
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="footer-base">
          <span>
            © {year} <span className="accent">{site.name}</span>
          </span>
          <span>·</span>
          <span>{site.tagline}</span>
          <span>·</span>
          <span>Decoding AI, one signal at a time.</span>
        </div>
      </div>
    </footer>
  );
}

/* ── cards ── */

function Lead({ site, article }: { site: Site; article: Article }) {
  const href = `/s/${site.id}/${article.slug}`;
  return (
    <article className="lead">
      <Link href={href} className="lead-media" aria-label={article.title} tabIndex={-1}>
        <span className="lead-badge">Featured</span>
        {article.image_url ? (
          <img src={article.image_url} alt={article.title} loading="lazy" />
        ) : null}
      </Link>
      <div className="lead-body">
        <div className="lead-meta">
          <span className="cat">{categoryOf(article)}</span>
          <span className="sep">/</span>
          <span>{formatDate(article.created_at)}</span>
          <span className="sep">·</span>
          <span>{article.reading_time} min read</span>
        </div>
        <h3 className="lead-title">
          <Link href={href}>{article.title}</Link>
        </h3>
        {article.excerpt ? <p className="lead-excerpt">{article.excerpt}</p> : null}
        {article.tags.length > 0 ? (
          <div className="lead-tags">
            {article.tags.slice(0, 4).map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Card({ site, article }: { site: Site; article: Article }) {
  const href = `/s/${site.id}/${article.slug}`;
  return (
    <article className="card">
      <Link href={href} className="card-media" aria-label={article.title} tabIndex={-1}>
        <span className="card-cat">{categoryOf(article)}</span>
        {article.image_url ? (
          <img src={article.image_url} alt={article.title} loading="lazy" />
        ) : null}
      </Link>
      <div className="card-body">
        <h3 className="card-title">
          <Link href={href}>{article.title}</Link>
        </h3>
        {article.excerpt ? <p className="card-excerpt">{article.excerpt}</p> : null}
        <div className="card-foot">
          <span className="read">{article.reading_time} min</span>
          <span className="sep">·</span>
          <span>{formatDate(article.created_at)}</span>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="empty" id="latest">
      <div className="empty-mark" aria-hidden="true">
        {"</>"}
      </div>
      <h2>
        No signal yet<span className="blink" aria-hidden="true" />
      </h2>
      <p>The newsroom is warming up. Fresh AI stories and explainers land here soon.</p>
    </div>
  );
}

/* ── page ── */

export default function Home({ site, articles }: SiteHomeProps) {
  const [featured, ...rest] = articles;
  const tags = tickerTags(articles);

  return (
    <>
      <a href="#latest" className="skip-link">
        Skip to stories
      </a>
      <Ticker tags={tags} />
      <Masthead site={site} />

      <main>
        <div className="shell">
          {articles.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {featured ? <Lead site={site} article={featured} /> : null}

              <section id="latest" aria-labelledby="latest-h">
                <div className="section-head">
                  <h2 id="latest-h">Latest</h2>
                  <span className="rule" />
                  <span className="count">{String(rest.length).padStart(2, "0")} stories</span>
                </div>

                {rest.length > 0 ? (
                  <div className="grid">
                    {rest.map((a) => (
                      <Card site={site} article={a} key={a.id} />
                    ))}
                  </div>
                ) : (
                  <p className="footer-tag" style={{ paddingBottom: "24px" }}>
                    That is the latest drop — more incoming.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      <Footer site={site} />
    </>
  );
}
