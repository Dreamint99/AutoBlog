import Link from "next/link";
import type { SiteArticleProps, Site, Article as A, TocItem } from "@/lib/types";
import { Masthead, Footer } from "./Chrome";
import { fontVars } from "./fonts";
import { countryOf, topicOf, trustedImage, fmtDate } from "./guide-meta";
import Flag from "./Flag";

function Toc({ items, variant }: { items: TocItem[]; variant: "inline" | "rail" }) {
  if (!items.length) return null;
  return (
    <details className={`vp-toc vp-toc-${variant}`} open={variant === "rail"}>
      <summary>On this page</summary>
      <ol>
        {items.map((it) => (
          <li className={it.level >= 3 ? "l3" : "l2"} key={it.id}>
            <a href={`#${it.id}`}>{it.text}</a>
          </li>
        ))}
      </ol>
    </details>
  );
}

function Related({ site, items }: { site: Site; items: A[] }) {
  if (!items.length) return null;
  return (
    <section className="vp-related" aria-labelledby="vp-related-h">
      <h2 id="vp-related-h" className="vp-h2">
        Related guidance
      </h2>
      <ul className="vp-guides">
        {items.slice(0, 6).map((a) => {
          const c = countryOf(a);
          return (
            <li className="vp-guide" key={a.id}>
              <span className="vp-guide-flag">
                <Flag emoji={c?.flag} size={36} />
              </span>
              <div>
                <span className="vp-kicker">
                  {topicOf(a)}
                  {c ? ` · ${c.name}` : ""}
                </span>
                <h3>
                  <Link href={`/s/${site.id}/${a.slug}`}>{a.title}</Link>
                </h3>
                <span className="vp-date">Updated {fmtDate(a.created_at)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function Article({ site, article, related, bodyHtml, toc }: SiteArticleProps) {
  const b = `/s/${site.id}`;
  const c = countryOf(article);
  const img = trustedImage(article);
  const updated = fmtDate(article.created_at);
  // Inline photos picked from Wikipedia are matched by keyword and often wrong (a
  // nuclear plant captioned "construction workers") — drop them from the body.
  const body = bodyHtml
    .replace(/<figure\b[^>]*>(?:(?!<\/figure>)[\s\S])*?wiki(?:media|pedia)\.org(?:(?!<\/figure>)[\s\S])*?<\/figure>/gi, "")
    .replace(/<img\b[^>]*wiki(?:media|pedia)\.org[^>]*>/gi, "");

  return (
    <div className={fontVars}>
      <a href="#article-body" className="skip-link">
        Skip to article
      </a>
      <Masthead site={site} />

      <main>
        <article>
          <header className="vp-pagehead">
            <div className="vp-wrap">
              <nav className="vp-crumbs" aria-label="Breadcrumb">
                <Link href={b}>Home</Link>
                <span aria-hidden="true">›</span>
                <Link href={`${b}/guides`}>Work-permit guides</Link>
                {c ? (
                  <>
                    <span aria-hidden="true">›</span>
                    <Link href={`${b}/countries/${c.slug}`}>{c.name}</Link>
                  </>
                ) : null}
              </nav>
              <span className="vp-eyebrow light">
                {topicOf(article)}
                {c ? ` · ${c.name}` : ""}
              </span>
              <h1>{article.title}</h1>
              {article.excerpt ? <p className="vp-lede light">{article.excerpt}</p> : null}
              <div className="vp-pagehead-meta">
                <span>
                  <b>Last reviewed:</b> {updated}
                </span>
                <span>
                  <b>Reading time:</b> {article.reading_time} min
                </span>
                <span>
                  <b>Status:</b> Independent guidance — confirm with the official source
                </span>
              </div>
            </div>
          </header>

          <div className="vp-wrap vp-art-grid">
            <aside className="vp-art-left">
              <Toc items={toc} variant="rail" />
            </aside>

            <div className="vp-art-main">
              {img ? (
                <figure className="vp-art-img">
                  <img src={img} alt={article.title} />
                </figure>
              ) : c ? (
                <div className="vp-banner" role="img" aria-label={`${c.name} — ${c.permitType}`}>
                  <span className="vp-banner-flag">
                    <Flag emoji={c.flag} size={84} />
                  </span>
                  <div>
                    <span>Destination</span>
                    <b>{c.name}</b>
                    <small>{c.permitType}</small>
                  </div>
                </div>
              ) : null}

              <Toc items={toc} variant="inline" />

              <div className="vp-callout">
                <b>Before you apply:</b> rules, fees and processing times change. Confirm every requirement with the
                official government portal{c ? ` for ${c.name}` : ""} or the embassy, and never pay an agent for a job
                offer you cannot verify.
              </div>

              <div id="article-body" className="article-content" dangerouslySetInnerHTML={{ __html: body }} />

              <div className="vp-art-foot">
                <span>
                  Page last reviewed {updated}. Spotted something out of date?{" "}
                  <Link href={`${b}/contact`}>Tell us</Link>.
                </span>
              </div>
            </div>

            <aside className="vp-art-right">
              {c ? (
                <section className="vp-panel vp-keyfacts">
                  <h2 className="vp-panel-h">
                    <Flag emoji={c.flag} size={26} /> {c.name}: key facts
                  </h2>
                  <dl>
                    <dt>Permit</dt>
                    <dd>{c.permitType}</dd>
                    <dt>Typical processing</dt>
                    <dd>
                      {c.visaWeeks[0]}–{c.visaWeeks[1]} weeks
                    </dd>
                    <dt>EU / Schengen</dt>
                    <dd>
                      {c.inEU ? "EU member" : "Not in the EU"} · {c.schengen ? "Schengen area" : "outside Schengen"}
                    </dd>
                    <dt>IELTS needed</dt>
                    <dd>{c.ieltsRequired ? "Usually yes" : "Usually not for skilled trades"}</dd>
                    <dt>Language</dt>
                    <dd>{c.language}</dd>
                    <dt>Currency</dt>
                    <dd>{c.currency}</dd>
                  </dl>
                  <a className="vp-btn vp-btn-primary vp-btn-block" href={c.officialSource} target="_blank" rel="noopener noreferrer">
                    Official government source ↗
                  </a>
                  <Link className="vp-more" href={`${b}/countries/${c.slug}`}>
                    Salaries &amp; cost of living in {c.name} →
                  </Link>
                </section>
              ) : null}
              <section className="vp-panel">
                <h2 className="vp-panel-h">Tools</h2>
                <ul className="vp-links">
                  <li>
                    <Link href={`${b}/tools`}>Salary &amp; savings calculator</Link>
                  </li>
                  <li>
                    <Link href={`${b}/tools`}>Compare two countries</Link>
                  </li>
                  <li>
                    <Link href={`${b}/jobs`}>Salary by job</Link>
                  </li>
                </ul>
              </section>
              <section className="vp-alert small">
                <div className="vp-alert-head">
                  <span aria-hidden="true">!</span>
                  <h2>Scam check</h2>
                </div>
                <p>Real employers do not charge for jobs or visas. Walk away from anyone asking for a “guarantee” fee.</p>
                <Link href={`${b}#scams`}>See the warning signs →</Link>
              </section>
            </aside>
          </div>

          <div className="vp-wrap">
            <Related site={site} items={related} />
          </div>
        </article>
      </main>

      <Footer site={site} />
    </div>
  );
}
