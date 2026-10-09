import "./theme.css";
import "./ai.css";
import Link from "next/link";
import type { Article, Site } from "@/lib/types";
import { InfShell } from "./Chrome";
import { topicOf, PROMPT_PACKS } from "./topics";

/* InfKey search — AI-style results page. When nothing matches yet, it says so
   honestly and points to the closest pillars instead of a dead end. */
export default function Search({ site, q, results }: { site: Site; q: string; results: Article[] }) {
  const b = `/s/${site.id}`;
  return (
    <InfShell site={site}>
      <section className="ai-sec">
        <div className="ai-head">
          <h1 style={{ fontSize: "clamp(30px,4vw,46px)", margin: 0, color: "#fff" }}>
            {q ? (
              <>
                Results for <span className="ai-grad">“{q}”</span>
              </>
            ) : (
              "Ask InfKey"
            )}
          </h1>
          <p>{q ? `${results.length} guide(s) found.` : "Search prompts, AI tools, how-tos and prices."}</p>
        </div>
        <form className="ai-prompt" action={`${b}/search`} role="search" style={{ margin: "0 0 28px" }}>
          <span className="ai-spark" aria-hidden="true">
            ✦
          </span>
          <input name="q" type="search" defaultValue={q} placeholder="e.g. viral ai video prompt" aria-label="Search" />
          <button type="submit">Search</button>
        </form>
        {results.length ? (
          <div className="ai-grid">
            {results.map((a) => (
              <article className="ai-card" key={a.id}>
                <Link href={`${b}/${a.slug}`} className="ai-card-media" tabIndex={-1} aria-label={a.title}>
                  {a.image_url ? <img src={a.image_url} alt="" loading="lazy" /> : <span className="ai-card-ph">✦</span>}
                  <span className="ai-tag">{topicOf(a).label}</span>
                </Link>
                <div className="ai-card-body">
                  <h3>
                    <Link href={`${b}/${a.slug}`}>{a.title}</Link>
                  </h3>
                  <span className="ai-meta">{a.reading_time} min read</span>
                </div>
              </article>
            ))}
          </div>
        ) : q ? (
          <div className="ai-glass" style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0, color: "#fff" }}>This guide is being written</h2>
            <p style={{ color: "var(--muted)" }}>
              We publish new AI guides every day and this topic is in the queue. Meanwhile, try one of these:
            </p>
            <div className="ai-chips" style={{ justifyContent: "flex-start" }}>
              {PROMPT_PACKS.slice(0, 6).map((p) => (
                <Link key={p.q} href={`${b}/search?q=${encodeURIComponent(p.q)}`}>
                  {p.q}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </InfShell>
  );
}
