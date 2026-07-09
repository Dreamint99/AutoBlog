import "./theme.css";
import Link from "next/link";
import { fontVars } from "./fonts";
import type { Article, Site } from "@/lib/types";
import type { CnCategory } from "./categories";
import { CN_CATEGORIES } from "./categories";
import { CnHeader, SiteFooter, StatCard, IconArrow, IconCompass } from "./Home";

/* Countly topic / category landing page. Lists every report that matches the
   category, in the same editorial style as the home page. */
export default function Category({
  site,
  category,
  articles,
}: {
  site: Site;
  category: CnCategory;
  articles: Article[];
}) {
  return (
    <div className={`cn-root ${fontVars}`}>
      <CnHeader site={site} />

      {/* ── CATEGORY HERO ── */}
      <section className="cn-section">
        <div className="cn-wrap">
          <div className="cn-sec-head">
            <div>
              <span className="cn-sec-kicker">Topic</span>
              <h1>{category.label}</h1>
              <p>{category.blurb}</p>
            </div>
            <Link href={`/s/${site.id}`} className="cn-readmore">
              <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}>
                <IconArrow />
              </span>
              All statistics
            </Link>
          </div>

          {articles.length === 0 ? (
            <div className="cn-emptywrap">
              <span className="cn-empty-ico">
                <IconCompass />
              </span>
              <h3>Reports on {category.label} are on the way</h3>
              <p>
                We&apos;re compiling sourced, dated statistics for this topic. Meanwhile, browse the other
                data categories from the menu above.
              </p>
            </div>
          ) : (
            <div className="cn-grid">
              {articles.map((a, i) => (
                <StatCard key={a.id} siteId={site.id} article={a} index={i + 1} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── OTHER TOPICS ── */}
      <section className="cn-section alt">
        <div className="cn-wrap">
          <div className="cn-sec-head">
            <div>
              <span className="cn-sec-kicker">Explore more</span>
              <h2>Other data categories</h2>
            </div>
          </div>
          <div className="cn-cat-grid">
            {CN_CATEGORIES.filter((c) => c.slug !== category.slug).map((c, i) => (
              <Link href={`/s/${site.id}/topic/${c.slug}`} className="cn-cat-card" key={c.slug}>
                <span className="cn-cat-num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="cn-cat-text">
                  <b>{c.label}</b>
                  <p>{c.blurb}</p>
                </div>
                <span className="cn-cat-arrow" aria-hidden="true">
                  <IconArrow />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}
