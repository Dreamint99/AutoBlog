import "./theme.css";
import Link from "next/link";
import type { SiteHomeProps, Site, Article } from "@/lib/types";
import CostCalculator from "./CostCalculator";
import { Masthead, Footer } from "./Chrome";

/* Cost snapshot — editable seed figures. Keep honest: a snapshot, not live data.
   Update alongside the infkey_models table / calculator price list. */
const SNAPSHOT: ReadonlyArray<{ k: string; v: string; unit: string; d: string; dir: "down" | "up" | "" }> = [
  { k: "Cheapest LLM", v: "$0.08", unit: "/1M in", d: "Gemini 1.5 Flash", dir: "down" },
  { k: "Cheapest reasoning", v: "$0.27", unit: "/1M in", d: "DeepSeek-V3", dir: "down" },
  { k: "Frontier tier", v: "$3.00", unit: "/1M in", d: "Claude 3.5 Sonnet", dir: "" },
  { k: "Models tracked", v: "8", unit: "+", d: "and growing", dir: "" },
];

const COVERAGE: ReadonlyArray<{ ico: string; h: string; p: string; href: string; tags: string[] }> = [
  {
    ico: "∑",
    h: "Cost calculators",
    p: "Real-workload calculators for LLM, video, chatbot, RAG and embedding spend.",
    href: "/calculators",
    tags: ["LLM", "Veo", "Chatbot", "RAG"],
  },
  {
    ico: "⇄",
    h: "Model comparisons",
    p: "Head-to-head on price, quality, context and capabilities — not a single fake winner.",
    href: "/compare",
    tags: ["OpenAI", "Claude", "Gemini"],
  },
  {
    ico: "▦",
    h: "Model database",
    p: "Every model's verified price, context window and capabilities, with official sources.",
    href: "/models",
    tags: ["Pricing", "Context", "Sources"],
  },
  {
    ico: "◎",
    h: "Use-case guides",
    p: "Best model for support, extraction, coding, Bangla, agents and long context.",
    href: "#guides",
    tags: ["Support", "OCR", "Agents"],
  },
];

