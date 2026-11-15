import CiteBox from "@/lib/CiteBox";
import Link from "next/link";
import type { SiteArticleProps, TocItem } from "@/lib/types";
import { GcShell, GuideCard, Icon } from "./Chrome";
import { countryOf, topicOf, flag } from "./data";
import { heroSrc } from "@/lib/img";

function fmt(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Body clean-up. Writer-inserted Wikimedia photos sometimes point at
 *  thumb.wikimedia.org (does not serve files) or at oversized thumbs; send them to
 *  upload.wikimedia.org at 960px. Invented /assets/images/* charts were never
 *  uploaded — drop them. Any other image that fails hides its whole figure, so a
 *  failed photo never leaves a blank gap with an orphan caption. */
function cleanBody(html: string): string {
  return html
    .replace(
      /https:\/\/(?:upload|thumb)\.wikimedia\.org(\/wikipedia\/commons\/thumb\/[^"'\s]+\/)(\d+)px-([^"'?\s/]+)(\?[^"'\s]*)?/g,
      (_m, path: string, w: string, file: string) => `https://upload.wikimedia.org${path}${Number(w) >= 960 ? 960 : Number(w) >= 500 ? 500 : 330}px-${file}`,
    )
    .replace(/<figure[^>]*>\s*<img[^>]*src="\/assets\/images\/[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, "")
    .replace(/<img[^>]*src="\/assets\/images\/[^"]*"[^>]*>/gi, "")
    .replace(/<img(?![^>]*onerror)/gi, `<img onerror="var f=this.closest('figure');(f||this).style.display='none'"`);
}

/** Level-2 headings only, each title once (the writer sometimes repeats
 *  "Key takeaways" / "FAQ" blocks). */
function tocOf(toc: TocItem[]): TocItem[] {
  const seen = new Set<string>();
  return toc.filter((x) => {
    if (x.level > 2) return false;
    const k = x.text.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export default function Article({ site, article, related, bodyHtml, toc }: SiteArticleProps) {
  const b = `/s/${site.id}`;
  const c = countryOf(article);
  const t = topicOf(article);
  const items = tocOf(toc);
  const showToc = items.length > 2;
  const tocList = (
    <ol>
      {items.map((x) => (
        <li key={x.id}>
          <a href={`#${x.id}`}>{x.text}</a>
        </li>
      ))}
    </ol>
  );
  return (
    <GcShell site={site}>
      <article className="gv-art">
        <header className="gv-art-head">
          <div className="gv-wrap gv-art-wrap">
            <nav className="gv-crumbs" aria-label="Breadcrumb">
              <Link href={b}>Home</Link>
              <span aria-hidden="true">/</span>
              {c ? (
                <>
                  <Link href={`${b}/country/${c.slug}`}>{c.name}</Link>
                  <span aria-hidden="true">/</span>
                </>
              ) : null}
              <span>{t.label}</span>
            </nav>
            <h1>{article.title}</h1>
            {article.excerpt ? <p className="gv-dek">{article.excerpt}</p> : null}
            <div className="gv-art-meta">
              {c ? (
                <span className="gv-kicker">
                  <img src={flag(c.iso, 40)} alt="" width={16} height={11} />
                  {c.name}
                </span>
              ) : null}
              <span>Updated {fmt(article.created_at)}</span>
              <span>{article.reading_time} min read</span>
            </div>
          </div>
        </header>

        <div className="gv-wrap gv-art-wrap gv-art-grid">
          <div className="gv-art-main">
            {article.image_url ? (
              <figure className="gv-art-hero">
                <img src={heroSrc(article.image_url, article.title)} alt={article.title} fetchPriority="high" />
              </figure>
            ) : null}
            {showToc ? (
              <details className="gv-toc-m">
                <summary>
                  On this page <Icon name="chev" size={16} />
                </summary>
                {tocList}
              </details>
            ) : null}
            <div className="article-content gc-content gv-content" dangerouslySetInnerHTML={{ __html: cleanBody(bodyHtml) }} />
            <div className="gv-verify">
              <b>Before you apply or pay</b>
              <span>
                Rules and fees in the Gulf change often. Confirm on the official portal
                {c ? (
                  <>
                    {" "}
                    —{" "}
                    <a href={c.portals[0].url} target="_blank" rel="noopener nofollow">
                      {c.portals[0].label}
                    </a>
                  </>
                ) : null}
                .
              </span>
            </div>
            <CiteBox url={`https://${site.domain}/${article.slug}`} title={article.title} site={site.name} date={article.created_at} />
          </div>

          <aside className="gv-art-side">
            {c ? (
              <div className="gv-facts">
                <div className="gv-facts-h">
                  <img src={flag(c.iso, 80)} alt="" width={24} height={16} />
                  <b>{c.name} at a glance</b>
                </div>
                <dl>
                  <div>
                    <dt>Currency</dt>
                    <dd>
                      {c.code}
                      {c.pegged ? ` · ${c.perUsd}/US$` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>{c.utc}</dd>
                  </div>
                  <div>
                    <dt>Weekend</dt>
                    <dd>{c.weekend}</dd>
                  </div>
                  <div>
                    <dt>Emergency</dt>
                    <dd>{c.emergency}</dd>
                  </div>
                  <div>
                    <dt>Calling code</dt>
                    <dd>{c.calling}</dd>
                  </div>
                </dl>
                <Link href={`${b}/country/${c.slug}`} className="gv-btn">
                  All {c.name} guides <Icon name="arrow" size={16} />
                </Link>
              </div>
            ) : null}
            {showToc ? (
              <nav className="gv-toc" aria-label="On this page">
                <b>On this page</b>
                {tocList}
              </nav>
            ) : null}
          </aside>
        </div>
      </article>

      {related.length ? (
        <section className="gv-wrap gv-sec gv-next">
          <div className="gv-sechead">
            <h2>Read next</h2>
          </div>
          <div className="gv-cards">
            {related.slice(0, 4).map((r) => (
              <GuideCard site={site} a={r} key={r.id} />
            ))}
          </div>
        </section>
      ) : null}
    </GcShell>
  );
}
