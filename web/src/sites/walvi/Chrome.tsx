import "./theme.css";
import "./embassy.css";
import "./v2.css";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Site } from "@/lib/types";
import { fontVars } from "./fonts";

/* Shared VisaPoint chrome (v2, 2026-11): one light sticky header — logo, six
   links + More, search — and a quiet light footer. VisaPoint is an INDEPENDENT
   guide and the footer says so on every page (no government/EU insignia). */

type NavItem = { label: string; href: string; desc?: string };
type NavGroup = { label: string; items: NavItem[] };

export function menuFor(site: Site): NavGroup[] {
  const b = `/s/${site.id}`;
  return [
    {
      label: "Visas",
      items: [
        { label: "Do I need a visa?", href: `${b}/visa-checker`, desc: "Any passport to any country, instantly" },
        { label: "Visa status check", href: `${b}/visa-check`, desc: "Check a Qatar, Saudi, UAE or Schengen visa online" },
        { label: "Passport Index", href: `${b}/passport-index`, desc: "Every passport ranked by visa-free access" },
        { label: "Passport ranking", href: `${b}/passport-ranking`, desc: "The world's strongest passports" },
      ],
    },
    {
      label: "Work abroad",
      items: [
        { label: "Country register", href: `${b}/countries`, desc: "Work-permit routes and official portals" },
        { label: "Jobs & salaries", href: `${b}/jobs`, desc: "Pay for 20+ trades, ranked across Europe" },
        { label: "Work-permit guides", href: `${b}/guides`, desc: "Step-by-step, documents and fees" },
      ],
    },
    {
      label: "Tools",
      items: [
        { label: "Salary & savings calculator", href: `${b}/tools`, desc: "What you would really save each month" },
        { label: "My travel map", href: `${b}/travel-map`, desc: "Map every country you have visited" },
        { label: "Bangladesh district map", href: `${b}/bangladesh-map`, desc: "Which of the 64 districts have you seen?" },
        { label: "Scam checklist", href: `${b}#scams`, desc: "Spot a fake job offer before you pay" },
      ],
    },
  ];
}

/** Flat list (used by sitemap-like link rows and older callers). */
export function navFor(site: Site): ReadonlyArray<readonly [string, string]> {
  return menuFor(site).flatMap((g) => g.items.map((i) => [i.label, i.href] as const));
}

