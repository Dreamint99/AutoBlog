import "./theme.css";
import Link from "next/link";
import { fontVars } from "./fonts";
import type { Site, Article } from "@/lib/types";
import { CnHeader, SiteFooter, fmtDate, IconArrow } from "./Home";

// Curated Wikimedia hero — Sreemangal tea gardens, Sylhet.
const HERO_IMG =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Sreemangal_tea_garden_2017-08-20.jpg/1280px-Sreemangal_tea_garden_2017-08-20.jpg";

function DestCard({ siteId, article }: { siteId: string; article: Article }) {
  const href = `/s/${siteId}/${article.slug}`;
  return (
    <article className="cn-vb-card">
      <Link href={href} className="cn-vb-card-media" aria-label={article.title}>
        {article.image_url ? (
          <img src={article.image_url} alt={article.title} loading="lazy" />
        ) : (
          <span aria-hidden="true" />
        )}
      </Link>
      <div className="cn-vb-card-body">
        <h3>
          <Link href={href}>{article.title}</Link>
        </h3>
        <p className="cn-vb-excerpt">{article.excerpt || article.meta_description}</p>
        <div className="cn-vb-card-foot">
          <Link href={href} className="cn-vb-read">
            Read the guide <IconArrow />
          </Link>
          {article.reading_time ? <span>{article.reading_time} min</span> : null}
        </div>
      </div>
    </article>
  );
}

export default function VisitBangladesh({ site, articles }: { site: Site; articles: Article[] }) {
  return (
    <div className={`cn-root ${fontVars}`}>
      <CnHeader site={site} />

      {/* ── HERO ── */}
      <section className="cn-vb-hero">
        <img className="cn-vb-hero-img" src={HERO_IMG} alt="Tea gardens in Sreemangal, Bangladesh" />
        <div className="cn-vb-hero-overlay" />
        <div className="cn-wrap cn-vb-hero-inner">
          <span className="cn-vb-eyebrow">Countly · Travel</span>
          <h1>
            Visit <em>Bangladesh</em> with Countly
          </h1>
          <p>
            From the world&apos;s longest sea beach to hill tracts, tea gardens, swamp forests and
            river towns — practical, honestly-costed travel guides to the best of Bangladesh.
          </p>
          <div className="cn-vb-herostats">
            <span>
              <b>{articles.length}</b> guides
            </span>
            <span>
              <b>Sourced</b> &amp; dated
            </span>
            <span>
              <b>Indicative</b> costs
            </span>
          </div>
        </div>
      </section>

      {/* ── DESTINATIONS ── */}
      <section className="cn-section">
        <div className="cn-wrap">
          <div className="cn-sec-head">
            <div>
              <span className="cn-sec-kicker">Destinations &amp; guides</span>
              <h2>Where to go in Bangladesh</h2>
              <p>
                Every guide covers how to get there, the best season, what to see, where to stay and
                roughly what it costs — with figures kept indicative and honest.
              </p>
            </div>
          </div>

          {articles.length === 0 ? (
            <div className="cn-emptywrap">
              <h3>Guides are on the way</h3>
              <p>We&apos;re compiling Bangladesh travel guides — check back shortly.</p>
            </div>
          ) : (
            <div className="cn-vb-grid">
              {articles.map((a) => (
                <DestCard key={a.id} siteId={site.id} article={a} />
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}
