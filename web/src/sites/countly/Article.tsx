import CiteBox from "@/lib/CiteBox";
import "./theme.css";
import "./bold.css";
import "./data.css";
import Link from "next/link";
import ShareButtons from "./ShareButtons";
import ReadingProgress from "./ReadingProgress";
import "./v2.css";
import { CnHeader, SiteFooter, Card, kickerOf, rootClass } from "./Home";
import { CN_CATEGORIES } from "./categories";
import type { SiteArticleProps, Article, TocItem } from "@/lib/types";
import { heroSrc } from "@/lib/img";
import { publicPath } from "@/lib/public-path";

/* ────────────────────────────────────────────────────────────
   Inline icons (no client JS, no extra packages)
   ──────────────────────────────────────────────────────────── */
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

/** Body HTML clean-up: the writer sometimes invents chart images at /assets/images/… that were
 *  never uploaded (404 → a 800px blank gap). Drop those, and hide any other image that fails. */
function cleanBody(html: string): string {
  return html
    .replace(/<figure[^>]*>\s*<img[^>]*src="\/assets\/images\/[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, "")
    .replace(/<p>\s*<img[^>]*src="\/assets\/images\/[^"]*"[^>]*>\s*<\/p>/gi, "")
    .replace(/<img[^>]*src="\/assets\/images\/[^"]*"[^>]*>/gi, "")
    .replace(/<img(?![^>]*onerror)/gi, `<img onerror="this.style.display='none'"`);
}

/** Breadcrumb section for an article: its desk's topic page (Wealth → the rich lists). */
function deskLink(siteId: string, a: Article): { label: string; href: string } {
  const label = kickerOf(a);
  if (label === "Wealth") return { label, href: publicPath(siteId, "/search?q=richest") };
  const cat = CN_CATEGORIES.find((c) => c.label === label);
  return { label, href: cat ? publicPath(siteId, `/topic/${cat.slug}`) : publicPath(siteId, "/data") };
}

/* ────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */
export default function Article({ site, article, related, bodyHtml, toc, popular = [] }: SiteArticleProps) {
  const updated = fmtDate(article.created_at);
  const desk = deskLink(site.id, article);
  const url = `https://${site.domain}/${article.slug}`;

  return (
    <div className={rootClass}>
      <ReadingProgress />
      <CnHeader site={site} />

      <article className="cn-article cv-article">
        {/* ── ARTICLE HEAD ── */}
        <header className="cv-ahead">
          <div className="cv-wrap">
            <nav className="cv-crumbs" aria-label="Breadcrumb">
              <Link href={publicPath(site.id, "/")}>Home</Link>
              <IconChevronRight />
              <Link href={desk.href}>{desk.label}</Link>
            </nav>

            <h1>{article.title}</h1>
            {article.excerpt ? <p className="cv-lede">{article.excerpt}</p> : null}

            <div className="cv-ameta">
              <span className="cv-ameta-by">
                <IconVerified /> {site.name} Data Desk
              </span>
              <span>
                <IconCalendar /> Updated <time dateTime={article.created_at}>{updated}</time>
              </span>
              {article.reading_time ? (
                <span>
                  <IconClock /> {article.reading_time} min read
                </span>
              ) : null}
              <span className="cv-ameta-share">
                <ShareButtons url={url} title={article.title} />
              </span>
            </div>

            <div className="cv-ahero">
              <img src={heroSrc(`/card/${article.slug}`, article.title)} alt={article.title} width={1200} height={630} fetchPriority="high" />
            </div>
          </div>
        </header>

        {/* ── BODY: reading column + sticky TOC ── */}
        <div className="cv-wrap">
          <div className={`cv-agrid${toc.length > 0 ? "" : " no-toc"}`}>
            {toc.length > 0 ? (
              <aside className="cv-toc-col">
                <details className="cv-toc" open>
                  <summary>
                    <span>
                      <IconList /> On this page
                    </span>
                    <IconChevron />
                  </summary>
                  <nav aria-label="Table of contents">
                    <ol>
                      {toc.map((item: TocItem) => (
                        <li key={item.id} className={item.level === 3 ? "l3" : "l2"}>
                          <a href={`#${item.id}`}>{item.text}</a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </details>
              </aside>
            ) : null}

            <div className="cv-amain">
              <div className="cv-callout" role="note">
                <IconInfo />
                <p>
                  <b>How to read these numbers.</b> Best-available figures from public sources (filings, government
                  databases, industry reports), with estimates where no exact figure is published. Last updated {updated} —
                  confirm against the original source before citing.
                </p>
              </div>

              <div className="article-content" dangerouslySetInnerHTML={{ __html: cleanBody(bodyHtml) }} />
              <CiteBox url={url} title={article.title} site={site.name} date={article.created_at} />

              <div className="cv-share-bottom">
                <span>Found this useful? Share it</span>
                <ShareButtons url={url} title={article.title} />
              </div>

              {popular.filter((p) => p.slug !== article.slug).length > 0 ? (
                <section className="cv-popular" aria-label={`Popular on ${site.name}`}>
                  <h2>Popular on {site.name}</h2>
                  <ol>
                    {popular
                      .filter((p) => p.slug !== article.slug)
                      .map((p) => (
                        <li key={p.id}>
                          <Link href={publicPath(site.id, `/${p.slug}`)}>{p.title}</Link>
                        </li>
                      ))}
                  </ol>
                </section>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── RELATED ── */}
        <section className="cv-sec cv-related" aria-label="Related reports">
          <div className="cv-wrap">
            <div className="cv-sechead">
              <h2>{related.length > 0 ? "Related data" : "Keep exploring"}</h2>
              <Link href={publicPath(site.id, "/")} className="cv-seeall">
                All statistics <IconArrow />
              </Link>
            </div>
            {related.length > 0 ? (
              <div className="cv-grid cv-grid-3">
                {related.slice(0, 6).map((a) => (
                  <Card key={a.id} siteId={site.id} article={a} />
                ))}
              </div>
            ) : (
              <div className="cn-emptywrap">
                <span className="cn-empty-ico">
                  <IconCompass />
                </span>
                <h3>Browse more statistics</h3>
                <p>Head back to the homepage to explore our full library of sourced data reports and rankings.</p>
              </div>
            )}
          </div>
        </section>
      </article>

      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}
