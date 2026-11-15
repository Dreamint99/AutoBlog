import "./v2.css";
import Link from "next/link";
import type { Article, Site } from "@/lib/types";
import { InfShell } from "./Chrome";
import { topicOf, PROMPT_PACKS } from "./topics";
import { thumb } from "@/lib/img";

/* InfKey guide search. When nothing matches yet it says so and offers close topics instead of a dead end.
   (Model prices have their own instant filter on /models.) */
export default function Search({ site, q, results }: { site: Site; q: string; results: Article[] }) {
  const b = `/s/${site.id}`;
  return (
    <InfShell site={site}>
      <header className="page-head">
        <div className="article-cat">Search guides</div>
        <h1 className="page-title">{q ? <>Results for “{q}”</> : "Search InfKey guides"}</h1>
        <p className="page-dek">
          {q ? `${results.length} guide${results.length === 1 ? "" : "s"} found. ` : ""}
          Looking for a model&apos;s price? <Link href={`${b}/models${q ? `?q=${encodeURIComponent(q)}` : ""}`}>Search the model database</Link>.
        </p>
      </header>
      <form className="ik-sform" action={`${b}/search`} role="search">
        <input name="q" type="search" defaultValue={q} placeholder="e.g. cheapest coding model" aria-label="Search guides" />
        <button type="submit">Search</button>
      </form>
      {results.length ? (
        <div className="grid">
          {results.map((a) => (
            <article className="card" key={a.id}>
              <Link href={`${b}/${a.slug}`} className="card-media" tabIndex={-1} aria-label={a.title}>
                <span className="card-cat">{topicOf(a).label}</span>
                {a.image_url ? <img src={thumb(a.image_url, a.title)} alt={a.title} loading="lazy" decoding="async" /> : null}
              </Link>
              <div className="card-body">
                <h3 className="card-title">
                  <Link href={`${b}/${a.slug}`}>{a.title}</Link>
                </h3>
                <div className="card-foot">{a.reading_time} min read</div>
              </div>
            </article>
          ))}
        </div>
      ) : q ? (
        <div className="spec-block">
          <h2 className="block-h">No guide on this yet. Try:</h2>
          <div className="vs-links">
            {PROMPT_PACKS.slice(0, 6).map((p) => (
              <Link className="vs-link" key={p.q} href={`${b}/search?q=${encodeURIComponent(p.q)}`}>
                {p.q}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </InfShell>
  );
}
