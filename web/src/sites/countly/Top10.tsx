import "./theme.css";
import Link from "next/link";
import { fontVars } from "./fonts";
import type { Article, Site } from "@/lib/types";
import { topNumber } from "./categories";
import { CnHeader, SiteFooter, fmtDate, IconArrow, IconCompass } from "./Home";

function Trophy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4.5h10v3.2a5 5 0 0 1-10 0V4.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 5.5H4.4v1.6a3 3 0 0 0 3 3M17 5.5h2.6v1.6a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 12.8v3.4M9 19.5h6M10 16.2h4l.6 3.3h-5.2L10 16.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function Top10Card({ siteId, article }: { siteId: string; article: Article }) {
  const href = `/s/${siteId}/${article.slug}`;
  const n = topNumber(article.title);
  return (
    <article className="cn-top10-card">
      <Link href={href} className="cn-top10-media" aria-label={article.title}>
        {article.image_url ? <img src={article.image_url} alt={article.title} loading="lazy" /> : <span aria-hidden="true" />}
        <span className="cn-top10-ribbon">
          <Trophy /> Top {n}
        </span>
        <span className="cn-top10-rank" aria-hidden="true">
          {n}
        </span>
      </Link>
      <div className="cn-top10-body">
        <h3>
          <Link href={href}>{article.title}</Link>
        </h3>
        <p className="cn-excerpt">{article.excerpt || article.meta_description}</p>
        <div className="cn-top10-foot">
          <Link href={href} className="cn-top10-view">
            View ranking <IconArrow />
          </Link>
          <span className="cn-top10-date">{fmtDate(article.created_at)}</span>
        </div>
      </div>
    </article>
  );
}

export default function Top10({ site, articles }: { site: Site; articles: Article[] }) {
  return (
    <div className={`cn-root ${fontVars}`}>
      <CnHeader site={site} />

      {/* ── HERO ── */}
      <section className="cn-top10-hero">
        <div className="cn-wrap">
          <span className="cn-top10-eyebrow">
            <Trophy /> The definitive rankings
          </span>
          <h1>
            Top 10 <em>Lists</em>
          </h1>
          <p>
            Researched, sourced and dated rankings from around the world — the top banks, universities, companies,
            hotels, travel agencies and more, country by country and city by city.
          </p>
          <div className="cn-top10-stats">
            <span>
              <b>{articles.length}</b>
              ranked lists
            </span>
            <span>
              <b>Worldwide</b>
              countries &amp; cities
            </span>
            <span>
              <b>Sourced</b>
              &amp; dated figures
            </span>
          </div>
        </div>
      </section>

      {/* ── LISTS ── */}
      <section className="cn-section">
        <div className="cn-wrap">
          <div className="cn-sec-head">
            <div>
              <span className="cn-sec-kicker">All rankings</span>
              <h2>Browse the Top 10 lists</h2>
              <p>Every list compares the leaders on real criteria — with a sourced table and a clear methodology.</p>
            </div>
          </div>

          {articles.length === 0 ? (
            <div className="cn-emptywrap">
              <span className="cn-empty-ico">
                <IconCompass />
              </span>
              <h3>Top 10 rankings are on the way</h3>
              <p>We&apos;re compiling worldwide ranked lists — banks, universities, companies and more. Check back shortly.</p>
            </div>
          ) : (
            <div className="cn-top10-grid">
              {articles.map((a) => (
                <Top10Card key={a.id} siteId={site.id} article={a} />
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}
