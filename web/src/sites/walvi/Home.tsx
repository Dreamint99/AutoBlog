import "./theme.css";
import Link from "next/link";
import type { SiteHomeProps, Site, Article } from "@/lib/types";
import {
  COUNTRIES,
  JOBS,
  DATA_VERIFIED,
  estimate,
  salariesForJob,
  topSavings,
  countriesLite,
  eur,
} from "@/lib/walvi";
import SalaryCalculator from "./SalaryCalculator";
import { Masthead, Footer, StarRing } from "./Chrome";
import { CountryCard, JobCard } from "./data-ui";

const COVERAGE = [
  { ico: "💶", h: "Salary by country", p: "Monthly gross, net after tax, living cost and realistic savings for every country in the register.", href: "/countries", tags: ["Gross", "Net", "Savings"] },
  { ico: "🛠️", h: "Jobs in demand", p: "Electrician, welder, driver, cook and more — pay and demand ranked across Europe.", href: "/jobs", tags: ["Skilled", "Shortage"] },
  { ico: "🧮", h: "Salary & savings tools", p: "Estimate net pay and monthly savings, and compare two countries for the same job.", href: "/tools", tags: ["Estimator", "Compare"] },
  { ico: "🛂", h: "Work-permit guides", p: "Step-by-step routes from Asia and the Gulf to Europe — documents, cost, timeline and scam warnings.", href: "/guides", tags: ["Visa", "Official"] },
] as const;

const METHOD = [
  { n: "01", h: "Official sources", p: "Every country links its government or EU immigration portal to verify against." },
  { n: "02", h: "Estimates marked", p: "Salary and savings are modelled and clearly labelled — never passed off as official quotes." },
  { n: "03", h: "Savings, not just pay", p: "We show what you keep after rent, food and transport — the figure that decides a move." },
  { n: "04", h: "Scam-aware", p: "We flag fake-offer red flags and tell you to confirm before paying any fee." },
] as const;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function categoryOf(article: Article): string {
  const tag = article.tags.find((t) => t.trim().length > 0);
  return (tag ?? article.keyword ?? "Guide").toUpperCase();
}

