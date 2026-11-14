import "./theme.css";
import "./ai.css";
import Link from "next/link";
import type { SiteHomeProps, Site, Article } from "@/lib/types";
import CostCalculator from "./CostCalculator";
import LivePrices from "./LivePrices";
import { StatusStrip, ChangesSummary, NewModels } from "./HomeWidgets";
import { Masthead, Footer } from "./Chrome";
import { aiFont } from "./fonts";
import { TOPICS, PROFESSIONS, TOOLS, PROMPT_PACKS, topicOf, bestMatch } from "./topics";
import { heroSrc, thumb } from "@/lib/img";

/* InfKey home — Data-first AI data product.
   Hero: one line, search, 4 entry tiles.
   Then: live prices, status strip, changes, new models.
   Blog sections smaller below. */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DataHero({ site }: { site: Site }) {
  const b = `/s/${site.id}`;
  return (
    <section className="data-hero">
      <div className="data-hero-in">
        <p className="tagline">Updated daily · Verified from official sources</p>
        <h1>
          Live prices, status &amp; specs for <span className="count">445+</span> AI models
        </h1>
        <form className="hero-search" action={`${b}/models`} role="search">
          <input
            name="q"
            type="search"
            placeholder="Search models… GPT-4o, Claude, Gemini…"
            aria-label="Search AI models"
          />
          <button type="submit">Search</button>
        </form>
        <div className="entry-tiles">
          <Link href={`${b}/models`} className="entry-tile">
            <span className="tile-icon">$</span>
            <h3>AI Prices</h3>
            <p>Per-token pricing for 445+ models</p>
          </Link>
          <Link href={`${b}/compare`} className="entry-tile">
            <span className="tile-icon">⚖</span>
            <h3>Compare</h3>
            <p>Side-by-side model comparisons</p>
          </Link>
          <Link href={`${b}/status`} className="entry-tile">
            <span className="tile-icon">●</span>
            <h3>Is It Down?</h3>
            <p>Live status for 9 AI services</p>
          </Link>
          <Link href={`${b}/run`} className="entry-tile">
            <span className="tile-icon">▸</span>
            <h3>Can I Run It?</h3>
            <p>GPU memory calculator</p>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Professions({ site, articles }: { site: Site; articles: Article[] }) {
  const b = `/s/${site.id}`;
  return (
    <section className="ai-sec" id="best-ai-for">
      <div className="ai-head">
        <h2>
          Best AI for <span className="ai-grad">your job</span>
        </h2>
        <p>Pick your role — we test the tools and tell you which one actually helps.</p>
      </div>
      <div className="ai-prof">
        {PROFESSIONS.map((p) => {
          const a = bestMatch(articles, ["best", "ai", p.k.toLowerCase().replace(/s$/, "")]);
          const href = a ? `${b}/${a.slug}` : `${b}/search?q=${encodeURIComponent(`best ai for ${p.k.toLowerCase()}`)}`;
          return (
            <Link key={p.k} href={href} className="ai-glass ai-prof-card">
              <span className="ai-emoji" aria-hidden="true">
                {p.e}
              </span>
              <b>{p.k}</b>
              <small>{a ? "Read the guide →" : "Explore →"}</small>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Prompts({ site, articles }: { site: Site; articles: Article[] }) {
  const b = `/s/${site.id}`;
  return (
    <section className="ai-sec" id="prompt-library">
      <div className="ai-head">
        <h2>
          Viral <span className="ai-grad">prompt library</span>
        </h2>
        <p>Copy-paste prompts for the AI photo trends, editing, study and work — tested on ChatGPT, Gemini and more.</p>
      </div>
      <div className="ai-prompts">
        {PROMPT_PACKS.map((p) => {
          const a = bestMatch(articles, p.q.split(" ").filter((w) => w.length > 3));
          const href = a ? `${b}/${a.slug}` : `${b}/search?q=${encodeURIComponent(p.q)}`;
          return (
            <Link key={p.k} href={href} className="ai-glass ai-prompt-card">
              <span className="ai-emoji" aria-hidden="true">
                {p.e}
              </span>
              <b>{p.k}</b>
              <code>&gt; {p.q}</code>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Tools({ site, articles }: { site: Site; articles: Article[] }) {
  const b = `/s/${site.id}`;
  return (
    <section className="ai-sec" id="use-free">
      <div className="ai-head">
        <h2>
          Use the top AIs <span className="ai-grad">free</span>
        </h2>
        <p>Free plans, limits, tips and the cheapest way to upgrade — for every major assistant.</p>
      </div>
      <div className="ai-tools">
        {TOOLS.map((t) => {
          const a = bestMatch(articles, [t.q, "free"]) || bestMatch(articles, ["how", t.q]) || bestMatch(articles, [t.q]);
          const href = a ? `${b}/${a.slug}` : `${b}/search?q=${encodeURIComponent(`how to use ${t.q} free`)}`;
          return (
            <Link key={t.name} href={href} className="ai-glass ai-tool" style={{ ["--tc" as string]: t.color }}>
              <span className="ai-tool-mark" aria-hidden="true">
                {t.name[0]}
              </span>
              <span>
                <b>{t.name}</b>
                <small>by {t.by}</small>
              </span>
              <i aria-hidden="true">→</i>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Card({ site, a, big = false }: { site: Site; a: Article; big?: boolean }) {
  const href = `/s/${site.id}/${a.slug}`;
  return (
    <article className={`ai-card${big ? " big" : ""}`}>
      <Link href={href} className="ai-card-media" tabIndex={-1} aria-label={a.title}>
        {a.image_url ? (big
          ? <img src={heroSrc(a.image_url, a.title)} alt={a.title} fetchPriority="high" />
          : <img src={thumb(a.image_url, a.title)} alt={a.title} loading="lazy" decoding="async" />) : <span className="ai-card-ph" aria-hidden="true">✦</span>}
        <span className="ai-tag">{topicOf(a).label}</span>
      </Link>
      <div className="ai-card-body">
        <h3>
          <Link href={href}>{a.title}</Link>
        </h3>
        {big && a.excerpt ? <p>{a.excerpt}</p> : null}
        <span className="ai-meta">
          {formatDate(a.created_at)} · {a.reading_time} min read
        </span>
      </div>
    </article>
  );
}

function Trending({ site, articles }: { site: Site; articles: Article[] }) {
  if (!articles.length) return null;
  const [lead, ...rest] = articles;
  return (
    <section className="ai-sec" id="guides">
      <div className="ai-head">
        <h2>
          <span className="ai-live" /> Trending now
        </h2>
        <p>The AI questions people are searching this week.</p>
      </div>
      <div className="ai-trend">
        <Card site={site} a={lead} big />
        <div className="ai-trend-list">
          {rest.slice(0, 4).map((a) => (
            <Card site={site} a={a} key={a.id} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Rails({ site, articles, skip }: { site: Site; articles: Article[]; skip: Set<string> }) {
  return (
    <>
      {TOPICS.map((t) => {
        const list = articles.filter((a) => !skip.has(a.id) && topicOf(a).key === t.key).slice(0, 6);
        if (!list.length) return null;
        return (
          <section className="ai-sec" key={t.key} id={t.key}>
            <div className="ai-head row">
              <div>
                <h2>{t.label}</h2>
                <p>{t.blurb}</p>
              </div>
            </div>
            <div className="ai-grid">
              {list.map((a) => (
                <Card site={site} a={a} key={a.id} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function Builders({ site }: { site: Site }) {
  const b = `/s/${site.id}`;
  return (
    <section className="ai-sec ai-builders" id="calculator">
      <div className="ai-builders-copy">
        <span className="ai-pill">For builders</span>
        <h2>
          Know the <span className="ai-grad">real API cost</span> before you build
        </h2>
        <p>Verified per-token pricing, the math shown, and the cheapest model for your workload.</p>
        <div className="ai-builders-links">
          <Link href={`${b}/calculators`}>Cost calculators →</Link>
          <Link href={`${b}/models`}>Model database →</Link>
          <Link href={`${b}/compare`}>Compare models →</Link>
        </div>
      </div>
      <div className="ai-builders-calc">
        <CostCalculator />
      </div>
    </section>
  );
}

export default function Home({ site, articles }: SiteHomeProps) {
  const real = articles.filter((a) => !a.is_mock);
  const trending = real.slice(0, 5);
  const skip = new Set(trending.map((a) => a.id));
  return (
    <div className={`ai-root ${aiFont.variable}`}>
      <a href="#live-prices" className="skip-link">
        Skip to data
      </a>
      <Masthead site={site} />
      <main>
        <DataHero site={site} />
        <div className="shell">
          {/* Status strip — all 9 services as colored pills */}
          <StatusStrip site={site} />
          
          {/* Live API prices table */}
          <LivePrices site={site} />
          
          {/* Today's price changes summary */}
          <ChangesSummary site={site} />
          
          {/* New models this week */}
          <NewModels site={site} />
          
          {/* Old article sections — smaller, below data */}
          <Trending site={site} articles={trending} />
          <Prompts site={site} articles={real} />
          <Professions site={site} articles={real} />
          <Tools site={site} articles={real} />
          <Rails site={site} articles={real} skip={skip} />
          <Builders site={site} />
        </div>
      </main>
      <Footer site={site} />
    </div>
  );
}
