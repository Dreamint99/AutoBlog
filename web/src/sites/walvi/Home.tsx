import Link from "next/link";
import type { SiteHomeProps, Site, Article } from "@/lib/types";
import { COUNTRIES, JOBS, DATA_VERIFIED, topSavings, countriesLite, eur } from "@/lib/walvi";
import SalaryCalculator from "./SalaryCalculator";
import { Masthead, Footer } from "./Chrome";
import QuickFinder from "./QuickFinder";
import { fontVars } from "./fonts";
import { countryOf, topicOf, fmtDate } from "./guide-meta";
import Flag from "./Flag";

const TASKS = [
  { h: "Check a work-permit route", p: "Permit type, processing time and the official portal for each country.", href: "/countries" },
  { h: "Compare salaries by job", p: "Electrician, welder, driver, cook and more — pay ranked across Europe.", href: "/jobs" },
  { h: "Estimate what you would save", p: "Net pay after tax, rent, food and transport — with or without housing.", href: "/tools" },
  { h: "Read step-by-step guides", p: "Documents, fees and timelines from Asia, Africa and the Gulf to Europe.", href: "/guides" },
  { h: "Spot a recruitment scam", p: "The warning signs of fake offers and agents — before you pay anything.", href: "#scams" },
  { h: "Find the official source", p: "Every country links its government immigration page to verify against.", href: "/countries" },
] as const;

const STEPS = [
  { h: "Get a genuine job offer", p: "A written contract from a real employer. Verify the company in the national business register." },
  { h: "The employer applies for your permit", p: "In most countries the employer files the work permit with the labour or immigration office first." },
  { h: "Book your visa appointment", p: "Apply for the national (type D) visa at the embassy or its official visa application centre." },
  { h: "Submit documents and biometrics", p: "Passport, permit approval, contract, qualifications, police certificate and insurance as required." },
  { h: "Travel and register", p: "Arrive within the visa dates, then register your address and collect your residence card." },
] as const;

const SCAMS = [
  "You are asked to pay a “job guarantee”, “visa processing” or placement fee to an agent.",
  "The offer comes by WhatsApp or social media with no verifiable employer or contract.",
  "The salary is far above the country’s typical pay for that job.",
  "You are told to enter on a tourist visa and “change it later”.",
  "The agent keeps your passport or asks for money to a personal account.",
] as const;

const METHOD = [
  { n: "1", h: "Official sources first", p: "Each country entry links its government or immigration portal." },
  { n: "2", h: "Estimates are labelled", p: "Salaries and savings are modelled ranges, never presented as quotes." },
  { n: "3", h: "Savings, not just pay", p: "We show what is left after rent, food and transport." },
  { n: "4", h: "Dated and reviewed", p: `Register figures last verified ${new Date(DATA_VERIFIED).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}.` },
] as const;

function GuideRow({ site, a }: { site: Site; a: Article }) {
  const c = countryOf(a);
  return (
    <li className="vp-guide">
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
        {a.excerpt ? <p>{a.excerpt}</p> : null}
        <span className="vp-date">Updated {fmtDate(a.created_at)} · {a.reading_time} min read</span>
      </div>
    </li>
  );
}