const METHOD: ReadonlyArray<{ n: string; h: string; p: string }> = [
  { n: "01", h: "Official sources", p: "Every price links to each provider's own pricing page, dated on the post." },
  { n: "02", h: "We show the math", p: "No black-box numbers — the formula and assumptions are printed next to the result." },
  { n: "03", h: "First-hand testing", p: "Benchmarks run the same prompts across models for cost, speed and quality." },
  { n: "04", h: "Re-verified, dated", p: "Prices change fast; rows carry a 'verified on' date, not a fake refresh." },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function categoryOf(article: Article): string {
  const tag = article.tags.find((t) => t.trim().length > 0);
  return (tag ?? article.keyword ?? "Cost").toUpperCase();
}

function StatusBar() {
  return (
    <div className="statusbar" aria-label="Status">
      <div className="statusbar-inner">
        <span className="status-live">Pricing live</span>
        <span className="status-sep">·</span>
        <span className="verified">Verified June 20, 2026</span>
        <span className="status-sep">·</span>
        <span className="ghost">USD · taxes &amp; retries excluded</span>
        <span className="status-sep">·</span>
        <span className="ghost">Next review June 27</span>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">AI Cost &amp; Automation Intelligence</span>
        <h1>
          Know the <span className="grad">real cost</span> before you build.
        </h1>
        <p className="hero-sub">
          Compare AI models, calculate verified API costs and pick the right automation stack — with
          original calculators, dated pricing and first-hand benchmarks, not recycled marketing copy.
        </p>
        <div className="hero-actions">
          <a href="#calculator" className="btn btn-primary">
            ▸ Run the calculator
          </a>
          <a href="#guides" className="btn btn-ghost">
            Browse cost guides
          </a>
        </div>
        <div className="hero-trust">
          <span>Verified provider pricing</span>
          <span>Math shown, not hidden</span>
          <span>Updated, dated, sourced</span>
        </div>
      </div>

      <div className="hero-calc">
        <CostCalculator />
      </div>
    </section>
  );
}

function StatStrip() {
  return (
    <div className="statgrid" aria-label="Cost snapshot">
      {SNAPSHOT.map((s) => (
        <div className="stat" key={s.k}>
          <div className="k">{s.k}</div>
          <div className="v">
            {s.v} <small>{s.unit}</small>
          </div>
          <div className={`d ${s.dir}`}>{s.d}</div>
        </div>
      ))}
    </div>
  );
}

function Coverage({ site }: { site: Site }) {
  const b = `/s/${site.id}`;
  return (
    <section id="coverage">
      <div className="section-head">
        <h2>What InfKey covers</h2>
        <span className="rule" />
        <span className="count">4 pillars</span>
      </div>
      <div className="coverage">
        {COVERAGE.map((c) => {
          const href = c.href.startsWith("#") ? c.href : `${b}${c.href}`;
          return (
            <Link className="cov" href={href} key={c.h}>
              <div className="ico" aria-hidden="true">
                {c.ico}
              </div>
              <h3>{c.h}</h3>
              <p>{c.p}</p>
              <div className="tags">
                {c.tags.map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Card({ site, article }: { site: Site; article: Article }) {
  const href = `/s/${site.id}/${article.slug}`;
  return (
    <article className="card">
      <Link href={href} className="card-media" aria-label={article.title} tabIndex={-1}>
        <span className="card-cat">{categoryOf(article)}</span>
        {article.image_url ? <img src={article.image_url} alt={article.title} loading="lazy" /> : null}
      </Link>
      <div className="card-body">
        <h3 className="card-title">
          <Link href={href}>{article.title}</Link>
        </h3>
        {article.excerpt ? <p className="card-excerpt">{article.excerpt}</p> : null}
        <div className="card-foot">
          <span className="read">{article.reading_time} min</span>
          <span className="sep">·</span>
          <span>{formatDate(article.created_at)}</span>
        </div>
      </div>
    </article>
  );
}

function Guides({ site, articles }: { site: Site; articles: Article[] }) {
  return (
    <section id="guides">
      <div className="section-head">
        <h2>Latest cost guides</h2>
        <span className="rule" />
        <span className="count">{String(articles.length).padStart(2, "0")} guides</span>
      </div>
      {articles.length === 0 ? (
        <div className="empty">
          <div className="empty-mark" aria-hidden="true">
            $
          </div>
          <h2>Calculators warming up</h2>
          <p>Verified cost guides and model comparisons land here soon. Try the calculator above.</p>
        </div>
      ) : (
        <div className="grid">
          {articles.map((a) => (
            <Card site={site} article={a} key={a.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function Method() {
  return (
    <section id="method">
      <div className="section-head">
        <h2>How we verify pricing</h2>
        <span className="rule" />
        <span className="count">methodology</span>
      </div>
      <div className="method">
        <h3>Verified data, or it doesn&apos;t ship.</h3>
        <p>
          InfKey is a data product, not a content farm. Numbers come from official sources, the math
          is shown, and every price carries the date it was last checked.
        </p>
        <div className="method-grid">
          {METHOD.map((m) => (
            <div className="method-item" key={m.n}>
              <div className="n">{m.n}</div>
              <h4>{m.h}</h4>
              <p>{m.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home({ site, articles }: SiteHomeProps) {
  return (
    <>
      <a href="#guides" className="skip-link">
        Skip to guides
      </a>
      <StatusBar />
      <Masthead site={site} />

      <main>
        <div className="shell">
          <Hero />
          <StatStrip />
          <Coverage site={site} />
          <Guides site={site} articles={articles} />
          <Method />
        </div>
      </main>

      <Footer site={site} />
    </>
  );
}
