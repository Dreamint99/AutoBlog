import "./theme.css";
import "./embassy.css";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Site } from "@/lib/types";
import { fontVars } from "./fonts";

/* Shared VisaPoint chrome — calm, consular-service styling (service bar, white
   masthead, navy section rail, document-like footer). It deliberately avoids
   any government or EU insignia: VisaPoint is an INDEPENDENT guide and says so
   in the service bar, footer and every guide. */

export function navFor(site: Site): ReadonlyArray<readonly [string, string]> {
  const b = `/s/${site.id}`;
  return [
    ["Visa check", `${b}/visa-check`],
    ["Passport Index", `${b}/passport-index`],
    ["Visa requirements", `${b}/visa-checker`],
    ["Countries", `${b}/countries`],
    ["Jobs & salaries", `${b}/jobs`],
    ["Work-permit guides", `${b}/guides`],
    ["Tools", `${b}/tools`],
  ];
}

/** VisaPoint mark: a map pin whose head is a passport-stamp ring. */
export function PinMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2.5c-6.1 0-11 4.8-11 10.8 0 7.6 9.1 15.2 10.2 16.1.5.4 1.1.4 1.6 0C17.9 28.5 27 20.9 27 13.3 27 7.3 22.1 2.5 16 2.5z" fill="#0f6e6a" />
      <circle cx="16" cy="13.2" r="6.2" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="2.2 1.6" />
      <path d="M13.2 13.4l1.9 1.9 3.8-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
        <b>VisaPoint</b>
        <small>Visas · Work permits · Salaries abroad</small>
      </span>
    </Link>
  );
}

export function Masthead({ site }: { site: Site }) {
  const b = `/s/${site.id}`;
  return (
    <header className="vp-header">
      <div className="vp-service">
        <div className="vp-wrap vp-service-in">
          <span>
            <b>Independent guide</b> — VisaPoint is not a government website, embassy or recruiter.
          </span>
          <span className="vp-service-r">
            <Link href={`${b}/about`}>How we verify</Link>
            <Link href={`${b}/contact`}>Contact</Link>
          </span>
        </div>
      </div>
      <div className="vp-wrap vp-brandrow">
        <Logo site={site} />
        <div className="vp-brand-actions">
          <span className="vp-updated">
            <i aria-hidden="true" /> Guidance reviewed daily
          </span>
          <Link href={`${b}/tools`} className="vp-btn vp-btn-primary">
            Salary &amp; savings calculator
          </Link>
        </div>
      </div>
      <nav className="vp-nav" aria-label="Primary">
        <div className="vp-wrap vp-nav-in">
          <Link href={b}>Home</Link>
          {navFor(site).map(([label, href]) => (
            <Link href={href} key={label}>
              {label}
            </Link>
          ))}
          <Link href={`${b}#scams`}>Scam alerts</Link>
        </div>
      </nav>
    </header>
  );
}

export function Footer({ site }: { site: Site }) {
  const year = new Date().getFullYear();
  const b = `/s/${site.id}`;
  return (
    <footer className="vp-footer">
      <div className="vp-wrap">
        <div className="vp-foot-grid">
          <div>
            <Logo site={site} light />
            <p>
              Plain-language guidance on work permits, visas, salaries and the real cost of living in{" "}
              European countries — for workers from Bangladesh, South Asia, Africa and the Gulf.
            </p>
          </div>
          <div>
            <h4>Plan your move</h4>
            <Link href={`${b}/passport-index`}>Passport Index</Link>
            <Link href={`${b}/visa-check`}>Visa status check</Link>
            <Link href={`${b}/visa-checker`}>Visa requirements</Link>
            <Link href={`${b}/countries`}>Country register</Link>
            <Link href={`${b}/jobs`}>Jobs &amp; salaries</Link>
            <Link href={`${b}/guides`}>Work-permit guides</Link>
            <Link href={`${b}/tools`}>Calculators</Link>
          </div>
          <div>
            <h4>Stay safe</h4>
            <Link href={`${b}#scams`}>Recruitment scam checklist</Link>
            <Link href={`${b}#method`}>How we verify figures</Link>
            <Link href={`${b}/countries`}>Official government sources</Link>
          </div>
          <div>
            <h4>VisaPoint</h4>
            <Link href={`${b}/about`}>About</Link>
            <Link href={`${b}/contact`}>Contact</Link>
            <Link href={`${b}/privacy`}>Privacy Policy</Link>
            <Link href={`${b}/terms`}>Terms</Link>
            <Link href={`${b}/disclaimer`}>Disclaimer</Link>
          </div>
        </div>
        <p className="vp-foot-legal">
          <b>VisaPoint is an independent resource. It is not affiliated with the European Union, any national
          government, embassy, consulate, visa application centre or recruitment agency.</b> Salary, cost-of-living
          and savings figures are indicative estimates, not quotes for any specific job. Visa and work-permit rules
          are summarised for general guidance and change often — always confirm with the official government source
          or embassy before you apply, accept an offer or pay any fee.
        </p>
        <div className="vp-foot-base">
          <span>© {year} VisaPoint · visapoint.net</span>
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
