import "./theme.css";
import "./embassy.css";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Site } from "@/lib/types";
import { fontVars } from "./fonts";

/* Shared VisaPoint chrome: official-feeling but independent. Seal-style logo,
   grouped mega-menu (CSS-only dropdowns, <details> on mobile), rich footer.
   It deliberately avoids any government or EU insignia: VisaPoint is an
   INDEPENDENT guide and says so in the service bar, footer and every guide. */

type NavItem = { label: string; href: string; desc?: string };
type NavGroup = { label: string; items: NavItem[] };

export function menuFor(site: Site): NavGroup[] {
  const b = `/s/${site.id}`;
  return [
    {
      label: "Visas",
      items: [
        { label: "Visa status check", href: `${b}/visa-check`, desc: "Check a Qatar, Saudi, UAE or Schengen visa online" },
        { label: "Do I need a visa?", href: `${b}/visa-checker`, desc: "Any passport to any country, instantly" },
        { label: "Passport Index", href: `${b}/passport-index`, desc: "Every passport ranked by visa-free access" },
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
        { label: "Bangladesh district map", href: `${b}/bangladesh-map`, desc: "Which of the 64 zila have you seen?" },
        { label: "Scam checklist", href: `${b}#scams`, desc: "Spot a fake job offer before you pay" },
      ],
    },
  ];
}

/** Flat list (used by sitemap-like link rows and older callers). */
export function navFor(site: Site): ReadonlyArray<readonly [string, string]> {
  return menuFor(site).flatMap((g) => g.items.map((i) => [i.label, i.href] as const));
}

/** VisaPoint seal: navy roundel, gold stamp ring, globe meridians and a check. */
export function PinMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#0d2b4e" />
      <circle cx="32" cy="32" r="27.5" fill="none" stroke="#c9a23a" strokeWidth="1.6" strokeDasharray="2.4 2" />
      <circle cx="32" cy="32" r="22" fill="#11365f" stroke="#c9a23a" strokeWidth="1.2" />
      <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1">
        <ellipse cx="32" cy="32" rx="9" ry="22" />
        <path d="M10 32h44M13.5 21h37M13.5 43h37M32 10v44" />
      </g>
      <circle cx="32" cy="32" r="11" fill="#0f6e6a" stroke="#fff" strokeWidth="1.6" />
      <path d="M26.8 32.4l3.6 3.6 7-7.4" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ site, light = false }: { site: Site; light?: boolean }) {
  return (
    <Link href={`/s/${site.id}`} className={`vp-logo${light ? " light" : ""}`} aria-label={`${site.name} home`}>
      <span className="vp-logo-mark">
        <PinMark />
      </span>
      <span className="vp-logo-word">
        <b>
          Visa<span>Point</span>
        </b>
        <small>Global visa &amp; work-permit guide</small>
      </span>
    </Link>
  );
}

