import Link from "next/link";
import type { SiteArticleProps } from "@/lib/types";
import { GcShell } from "./Chrome";
import { countryOf, topicOf, flag } from "./data";

function fmt(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function Article({ site, article, related, bodyHtml, toc }: SiteArticleProps) {
  const b = `/s/${site.id}`;
  const c = countryOf(article);
  const t = topicOf(article);
  return (
    <GcShell site={site}>
      <article className="gc-art">
        <header className="gc-art-head">
          <div className="gc-wrap">
            <nav className="gc-crumbs" aria-label="Breadcrumb">
              <Link href={b}>Home</Link>
              <span>›</span>
              {c ? (
                <>
                  <Link href={`${b}/country/${c.slug}`}>{c.name}</Link>
                  <span>›</span>
                </>
              ) : null}
              <span>{t.label}</span>
            </nav>
            <span className="gc-badge solid">
              {c ? <img src={flag(c.iso, 40)} alt="" width={16} height={11} /> : null}
              {t.icon} {t.label}
            </span>
            <h1>{article.title}</h1>
            {article.excerpt ? <p className="gc-dek">{article.excerpt}</p> : null}
            <div className="gc-art-meta">
              <span>Updated {fmt(article.created_at)}</span>
              <span>·</span>
              <span>{article.reading_time} min read</span>
            </div>
          </div>
        </header>
        <div className="gc-wrap gc-art-grid">
          <div className="gc-art-main">
            {article.image_url ? (
              <figure className="gc-art-hero">
                <img src={article.image_url} alt={article.title} />
              </figure>
            ) : null}
            {toc.length > 2 ? (
              <details className="gc-toc" open>
                <summary>On this page</summary>
                <ol>
                  {toc
                    .filter((x) => x.level <= 2)
                    .map((x) => (
                      <li key={x.id}>
                        <a href={`#${x.id}`}>{x.text}</a>
                      </li>
                    ))}
                </ol>
              </details>
            ) : null}
            <div className="article-content gc-content" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            <div className="gc-verify">
              <b>Before you apply or pay:</b> rules and fees in the Gulf change often. Confirm on the official portal
              {c ? (
                <>
                  {" "}
                  — e.g.{" "}
                  <a href={c.portals[0].url} target="_blank" rel="noopener nofollow">
                    {c.portals[0].label}
                  </a>
                </>
              ) : null}
              .
            </div>
          </div>
          <aside className="gc-art-side">
            {c ? (
              <div className="gc-card gc-factbox" style={{ ["--ca" as string]: c.accent }}>
                <div className="gc-card-h">
                  <img src={flag(c.iso, 80)} alt="" width={28} height={19} />
                  <b>{c.name} at a glance</b>
                </div>
                <dl>
                  <div>
                    <dt>Currency</dt>
                    <dd>
                      {c.code}
                      {c.pegged ? ` · ${c.perUsd} per US$` : ""}
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
                <Link href={`${b}/country/${c.slug}`} className="gc-btn">
                  All {c.name} guides →
                </Link>
              </div>
            ) : null}
            {related.length ? (
              <div className="gc-card">
                <div className="gc-card-h">
                  <b>Read next</b>
                </div>
                <ul className="gc-next">
                  {related.slice(0, 5).map((r) => (
                    <li key={r.id}>
                      <Link href={`${b}/${r.slug}`}>{r.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </article>
    </GcShell>
  );
}
