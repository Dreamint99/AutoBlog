import "./theme.css";
import "./ai.css";
import Link from "next/link";
import type { SiteHomeProps, Site, Article } from "@/lib/types";
import CostCalculator from "./CostCalculator";
import { Masthead, Footer } from "./Chrome";
import { aiFont } from "./fonts";
import { TOPICS, PROFESSIONS, TOOLS, PROMPT_PACKS, topicOf, bestMatch } from "./topics";

/* InfKey home — "AI tools, explained". Prompt-style search hero, Best-AI-for
   profession grid, free-use tool cards, trending guides and topic rails, with
   the original API cost calculator kept as its own section. */

const ROTATE = ["students", "doctors", "teachers", "lawyers", "developers", "marketers", "writers", "small business"];
const CHIPS = ["viral ai photo prompt", "gemini photo editing prompt", "best ai for students", "how to use claude free", "chatgpt plus worth it", "gemini vs chatgpt"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Hero({ site, count }: { site: Site; count: number }) {
  const b = `/s/${site.id}`;
  return (
    <section className="ai-hero">
      <div className="ai-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="ai-hero-in">
        <span className="ai-pill">
          <span className="ai-dot" /> {count} AI guides · updated daily
        </span>
        <h1>
          The best AI for
          <span className="ai-rotate" aria-hidden="true">
            <span>
              {[...ROTATE, ROTATE[0]].map((w, i) => (
                <b key={i}>{w}</b>
              ))}
            </span>
          </span>
          <span className="ai-sr">students, doctors, teachers, lawyers and everyone</span>
        </h1>
        <p className="ai-sub">
          What to use, how to use it free, and what it really costs — tested AI tool guides for real people, plus verified API pricing for builders.
        </p>
        <form className="ai-prompt" action={`${b}/search`} role="search">
          <span className="ai-spark" aria-hidden="true">
            ✦
          </span>
          <input name="q" type="search" placeholder="Ask anything… e.g. best AI for doctors" aria-label="Search AI guides" />
          <button type="submit">Search</button>
        </form>
        <div className="ai-chips">
          {CHIPS.map((c) => (
            <Link key={c} href={`${b}/search?q=${encodeURIComponent(c)}`}>
              {c}
            </Link>
          ))}
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
        {a.image_url ? <img src={a.image_url} alt="" loading="lazy" /> : <span className="ai-card-ph" aria-hidden="true">✦</span>}
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
      <a href="#guides" className="skip-link">
        Skip to guides
      </a>
      <Masthead site={site} />
      <main>
        <Hero site={site} count={real.length} />
        <div className="shell">
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