function Hero({ site }: { site: Site }) {
  const best = topSavings(1)[0];
  return (
    <section className="hero-band">
      <div className="hero-inner">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-flag">
              <StarRing />
              European Work, Salary &amp; Visa Intelligence
            </span>
            <h1>
              Know the <span className="grad">real money</span> before you move.
            </h1>
            <p className="hero-sub">
              Compare skilled-trade jobs, salaries and living costs across Europe, estimate what you
              would actually save each month, and check work-permit routes — with sourced data and
              honest estimates, not recruiter hype.
            </p>
            <div className="hero-actions">
              <Link href={`/s/${site.id}/countries`} className="btn btn-primary">
                Browse the country register
              </Link>
              <a href="#estimator" className="btn btn-ghost">
                Open the estimator
              </a>
            </div>
            <div className="hero-meta">
              <div className="hm">
                <b>{COUNTRIES.length}</b>
                countries covered
              </div>
              <div className="hm">
                <b>{JOBS.length}</b>
                in-demand occupations
              </div>
              <div className="hm">
                <b>{eur(best.savingsHousedEUR)}/mo</b>
                top modelled saving ({best.country.name})
              </div>
            </div>
          </div>
          <div className="hero-emblem" aria-hidden="true">
            <div className="ring">
              <StarRing stroke />
              <span className="em-core">
                Wal<b>vi</b>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Notice() {
  return (
    <div className="notice">
      <span className="ni" aria-hidden="true">
        ⚠️
      </span>
      <span>
        <b>Independent resource — figures are indicative estimates.</b> Salaries and savings are
        modelled, not official quotes, and visa rules are summarised for guidance only. Always confirm
        with the official national or EU source before acting, and never pay for an unverified job offer.
      </span>
    </div>
  );
}

function Coverage({ site }: { site: Site }) {
  const b = `/s/${site.id}`;
  return (
    <section id="coverage">
      <div className="section-head">
        <h2>What Walvi covers</h2>
        <span className="rule" />
        <span className="count">4 services</span>
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

function Countries({ site }: { site: Site }) {
  return (
    <section id="countries">
      <div className="section-head">
        <h2>Country register</h2>
        <span className="rule" />
        <span className="count">{COUNTRIES.length} destinations</span>
      </div>
      <p className="lead">
        Salary, net pay, cost of living, realistic savings and the work-permit route for each country —
        every entry linking an official source to verify against.
      </p>
      <div className="tile-grid">
        {COUNTRIES.map((c) => {
          const minGross = Math.min(...JOBS.map((j) => estimate(c, j).grossEUR));
          return <CountryCard key={c.id} site={site} country={c} headline={`${eur(minGross)}/mo`} />;
        })}
      </div>
    </section>
  );
}

function Jobs({ site }: { site: Site }) {
  return (
    <section id="jobs">
      <div className="section-head">
        <h2>Occupations in demand</h2>
        <span className="rule" />
        <span className="count">{JOBS.length} trades</span>
      </div>
      <div className="tile-grid">
        {JOBS.map((j) => {
          const bestJob = salariesForJob(j)[0];
          return <JobCard key={j.id} site={site} job={j} headline={`${eur(bestJob.savingsHousedEUR)}/mo`} />;
        })}
      </div>
    </section>
  );
}

function Estimator() {
  return (
    <section id="estimator">
      <div className="section-head">
        <h2>Salary &amp; savings estimator</h2>
        <span className="rule" />
        <span className="count">free tool</span>
      </div>
      <p className="lead">
        Enter a real monthly wage and a country to see net pay, realistic monthly savings and an
        approximate figure in BDT. The accommodation toggle reflects the single biggest savings lever
        for imported workers.
      </p>
      <SalaryCalculator
        countries={countriesLite()}
        verifiedOn={new Date(DATA_VERIFIED).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
      />
    </section>
  );
}

function Savings() {
  const top = topSavings(6);
  return (
    <section id="savings">
      <div className="section-head">
        <h2>Where workers save the most</h2>
        <span className="rule" />
        <span className="count">housed · after costs</span>
      </div>
      <div className="savings">
        {top.map((e) => (
          <div className="save-card" key={`${e.country.id}-${e.job.id}`}>
            <div className="combo">
              <span className="flag" aria-hidden="true">
                {e.country.flag}
              </span>
              {e.job.name} in {e.country.name}
            </div>
            <div className="amt">
              {eur(e.savingsHousedEUR)} <small>/mo saved</small>
            </div>
            <div className="sub">
              {eur(e.netEUR)} net · {eur(e.grossEUR)} gross · employer housing
            </div>
          </div>
        ))}
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
        <h2>Latest guides</h2>
        <span className="rule" />
        <span className="count">{String(articles.length).padStart(2, "0")} reads</span>
      </div>
      {articles.length === 0 ? (
        <div className="empty">
          <div className="empty-mark" aria-hidden="true">
            🧭
          </div>
          <h2>Guides landing soon</h2>
          <p>Salary breakdowns, work-permit walkthroughs and scam warnings are on the way. Try the estimator above.</p>
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
        <h2>Methodology &amp; sources</h2>
        <span className="rule" />
        <span className="count">how we keep it honest</span>
      </div>
      <div className="method">
        <h3>Sourced where we can, honest where we can&apos;t.</h3>
        <p>
          Walvi is a data resource, not a recruiter. Where a number is official, we link the source.
          Where it is modelled, we say so. And we always show savings after real living costs — because
          that is the figure that decides whether a move abroad is worth it.
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
      <a href="#countries" className="skip-link">
        Skip to country register
      </a>
      <Masthead site={site} />
      <Hero site={site} />
      <main>
        <div className="shell">
          <Notice />
          <Coverage site={site} />
          <Countries site={site} />
          <Jobs site={site} />
          <Estimator />
          <Savings />
          <Guides site={site} articles={articles} />
          <Method />
        </div>
      </main>
      <Footer site={site} />
    </>
  );
}
