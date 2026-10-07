import Link from "next/link";
import type { ReactNode } from "react";
import type { Site } from "@/lib/types";
import { fontVars } from "./fonts";

/* Shared VisaPoint chrome — official European-institution styling.
   12-gold-star emblem (European motif), gov-style top bar, EU-blue masthead.
   NOTE: aesthetic only — VisaPoint is an INDEPENDENT resource and says so in the
   top bar and footer; it does not claim to be a government or EU body. */

export function navFor(site: Site): ReadonlyArray<readonly [string, string]> {
  const b = `/s/${site.id}`;
  return [
    ["Countries", `${b}/countries`],
    ["Jobs", `${b}/jobs`],
    ["Tools", `${b}/tools`],
    ["Guides", `${b}/guides`],
  ];
}

/** A ring of 12 stars — the European motif, rendered as small points. */
export function StarRing({ stroke = false }: { stroke?: boolean }) {
  const pts: [number, number][] = [
    [12, 4], [16, 5.07], [18.93, 8], [20, 12], [18.93, 16], [16, 18.93],
    [12, 20], [8, 18.93], [5.07, 16], [4, 12], [5.07, 8], [8, 5.07],
  ];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {stroke ? <circle cx="12" cy="12" r="9.4" fill="none" stroke="rgba(246,199,0,.35)" strokeWidth="0.6" /> : null}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.15" fill="#f6c700" />
      ))}
    </svg>
  );
}

/** VisaPoint mark: a map pin whose head is a passport-stamp ring. */
export function PinMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="vp-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0ea5a4" />
        </linearGradient>
      </defs>
      <path d="M16 2.5c-6.1 0-11 4.8-11 10.8 0 7.6 9.1 15.2 10.2 16.1.5.4 1.1.4 1.6 0C17.9 28.5 27 20.9 27 13.3 27 7.3 22.1 2.5 16 2.5z" fill="url(#vp-g)" />
      <circle cx="16" cy="13.2" r="6.2" fill="none" stroke="#0b1f3a" strokeWidth="1.6" strokeDasharray="2.2 1.6" />
      <path d="M13.2 13.4l1.9 1.9 3.8-4" fill="none" stroke="#0b1f3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ site }: { site: Site }) {
  return (
    <Link href={`/s/${site.id}`} className="logo" aria-label={`${site.name} home`}>
      <span className="logomark vp-mark">
        <PinMark />
      </span>
      <span className="wordmark">
        Visa<b>Point</b>
        <span className="tld">Visas · Jobs · Salaries abroad</span>
      </span>
    </Link>
  );
}

export function Masthead({ site }: { site: Site }) {
  const nav = navFor(site);
  return (
    <>
      <div className="govbar">
        <div className="govbar-inner">
          <span className="gb-emblem">
            <i className="vp-live" aria-hidden="true" />
            Updated daily · independent visa, work &amp; salary guides
          </span>
          <span className="gb-note">
            Not a government site or recruiter · always verify with the official embassy
          </span>
        </div>
      </div>
      <header className="masthead">
        <div className="shell masthead-row">
          <input type="checkbox" id="wv-nav" className="nav-toggle" aria-hidden="true" />
          <Logo site={site} />
          <nav className="nav" aria-label="Primary">
            {nav.map(([label, href]) => (
              <Link href={href} key={label}>
                {label}
              </Link>
            ))}
            <Link href={`/s/${site.id}/tools`} className="cta">
              Calculator
            </Link>
          </nav>
          <label className="nav-burger" htmlFor="wv-nav" aria-label="Toggle navigation menu">
            <span />
          </label>
        </div>
      </header>
    </>
  );
}

export function Footer({ site }: { site: Site }) {
  const year = new Date().getFullYear();
  const b = `/s/${site.id}`;
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-row">
          <div>
            <Logo site={site} />
            <p className="footer-tag" style={{ marginTop: "14px" }}>
              {site.tagline} An independent intelligence resource on European work, salary, cost of
              living and work-permit routes for global workers — not a government or EU body.
            </p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h5>Register</h5>
              <Link href={`${b}/countries`}>Countries</Link>
              <Link href={`${b}/jobs`}>Jobs &amp; salaries</Link>
              <Link href={`${b}/tools`}>Calculators</Link>
              <Link href={`${b}/guides`}>Guides</Link>
            </div>
            <div className="footer-col">
              <h5>Tools</h5>
              <Link href={`${b}/tools`}>Salary &amp; savings</Link>
              <Link href={`${b}/tools`}>Country comparison</Link>
              <Link href={`${b}/jobs`}>Salary by job</Link>
              <Link href={`${b}/countries`}>Cost of living</Link>
            </div>
            <div className="footer-col">
              <h5>Trust</h5>
              <Link href={`${b}#method`}>Methodology</Link>
              <Link href={`${b}/countries`}>Official sources</Link>
              <Link href={`${b}#guides`}>Scam warnings</Link>
            </div>
          </div>
        </div>
        <p className="footer-disclaimer">
          <b>VisaPoint is an independent resource and is not affiliated with the European Union, the
          European Commission, or any national government.</b> Salary, cost-of-living and savings
          figures are indicative estimates, modelled from each occupation&apos;s rough EU average and a
          per-country wage index — not official quotes for any specific job offer. Visa and work-permit
          information is summarised for general guidance only. Always confirm pay, costs and immigration
          rules with the official government source or the relevant embassy before you accept an offer or
          pay any fee, and be alert to recruitment scams and fake job offers.
        </p>
        <div
          className="footer-legal"
          style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", margin: "14px 0", fontSize: "13px", opacity: 0.85 }}
        >
          <Link href={`${b}/about`}>About</Link>
          <Link href={`${b}/contact`}>Contact</Link>
          <Link href={`${b}/privacy`}>Privacy Policy</Link>
          <Link href={`${b}/terms`}>Terms</Link>
          <Link href={`${b}/disclaimer`}>Disclaimer</Link>
        </div>
        <div className="footer-base">
          <span>
            © {year} <span className="accent">{site.name}</span>
          </span>
          <span>·</span>
          <span>Know before you move.</span>
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
