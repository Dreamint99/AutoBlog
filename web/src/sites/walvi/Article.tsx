import CiteBox from "@/lib/CiteBox";
import Link from "next/link";
import type { SiteArticleProps, Site, Article as A, TocItem } from "@/lib/types";
import { Masthead, Footer } from "./Chrome";
import { fontVars } from "./fonts";
import { countryOf, topicOf, trustedImage, fmtDate } from "./guide-meta";
import Flag from "./Flag";
import { vcFor, isVcArticle, flagFor } from "./visacheck/data";
import { GuideCard } from "./cards";
import ImgGuard from "./ImgGuard";

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
    <section className="vx-related" aria-labelledby="vp-related-h">
      <h2 id="vp-related-h">Related guides</h2>
      <div className="vx-cards vx-cards-3">
        {items.slice(0, 6).map((a) => (
          <GuideCard site={site} a={a} key={a.id} />
        ))}
      </div>
    </section>
  );
}

/** Strip images that can never render: relative paths ("uk-passport.jpg" has no
 *  host — it 404s on every URL) and Wikipedia/Commons picks (keyword-matched,
 *  often wrong). The client ImgGuard removes anything else that fails. */
function cleanBody(html: string): string {
  return html
    .replace(/<figure\b[^>]*>(?:(?!<\/figure>)[\s\S])*?wiki(?:media|pedia)\.org(?:(?!<\/figure>)[\s\S])*?<\/figure>/gi, "")
    .replace(/<img\b[^>]*wiki(?:media|pedia)\.org[^>]*>/gi, "")
    .replace(/<figure\b[^>]*>(?:(?!<\/figure>)[\s\S])*?<img\b[^>]*\bsrc="(?!https?:|\/|data:)[^"]*"[^>]*>(?:(?!<\/figure>)[\s\S])*?<\/figure>/gi, "")
    .replace(/<img\b[^>]*\bsrc="(?!https?:|\/|data:)[^"]*"[^>]*>/gi, "");
}

export default function Article({ site, article, related, bodyHtml, toc }: SiteArticleProps) {
  const b = `/s/${site.id}`;
  const c = countryOf(article);
  // Title-card renders (/card/…) only repeat the headline — show the flag banner instead.
  const img = ((u) => (u && !/\/card\//.test(u) ? u : ""))(trustedImage(article));
  const vc = isVcArticle(article) ? vcFor(article) : undefined;
  const updated = fmtDate(article.created_at);
  const body = cleanBody(bodyHtml);

  return (
    <div className={fontVars}>
      <a href="#article-body" className="skip-link">
        Skip to article
      </a>
      <Masthead site={site} />

      <main>
        <article>
          <header className="vx-arthead">
            <div className="vx-wrap vx-arthead-in">
              <nav className="vx-crumbs" aria-label="Breadcrumb">
                <Link href={b}>Home</Link>
                <span aria-hidden="true">/</span>
                <Link href={`${b}/guides`}>Guides</Link>
                {c ? (
                  <>
                    <span aria-hidden="true">/</span>
                    <Link href={`${b}/countries/${c.slug}`}>{c.name}</Link>
                  </>
                ) : null}
              </nav>
              <span className="vx-kicker">
                {topicOf(article)}
                {c ? ` · ${c.name}` : ""}
              </span>
              <h1>{article.title}</h1>
              {article.excerpt ? <p className="vx-lede">{article.excerpt}</p> : null}
              <div className="vx-artmeta">
                <span>Updated {updated}</span>
                <span>{article.reading_time} min read</span>
                <span>Independent guide · confirm with the official source</span>
              </div>
            </div>
          </header>

          <div className="vx-wrap vx-artgrid">
            <aside className="vx-artrail">
              <Toc items={toc} variant="rail" />
            </aside>

            <div className="vx-artmain">
              {img ? (
                <figure className="vx-artimg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={article.title} />
                </figure>
              ) : null}

              {vc ? (
                <section className="vc-now" aria-label={`Check your ${vc.country} visa`}>
                  <div className="vc-now-head">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="vp-flag" src={flagFor(vc)} alt="" width={44} height={30} />
                    <div>
                      <span>Official {vc.country} visa check</span>
                      <b>{vc.portal}</b>
                    </div>
                  </div>
                  <ol className="vc-now-steps">
                    <li>Open the official portal below (type the address yourself).</li>
                    <li>Enter: {vc.need.join(", ")}.</li>
                    <li>Check that your name, passport number, visa type and validity match exactly.</li>
                  </ol>
                  <a className="vp-btn vp-btn-primary" href={vc.url} target="_blank" rel="noopener noreferrer nofollow">
                    Check on {vc.url.replace(/^https?:\/\//, "").replace(/\/.*$/, "")} ↗
                  </a>
                  {vc.app ? <p className="vc-app">Also: {vc.app}</p> : null}
                  <p className="vc-tip">{vc.tip}</p>
                </section>
              ) : null}
              <Toc items={toc} variant="inline" />

              <div id="article-body" className="article-content" dangerouslySetInnerHTML={{ __html: body }} />
              <ImgGuard scope=".vx-artmain" />

              {c ? (
                <section className="vx-facts" aria-label={`${c.name} key facts`}>
                  <div className="vx-facts-h">
                    <Flag emoji={c.flag} size={32} />
                    <div>
                      <span>Key facts</span>
                      <b>{c.name}</b>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>Permit</dt>
                      <dd>{c.permitType}</dd>
                    </div>
                    <div>
                      <dt>Processing</dt>
                      <dd>
                        {c.visaWeeks[0]}–{c.visaWeeks[1]} weeks
                      </dd>
                    </div>
                    <div>
                      <dt>EU / Schengen</dt>
                      <dd>
                        {c.inEU ? "EU" : "Non-EU"} · {c.schengen ? "Schengen" : "outside Schengen"}
                      </dd>
                    </div>
                    <div>
                      <dt>Language</dt>
                      <dd>{c.language}</dd>
                    </div>
                  </dl>
                  <div className="vx-facts-a">
                    <a className="vx-btn" href={c.officialSource} target="_blank" rel="noopener noreferrer">
                      Official government source ↗
                    </a>
                    <Link className="vx-more" href={`${b}/countries/${c.slug}`}>
                      Salaries &amp; cost of living in {c.name} →
                    </Link>
                  </div>
                </section>
              ) : null}

              <p className="vx-callout">
                <b>Before you apply:</b> rules, fees and processing times change. Confirm every requirement with the official
                government portal{c ? ` for ${c.name}` : ""} or the embassy, and never pay an agent for a job offer you cannot
                verify. <Link href={`${b}#scams`}>Scam warning signs</Link>
              </p>

              <CiteBox url={`https://${site.domain}/${article.slug}`} title={article.title} site={site.name} date={article.created_at} />

              <p className="vx-artfoot">
                Page last reviewed {updated}. Spotted something out of date? <Link href={`${b}/contact`}>Tell us</Link>.
              </p>
            </div>
          </div>

          <div className="vx-wrap">
            <Related site={site} items={related} />
          </div>
        </article>
      </main>

      <Footer site={site} />
    </div>
  );
}