export function Masthead({ site }: { site: Site }) {
  const b = `/s/${site.id}`;
  const menu = menuFor(site);
  return (
    <header className="vp-header">
      <div className="vp-service">
        <div className="vp-wrap vp-service-in">
          <span>
            <b>Independent guide</b> — not a government website, embassy or recruiter.
          </span>
          <span className="vp-service-r">
            <Link href={`${b}/about`}>How we verify</Link>
            <Link href={`${b}#scams`}>Scam alerts</Link>
            <Link href={`${b}/contact`}>Contact</Link>
          </span>
        </div>
      </div>
      <div className="vp-wrap vp-brandrow">
        <Logo site={site} />
        <form className="vp-hsearch" action={`${b}/search`} role="search">
          <input name="q" type="search" placeholder="Search visas, countries, jobs…" aria-label="Search VisaPoint" />
          <button type="submit" aria-label="Search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <path d="M20 20l-3.6-3.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </form>
        <div className="vp-brand-actions">
          <Link href={`${b}/passport-index`} className="vp-btn vp-btn-outline">
            Passport Index
          </Link>
          <Link href={`${b}/visa-check`} className="vp-btn vp-btn-gold">
            Check my visa
          </Link>
        </div>
      </div>
      <nav className="vp-nav" aria-label="Primary">
        <div className="vp-wrap vp-nav-in">
          <Link href={b} className="vp-nav-home">
            Home
          </Link>
          {menu.map((g) => (
            <div className="vp-dd" key={g.label}>
              <button type="button" className="vp-dd-btn" aria-haspopup="true">
                {g.label} <i aria-hidden="true">▾</i>
              </button>
              <div className="vp-dd-menu">
                {g.items.map((i) => (
                  <Link href={i.href} key={i.href}>
                    <b>{i.label}</b>
                    {i.desc ? <span>{i.desc}</span> : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link href={`${b}/visa-check`}>Visa check</Link>
          <Link href={`${b}/travel-map`}>Travel map</Link>
          <Link href={`${b}/bangladesh-map`}>Bangladesh map</Link>
          <Link href={`${b}/guides`}>Guides</Link>
        </div>
        <details className="vp-mnav">
          <summary>
            <span aria-hidden="true">☰</span> Menu
          </summary>
          <div className="vp-mnav-in">
            <Link href={b}>Home</Link>
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
            <Link href={`${b}#scams`}>Scam alerts</Link>
          </div>
        </details>
      </nav>
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
    <footer className="vp-footer">
      <div className="vp-foot-cta">
        <div className="vp-wrap vp-foot-cta-in">
          <div>
            <b>Planning to work or travel abroad?</b>
            <span>Start with a free visa check — then read the official route for your country.</span>
          </div>
          <div className="vp-foot-cta-btns">
            <Link href={`${b}/visa-checker`} className="vp-btn vp-btn-gold">
              Do I need a visa?
            </Link>
            <Link href={`${b}/countries`} className="vp-btn vp-btn-ghost">
              Work-permit routes
            </Link>
          </div>
        </div>
      </div>
      <div className="vp-wrap">
        <div className="vp-foot-grid">
          <div className="vp-foot-brand">
            <Logo site={site} light />
            <p>
              Plain-language guidance on visas, work permits, salaries and the real cost of living abroad — for workers and
              travellers from Bangladesh, South Asia, Africa and the Gulf. Every country links its official government source.
            </p>
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
            <Link href={`${b}#scams`}>Recruitment scam checklist</Link>
            <Link href={`${b}/contact`}>Contact</Link>
            <Link href={`${b}/privacy`}>Privacy Policy</Link>
            <Link href={`${b}/terms`}>Terms</Link>
            <Link href={`${b}/disclaimer`}>Disclaimer</Link>
          </div>
        </div>
        <div className="vp-foot-pop">
          <h4>Popular visa checks</h4>
          <div>
            {POPULAR.map(([slug, iso, name]) => (
              <Link href={`${b}/visa-check/${slug}`} key={slug}>
                <img src={`https://flagcdn.com/w40/${iso.toLowerCase()}.png`} alt="" width={20} height={14} loading="lazy" />
                {name}
              </Link>
            ))}
          </div>
        </div>
        <p className="vp-foot-legal">
          <b>
            VisaPoint is an independent resource. It is not affiliated with the European Union, any national government, embassy,
            consulate, visa application centre or recruitment agency.
          </b>{" "}
          Salary, cost-of-living and savings figures are indicative estimates, not quotes for any specific job. Visa and
          work-permit rules are summarised for general guidance and change often — always confirm with the official government
          source or embassy before you apply, accept an offer or pay any fee.
        </p>
        <div className="vp-foot-base">
          <span>© {year} VisaPoint · visapoint.net</span>
          <span className="vp-foot-base-r">
            <Link href={`${b}/privacy`}>Privacy</Link>
            <Link href={`${b}/terms`}>Terms</Link>
            <Link href="/sitemap.xml">Sitemap</Link>
            <span>Know before you move.</span>
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