export function Logo({ site }: { site: Site; light?: boolean }) {
  return (
    <Link href={`/s/${site.id}`} className="vx-logo" aria-label={`${site.name} home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/visapoint-logo.webp" alt="VisaPoint.net" width={124} height={42} />
    </Link>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M20 20l-3.6-3.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Masthead({ site }: { site: Site }) {
  const b = `/s/${site.id}`;
  const main: [string, string][] = [
    ["Visa checker", `${b}/visa-checker`],
    ["Visa status", `${b}/visa-check`],
    ["Passport Index", `${b}/passport-index`],
    ["Work abroad", `${b}/countries`],
    ["Jobs", `${b}/jobs`],
    ["Guides", `${b}/guides`],
  ];
  const more: [string, string][] = [
    ["Passport ranking", `${b}/passport-ranking`],
    ["Salary calculator", `${b}/tools`],
    ["Travel map", `${b}/travel-map`],
    ["Bangladesh map", `${b}/bangladesh-map`],
    ["Scam checklist", `${b}#scams`],
    ["About & sources", `${b}/about`],
  ];
  return (
    <header className="vx-head">
      <div className="vx-wrap vx-head-in">
        <Logo site={site} />
        <nav className="vx-nav" aria-label="Primary">
          {main.map(([l, h]) => (
            <Link href={h} key={h}>
              {l}
            </Link>
          ))}
          <details className="vx-more">
            <summary>
              More <i aria-hidden="true">▾</i>
            </summary>
            <div className="vx-more-menu">
              {more.map(([l, h]) => (
                <Link href={h} key={h}>
                  {l}
                </Link>
              ))}
            </div>
          </details>
        </nav>
        <form className="vx-search" action={`${b}/search`} role="search">
          <input name="q" type="search" placeholder="Search VisaPoint" aria-label="Search VisaPoint" />
          <button type="submit" aria-label="Search">
            <SearchIcon />
          </button>
        </form>
        <Link href={`${b}/search`} className="vx-icon-btn vx-m-only" aria-label="Search">
          <SearchIcon />
        </Link>
        <details className="vx-mnav">
          <summary aria-label="Menu">
            <span aria-hidden="true" className="vx-burger">
              <i />
              <i />
              <i />
            </span>
          </summary>
          <div className="vx-mnav-in">
            <form className="vx-msearch" action={`${b}/search`} role="search">
              <input name="q" type="search" placeholder="Search VisaPoint" aria-label="Search VisaPoint" />
              <button type="submit">Search</button>
            </form>
            <Link href={b}>Home</Link>
            {[...main, ...more].map(([l, h]) => (
              <Link href={h} key={h}>
                {l}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}

const POPULAR: [string, string, string][] = [
  ["qatar", "QA", "Qatar"],
  ["saudi-arabia", "SA", "Saudi Arabia"],
  ["uae", "AE", "UAE"],
  ["malaysia", "MY", "Malaysia"],
  ["serbia", "RS", "Serbia"],
  ["romania", "RO", "Romania"],
  ["moldova", "MD", "Moldova"],
  ["north-macedonia", "MK", "North Macedonia"],
];

export function Footer({ site }: { site: Site }) {
  const year = new Date().getFullYear();
  const b = `/s/${site.id}`;
  const menu = menuFor(site);
  return (
    <footer className="vx-foot">
      <div className="vx-wrap">
        <div className="vx-foot-grid">
          <div className="vx-foot-brand">
            <Logo site={site} />
            <p>Plain-language visa, passport and work-permit guidance — every country linked to its official source.</p>
          </div>
          {menu.map((g) => (
            <div key={g.label}>
              <h4>{g.label}</h4>
              {g.items.map((i) => (
                <Link href={i.href} key={i.href}>
                  {i.label}
                </Link>
              ))}
            </div>
          ))}
          <div>
            <h4>VisaPoint</h4>
            <Link href={`${b}/about`}>About &amp; how we verify</Link>
            <Link href={`${b}/contact`}>Contact</Link>
            <Link href={`${b}/privacy`}>Privacy Policy</Link>
            <Link href={`${b}/terms`}>Terms</Link>
            <Link href={`${b}/disclaimer`}>Disclaimer</Link>
            <Link href={`${b}/archive`}>All articles</Link>
          </div>
        </div>
        <div className="vx-foot-pop">
          <span>Popular visa checks</span>
          {POPULAR.map(([slug, iso, name]) => (
            <Link href={`${b}/visa-check/${slug}`} key={slug}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://flagcdn.com/w40/${iso.toLowerCase()}.png`} alt="" width={18} height={13} loading="lazy" />
              {name}
            </Link>
          ))}
        </div>
        <p className="vx-foot-legal" data-nosnippet>
          <b>VisaPoint is an independent guide</b> — not a government website, embassy, consulate, visa application centre or
          recruiter, and not affiliated with the European Union. Salary and savings figures are estimates; visa and
          work-permit rules change often, so confirm with the official source before you apply or pay any fee.
        </p>
        <div className="vx-foot-base">
          <span>© {year} VisaPoint · visapoint.net</span>
          <span>
            <Link href={`${b}/privacy`}>Privacy</Link>
            <Link href={`${b}/terms`}>Terms</Link>
            <Link href="/sitemap.xml">Sitemap</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

/** Standard page wrapper: masthead + shell main + footer. */
export function WalviShell({ site, children }: { site: Site; children: ReactNode }) {
  return (
    <div className={fontVars}>
      <Masthead site={site} />
      <main>
        <div className="shell">{children}</div>
      </main>
      <Footer site={site} />
    </div>
  );
}
