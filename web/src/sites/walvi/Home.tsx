import Link from "next/link";
import type { SiteHomeProps } from "@/lib/types";
import { COUNTRIES } from "@/lib/walvi";
import { Masthead, Footer } from "./Chrome";
import { fontVars } from "./fonts";
import { getPassports, getPiMeta } from "@/lib/passports";
import { VC, flagFor } from "./visacheck/data";
import { GuideCard } from "./cards";
import Flag from "./Flag";
import { sitePrefix } from "@/lib/public-path";

/* VisaPoint home (v2): one job up front — "do I need a visa?" — then popular
   passports, official visa-status checks, latest guides, tools and the
   work-permit country register. */

const TOOLS = [
  { h: "Do I need a visa?", p: "Any passport to any destination.", href: "/visa-checker", ic: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 0c2.5 2.5 2.5 15.5 0 18m0-18c-2.5 2.5-2.5 15.5 0 18M3 12h18" },
  { h: "Visa status check", p: "Official portals, step by step.", href: "/visa-check", ic: "M5 12.5l4.5 4.5L19 7.5" },
  { h: "Passport Index", p: "199 passports ranked.", href: "/passport-index", ic: "M6 3h12v18H6zM12 8.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 18h6" },
  { h: "Salary & savings", p: "What you would really save.", href: "/tools", ic: "M4 7h16v10H4zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" },
  { h: "Travel map", p: "Map the countries you've seen.", href: "/travel-map", ic: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" },
  { h: "Scam checklist", p: "Spot a fake job offer.", href: "#scams", ic: "M12 3l9 16H3zM12 10v4M12 17h.01" },
] as const;

const POPULAR_PAIRS: [string, string, string, string][] = [
  ["india-to-united-arab-emirates", "in", "ae", "India → UAE"],
  ["bangladesh-to-malaysia", "bd", "my", "Bangladesh → Malaysia"],
  ["pakistan-to-turkey", "pk", "tr", "Pakistan → Turkey"],
  ["nigeria-to-united-kingdom", "ng", "gb", "Nigeria → UK"],
  ["philippines-to-japan", "ph", "jp", "Philippines → Japan"],
  ["india-to-germany", "in", "de", "India → Germany"],
];

const FEATURED_PASSPORTS = ["IN", "BD", "PK", "NG", "PH", "EG", "NP", "GH"];

const SCAMS = [
  "You are asked to pay a “job guarantee”, “visa processing” or placement fee to an agent.",
  "The offer comes by WhatsApp or social media with no verifiable employer or contract.",
  "The salary is far above the country’s typical pay for that job.",
  "You are told to enter on a tourist visa and “change it later”.",
  "The agent keeps your passport or asks for money to a personal account.",
] as const;

function Ic({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function Home({ site, articles }: SiteHomeProps) {
  const b = sitePrefix(site.id);
  const latest = articles.filter((a) => !a.is_mock).slice(0, 8);
  const sorted = [...COUNTRIES].sort((x, y) => x.name.localeCompare(y.name));
  const [passports, meta] = await Promise.all([getPassports(), getPiMeta()]);
  const byName = [...passports].sort((x, y) => x.name.localeCompare(y.name));
  const dest = meta ? [...meta.dest].sort((x, y) => x.name.localeCompare(y.name)) : [];
  const featured = FEATURED_PASSPORTS.map((i) => passports.find((p) => p.iso2 === i)).filter((p): p is NonNullable<typeof p> => !!p);
  const top = passports[0];

  return (
    <div className={fontVars}>
      <a href="#vp-main" className="skip-link">
        Skip to content
      </a>
      <Masthead site={site} />

      {/* ── HERO + visa requirement tool ── */}
      <section className="vx-hero">
        <div className="vx-wrap vx-hero-in">
          <span className="vx-eyebrow">Visas · Passports · Work permits</span>
          <h1>
            Your trusted guide to <em>visas</em> and <em>working abroad</em>.
          </h1>
          <p className="vx-lede">Check what your passport needs for any country — free, independent, linked to official sources.</p>

          {byName.length && dest.length ? (
            <form className="vx-check" action={`${b}/visa-checker`} method="get">
              <label>
                <span>My passport</span>
                <select name="from" required defaultValue="">
                  <option value="" disabled>
                    Choose passport
                  </option>
                  {byName.map((p) => (
                    <option key={p.iso2} value={p.iso2.toLowerCase()}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className="vx-check-arrow" aria-hidden="true">
                →
              </span>
              <label>
                <span>Travelling to</span>
                <select name="to" required defaultValue="">
                  <option value="" disabled>
                    Choose destination
                  </option>
                  {dest.map((d) => (
                    <option key={d.iso2} value={d.iso2.toLowerCase()}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">Check requirements</button>
            </form>
          ) : (
            <Link href={`${b}/visa-checker`} className="vx-btn vx-btn-lg">
              Check visa requirements
            </Link>
          )}

          <div className="vx-pop">
            <span>Popular:</span>
            {POPULAR_PAIRS.map(([slug, f, t, l]) => (
              <Link href={`${b}/visa/${slug}`} key={slug}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://flagcdn.com/w40/${f}.png`} alt="" width={18} height={13} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://flagcdn.com/w40/${t}.png`} alt="" width={18} height={13} />
                {l}
              </Link>
            ))}
          </div>

          <ul className="vx-stats">
            <li>
              <b>{passports.length || 199}</b> passports
            </li>
            <li>
              <b>{dest.length || 199}</b> destinations
            </li>
            <li>
              <b>{VC.length}</b> visa-status guides
            </li>
            <li>
              <b>{COUNTRIES.length}</b> work-permit routes
            </li>
          </ul>
        </div>
      </section>

      <main id="vp-main">
        {/* ── PASSPORTS ── */}
        {featured.length ? (
          <section className="vx-sec">
            <div className="vx-wrap">
              <div className="vx-sechead">
                <h2>Where can your passport go?</h2>
                <Link href={`${b}/passport-index`} className="vx-more">
                  All {passports.length} passports →
                </Link>
              </div>
              <ul className="vx-pp">
                {featured.map((p) => (
                  <li key={p.iso2}>
                    <Link href={`${b}/passport/${p.slug}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`https://flagcdn.com/w80/${p.iso2.toLowerCase()}.png`} alt="" width={40} height={28} loading="lazy" />
                      <span>
                        <b>{p.name}</b>
                        <small>
                          {p.score} destinations · #{p.rank}
                        </small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {top ? (
                <p className="vx-note">
                  Strongest passport today:{" "}
                  <Link href={`${b}/passport/${top.slug}`}>
                    {top.name} ({top.score} destinations)
                  </Link>{" "}
                  · <Link href={`${b}/passport-ranking`}>Full ranking</Link>
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ── VISA STATUS CHECKS ── */}
        <section className="vx-sec vx-sec-soft">
          <div className="vx-wrap">
            <div className="vx-sechead">
              <h2>Check your visa status online</h2>
              <Link href={`${b}/visa-check`} className="vx-more">
                All {VC.length} countries →
              </Link>
            </div>
            <ul className="vx-vc">
              {VC.slice(0, 8).map((e) => (
                <li key={e.slug}>
                  <Link href={`${b}/visa-check/${e.slug}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={flagFor(e, 80)} alt="" width={36} height={25} loading="lazy" />
                    <span>
                      <b>{e.country}</b>
                      <small>{e.portal}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── LATEST GUIDES ── */}
        <section className="vx-sec" id="guides">
          <div className="vx-wrap">
            <div className="vx-sechead">
              <h2>Latest guides</h2>
              <Link href={`${b}/guides`} className="vx-more">
                All {articles.length} guides →
              </Link>
            </div>
            {latest.length ? (
              <div className="vx-cards">
                {latest.map((a) => (
                  <GuideCard site={site} a={a} key={a.id} />
                ))}
              </div>
            ) : (
              <p className="vx-note">New guides are on the way.</p>
            )}
          </div>
        </section>

        {/* ── TOOLS ── */}
        <section className="vx-sec vx-sec-soft">
          <div className="vx-wrap">
            <div className="vx-sechead">
              <h2>Free tools</h2>
            </div>
            <div className="vx-tools">
              {TOOLS.map((t) => (
                <Link key={t.h} href={`${b}${t.href}`} className="vx-tool">
                  <span className="vx-tool-ic">
                    <Ic d={t.ic} />
                  </span>
                  <span>
                    <b>{t.h}</b>
                    <small>{t.p}</small>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── WORK-PERMIT COUNTRIES ── */}
        <section className="vx-sec" id="countries">
          <div className="vx-wrap">
            <div className="vx-sechead">
              <h2>Work permits by country</h2>
              <Link href={`${b}/countries`} className="vx-more">
                Country register →
              </Link>
            </div>
            <ul className="vx-chips">
              {sorted.map((c) => (
                <li key={c.id}>
                  <Link href={`${b}/countries/${c.slug}`}>
                    <Flag emoji={c.flag} size={20} />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── SCAMS ── */}
        <section className="vx-sec vx-sec-tight" id="scams">
          <div className="vx-wrap">
            <div className="vx-scam">
              <div>
                <span className="vx-scam-ic" aria-hidden="true">
                  !
                </span>
                <h2>Recruitment scam warning signs</h2>
                <p>
                  <b>Never pay for a job offer you cannot verify.</b> Check the employer and permit with the destination&apos;s
                  official immigration authority.
                </p>
              </div>
              <ul>
                {SCAMS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer site={site} />
    </div>
  );
}
