import "./theme.css";
import Link from "next/link";
import type { SiteArticleProps, Site, Article, TocItem } from "@/lib/types";
import { Masthead, Footer } from "./Chrome";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function categoryOf(article: Article): string {
  const tag = article.tags.find((t) => t.trim().length > 0);
  return (tag ?? article.keyword ?? "Cost").toUpperCase();
}

function Toc({ items, variant }: { items: TocItem[]; variant: "inline" | "rail" }) {
  if (items.length === 0) return null;
  return (
    <details className={`toc toc-${variant}`} open>
      <summary>On this page</summary>
      <ul className="toc-list">
        {items.map((item) => (
          <li className={item.level >= 3 ? "lvl-3" : "lvl-2"} key={item.id}>
            <a href={`#${item.id}`}>{item.text}</a>
          </li>
        ))}
      </ul>
    </details>
  );
}

function RelatedCard({ site, article }: { site: Site; article: Article }) {
  const href = `/s/${site.id}/${article.slug}`;
  return (
    <article className="card">
      <Link href={href} className="card-media" aria-label={article.title} tabIndex={-1}>
        <span className="card-cat">{categoryOf(article)}</span>
        {article.image_url ? <img src={article.image_url} alt={article.title} loading="lazy" /> : null}
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

export default function Article({ site, article, related, bodyHtml, toc }: SiteArticleProps) {
  const date = formatDate(article.created_at);

  return (
    <>
      <a href="#article-body" className="skip-link">
        Skip to article
      </a>
      <Masthead site={site} />

      <main>
        <article className="article-wrap">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href={`/s/${site.id}`}>{site.name}</Link>
            <span className="sep" aria-hidden="true">
              /
            </span>
            <Link href={`/s/${site.id}#guides`}>Guides</Link>
            <span className="sep" aria-hidden="true">
              /
            </span>
            <span className="here">{article.title}</span>
          </nav>

          <header className="article-head">
            <div className="article-cat">{categoryOf(article)}</div>
            <h1 className="article-title">{article.title}</h1>
            {article.excerpt ? <p className="article-dek">{article.excerpt}</p> : null}

            {/* InfKey signature: verified-pricing band */}
            <div className="verified-band">
              <span className="vb-tag">Pricing verified</span>
              {date ? <span className="vb-date">{date}</span> : null}
              <span className="vb-note">
                USD · excludes taxes, caching &amp; retries — confirm with the provider before relying on it.
              </span>
            </div>

            <div className="article-meta">
              {date ? <span>{date}</span> : null}
              {date ? (
                <span className="sep" aria-hidden="true">
                  ·
                </span>
              ) : null}
              <span>{article.reading_time} min read</span>
              {article.keyword ? (
                <>
                  <span className="sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="kw">
                    <span aria-hidden="true">🎯</span>
                    {article.keyword}
                  </span>
                </>
              ) : null}
            </div>

            {article.tags.length > 0 ? (
              <div className="article-tags">
                {article.tags.map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </header>

          {article.image_url ? (
            <figure className="hero-figure">
              <div className="frame">
                <img src={article.image_url} alt={article.title} loading="lazy" />
              </div>
            </figure>
          ) : null}

          <div className="article-grid">
            <div className="article-main">
              <Toc items={toc} variant="inline" />
              <div
                id="article-body"
                className="article-content"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            </div>
            <Toc items={toc} variant="rail" />
          </div>

          {related.length > 0 ? (
            <section className="related" aria-labelledby="related-h">
              <div className="section-head">
                <h2 id="related-h">Related guides</h2>
                <span className="rule" />
                <span className="count">{String(related.length).padStart(2, "0")} reads</span>
              </div>
              <div className="grid">
                {related.map((a) => (
                  <RelatedCard site={site} article={a} key={a.id} />
                ))}
              </div>
            </section>
          ) : null}
        </article>
      </main>

      <Footer site={site} />
    </>
  );
}