export default function Home({ site, articles }: SiteHomeProps) {
  const b = `/s/${site.id}`;
  const latest = articles.filter((a) => !a.is_mock).slice(0, 8);
  const savings = topSavings(8);
  const sorted = [...COUNTRIES].sort((x, y) => x.name.localeCompare(y.name));
  const inEU = COUNTRIES.filter((c) => c.inEU).length;

  return (
    <div className={fontVars}>
      <a href="#vp-main" className="skip-link">
        Skip to content
      </a>
      <Masthead site={site} />

      {/* ── HERO ── */}
      <section className="vp-hero">
        <div className="vp-wrap vp-hero-grid">
          <div>
            <span className="vp-eyebrow">Working abroad, explained</span>
            <h1>Work permits, visas and real salaries in Europe — checked and in plain language.</h1>
            <p className="vp-lede">
              Step-by-step routes, document checklists and what you would actually save each month in{" "}
              {COUNTRIES.length} countries. For workers from Bangladesh, South Asia, Africa and the Gulf — with the
              official government source linked on every country.
            </p>
            <div className="vp-hero-actions">
              <Link href={`${b}/countries`} className="vp-btn vp-btn-primary">
                Choose a country
              </Link>
              <a href="#estimator" className="vp-btn vp-btn-ghost">
                Estimate my savings
              </a>
            </div>
            <ul className="vp-facts">
              <li>
                <b>{COUNTRIES.length}</b> countries
              </li>
              <li>
                <b>{inEU}</b> in the EU
              </li>
              <li>
                <b>{JOBS.length}</b> trades covered
              </li>
              <li>
                <b>{articles.length}</b> guides
              </li>
            </ul>
          </div>
          <div className="vp-hero-panel">
            <QuickFinder
              siteId={site.id}
              countries={sorted.map((c) => ({ slug: c.slug, name: c.name, flag: c.flag }))}
              jobs={JOBS.map((j) => ({ slug: j.slug, name: j.name }))}
            />
          </div>
        </div>
      </section>

      <main id="vp-main">
        {/* ── TASKS ── */}
        <section className="vp-sec">
          <div className="vp-wrap">
            <h2 className="vp-h2">What do you need to do?</h2>
            <div className="vp-tasks">
              {TASKS.map((t) => (
                <Link className="vp-task" key={t.h} href={t.href.startsWith("#") ? `${b}${t.href}` : `${b}${t.href}`}>
                  <b>{t.h}</b>
                  <span>{t.p}</span>
                  <i aria-hidden="true">→</i>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── DESTINATIONS ── */}
        <section className="vp-sec vp-sec-alt" id="countries">
          <div className="vp-wrap">
            <div className="vp-sechead">
              <h2 className="vp-h2">Choose a destination</h2>
              <Link href={`${b}/countries`} className="vp-more">
                Full country register →
              </Link>
            </div>
            <ul className="vp-dest">
              {sorted.map((c) => (
                <li key={c.id}>
                  <Link href={`${b}/countries/${c.slug}`}>
                    <span className="vp-dest-flag">
                      <Flag emoji={c.flag} size={30} />
                    </span>
                    <span className="vp-dest-name">{c.name}</span>
                    <span className="vp-dest-meta">
                      {c.schengen ? "Schengen" : c.inEU ? "EU" : "Non-EU"} · visa {c.visaWeeks[0]}–{c.visaWeeks[1]} wks
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── PROCESS ── */}
        <section className="vp-sec">
          <div className="vp-wrap">
            <h2 className="vp-h2">How a European work permit usually works</h2>
            <p className="vp-sub">The exact steps differ by country — each country page lists its own permit type and official portal.</p>
            <ol className="vp-steps">
              {STEPS.map((s, i) => (
                <li key={s.h}>
                  <span className="vp-step-n">{i + 1}</span>
                  <div>
                    <b>{s.h}</b>
                    <p>{s.p}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── LATEST GUIDANCE + SAVINGS ── */}
        <section className="vp-sec vp-sec-alt" id="guides">
          <div className="vp-wrap vp-split">
            <div>
              <div className="vp-sechead">
                <h2 className="vp-h2">Latest guidance</h2>
                <Link href={`${b}/guides`} className="vp-more">
                  All {articles.length} guides →
                </Link>
              </div>
              {latest.length ? (
                <ul className="vp-guides">
                  {latest.map((a) => (
                    <GuideRow site={site} a={a} key={a.id} />
                  ))}
                </ul>
              ) : (
                <p className="vp-sub">New guides are on the way.</p>
              )}
            </div>
            <aside>
              <div className="vp-panel">
                <h3 className="vp-panel-h">Where workers save the most</h3>
                <p className="vp-panel-sub">Modelled monthly savings with employer housing.</p>
                <table className="vp-table">
                  <thead>
                    <tr>
                      <th>Job · country</th>
                      <th>Saved / month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savings.map((e) => (
                      <tr key={`${e.country.id}-${e.job.id}`}>
                        <td>
                          <Flag emoji={e.country.flag} size={20} /> {e.job.name}, {e.country.name}
                        </td>
                        <td>
                          <b>{eur(e.savingsHousedEUR)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Link href={`${b}/jobs`} className="vp-more">
                  Salary by job →
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {/* ── ESTIMATOR ── */}
        <section className="vp-sec" id="estimator">
          <div className="vp-wrap">
            <h2 className="vp-h2">Salary &amp; savings estimator</h2>
            <p className="vp-sub">
              Enter a real monthly wage and a country to see net pay, realistic monthly savings and an approximate figure
              in BDT. Employer housing is the single biggest savings lever.
            </p>
            <SalaryCalculator
              countries={countriesLite()}
              verifiedOn={new Date(DATA_VERIFIED).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            />
          </div>
        </section>

        {/* ── SCAMS ── */}
        <section className="vp-sec" id="scams">
          <div className="vp-wrap">
            <div className="vp-alert">
              <div className="vp-alert-head">
                <span aria-hidden="true">!</span>
                <h2>Recruitment scam warning signs</h2>
              </div>
              <ul>
                {SCAMS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <p>
                <b>Never pay for a job offer you cannot verify.</b> Check the employer and the permit with the official
                immigration authority of the destination country — every country page links it.
              </p>
            </div>
          </div>
        </section>

        {/* ── METHOD ── */}
        <section className="vp-sec vp-sec-alt" id="method">
          <div className="vp-wrap">
            <h2 className="vp-h2">How we keep the information reliable</h2>
            <div className="vp-method">
              {METHOD.map((m) => (
                <div key={m.n}>
                  <span className="vp-step-n">{m.n}</span>
                  <b>{m.h}</b>
                  <p>{m.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer site={site} />
    </div>
  );
}
