import Link from "next/link";
import type { SiteHomeProps, Site, Article } from "@/lib/types";
import { GcShell } from "./Chrome";
import { COUNTRIES, TOPICS, countryOf, topicOf, flag } from "./data";
import { Clocks, Converter, CityPulse } from "./Widgets";

const QUICK: [string, string][] = [
  ["🛂", "Check visa status"],
  ["🪪", "Renew residence ID"],
  ["🚗", "Driving licence"],
  ["💼", "Salary & gratuity"],
  ["🏠", "Rent & cost of living"],
  ["⚖️", "Laws for expats"],
];

function Skyline() {
  // Stylised Gulf skyline: towers, a needle spire and a dhow sail.
  return (
    <svg className="gc-sky" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="gcs" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e2a4a" />
          <stop offset="1" stopColor="#0b1020" />
        </linearGradient>
      </defs>
      <path
        fill="url(#gcs)"
        d="M0 220V170h40v-30h30v30h20v-60h26v60h18v-90l14-14 14 14v90h24v-44h30v44h16v-120h10v-40h6v-60h4v60h6v40h10v120h22v-70h34v70h20v-36h28v36h18v-96l20-20 20 20v96h26v-58h36v58h24v-30h22v30h20v-110h8l12-24 12 24h8v110h30v-64h40v64h22v-40h30v40h26v-84l18-18 18 18v84h24v-50h30v50h24v-28h40v28h22v-70h34v70h30v-40h40v40h40V220z"
      />
      <g className="gc-win" fill="#f6c453">
        {Array.from({ length: 60 }, (_, i) => (
          <rect key={i} x={(i * 97) % 1180 + 10} y={120 + ((i * 53) % 80)} width="3" height="5" style={{ animationDelay: `${(i % 9) * 0.7}s` }} />
        ))}
      </g>
    </svg>
  );
}

function Card({ site, a, big = false }: { site: Site; a: Article; big?: boolean }) {
  const c = countryOf(a);
  const t = topicOf(a);
  const href = `/s/${site.id}/${a.slug}`;
  return (
    <article className={`gc-acard${big ? " big" : ""}`}>
      <Link href={href} className="gc-amedia" tabIndex={-1} aria-label={a.title}>
        {a.image_url ? <img src={a.image_url} alt="" loading="lazy" /> : <span className="gc-aph">{t.icon}</span>}
        <span className="gc-badge">
          {c ? <img src={flag(c.iso, 40)} alt="" width={16} height={11} /> : null}
          {t.label}
        </span>
      </Link>
      <div className="gc-abody">
        <h3>
          <Link href={href}>{a.title}</Link>
        </h3>
        {big && a.excerpt ? <p>{a.excerpt}</p> : null}
        <span className="gc-meta">{a.reading_time} min read</span>
      </div>
    </article>
  );
}

export default function Home({ site, articles }: SiteHomeProps) {
  const b = `/s/${site.id}`;
  const real = articles.filter((a) => !a.is_mock);
  const [lead, ...rest] = real;
  return (
    <GcShell site={site} active="home">
      <section className="gc-hero">
        <div className="gc-aurora" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="gc-wrap gc-hero-in">
          <span className="gc-pill">
            <span className="gc-dot" /> 6 countries · live time, prayer & weather
          </span>
          <h1>
            Everything <span className="gc-grad">GCC</span>, in one place.
          </h1>
          <p className="gc-sub">Visas, jobs, driving licences, rules and the best things to do in Qatar, the UAE, Saudi Arabia, Kuwait, Oman and Bahrain — explained simply, linked to the official portals.</p>
          <form className="gc-hsearch" action={`${b}/search`} role="search">
            <span aria-hidden="true">⌕</span>
            <input name="q" type="search" placeholder="Try “Qatar visa status”, “Dubai driving licence”, “Saudi iqama renewal”" aria-label="Search" />
            <button type="submit">Search</button>
          </form>
          <div className="gc-quick">
            {QUICK.map(([i, q]) => (
              <Link key={q} href={`${b}/search?q=${encodeURIComponent(q)}`}>
                <span aria-hidden="true">{i}</span>
                {q}
              </Link>
            ))}
          </div>
          <Clocks base={b} />
        </div>
        <Skyline />
      </section>

      <div className="gc-wrap">
        <section className="gc-sec" id="countries">
          <div className="gc-head">
            <h2>Pick your country</h2>
            <p>Key facts, official portals and every guide for each Gulf state.</p>
          </div>
          <div className="gc-countries">
            {COUNTRIES.map((c) => (
              <Link key={c.slug} href={`${b}/country/${c.slug}`} className="gc-country" style={{ ["--ca" as string]: c.accent }}>
                <div className="gc-country-top">
                  <img src={flag(c.iso, 160)} alt="" width={56} height={38} />
                  <div>
                    <b>{c.name}</b>
                    <span>{c.tagline}</span>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>Currency</dt>
                    <dd>{c.code}</dd>
                  </div>
                  <div>
                    <dt>Weekend</dt>
                    <dd>{c.weekend}</dd>
                  </div>
                  <div>
                    <dt>Emergency</dt>
                    <dd>{c.emergency.split(" ")[0]}</dd>
                  </div>
                </dl>
                <span className="gc-go">Open guide →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="gc-sec" id="tools">
          <div className="gc-head">
            <h2>Live tools</h2>
            <p>Free, instant and always on — no sign-up.</p>
          </div>
          <div className="gc-tools">
            <CityPulse />
            <Converter />
          </div>
        </section>

        {lead ? (
          <section className="gc-sec" id="latest">
            <div className="gc-head">
              <h2>
                <span className="gc-live" /> Latest guides
              </h2>
              <p>New and updated this week.</p>
            </div>
            <div className="gc-latest">
              <Card site={site} a={lead} big />
              <div className="gc-latest-list">
                {rest.slice(0, 4).map((a) => (
                  <Card site={site} a={a} key={a.id} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="gc-sec">
          <div className="gc-head">
            <h2>Browse by topic</h2>
            <p>From your first visa to your end-of-service gratuity.</p>
          </div>
          <div className="gc-topics">
            {TOPICS.map((t) => {
              const n = real.filter((a) => topicOf(a).key === t.key).length;
              return (
                <Link key={t.key} href={`${b}/search?q=${encodeURIComponent(t.label.split(" ")[0])}`} className="gc-topic">
                  <span className="gc-ti" aria-hidden="true">
                    {t.icon}
                  </span>
                  <b>{t.label}</b>
                  <small>{t.blurb}</small>
                  <em>{n ? `${n} guides` : "New guides soon"}</em>
                </Link>
              );
            })}
          </div>
        </section>

        {TOPICS.map((t) => {
          const list = real.filter((a) => topicOf(a).key === t.key).slice(0, 3);
          return list.length >= 2 ? (
            <section className="gc-sec" key={t.key}>
              <div className="gc-head row">
                <h2>
                  {t.icon} {t.label}
                </h2>
              </div>
              <div className="gc-grid">
                {list.map((a) => (
                  <Card site={site} a={a} key={a.id} />
                ))}
              </div>
            </section>
          ) : null;
        })}
      </div>
    </GcShell>
  );
}
