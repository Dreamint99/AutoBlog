import Link from "next/link";
import type { ReactNode } from "react";
import type { Site } from "@/lib/types";

/* Shared InfKey chrome — masthead, footer, logo, page shell.
   Used by Home, Article and every data-product route so nav stays consistent. */

export function navFor(site: Site): ReadonlyArray<readonly [string, string]> {
  const b = `/s/${site.id}`;
  return [
    ["Calculators", `${b}/calculators`],
    ["Models", `${b}/models`],
    ["Compare", `${b}/compare`],
    ["Guides", `${b}#guides`],
  ];
}

export function KeyMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
      <circle cx="8" cy="8" r="4.5" />
      <path d="M11.2 11.2 L19 19" strokeLinecap="round" />
      <path d="M16 16 h3 M17.5 19 v-3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ site }: { site: Site }) {
  return (
    <Link href={`/s/${site.id}`} className="logo" aria-label={`${site.name} home`}>
      <span className="logomark">
        <KeyMark />
      </span>
      <span className="wordmark">
        Inf<b>Key</b>
        <span className="tld">.com</span>
      </span>
    </Link>
  );
}

export function Masthead({ site }: { site: Site }) {
  const nav = navFor(site);
  return (
    <header className="masthead">
      <div className="shell masthead-row">
        <input type="checkbox" id="ik-nav" className="nav-toggle" aria-hidden="true" />
        <Logo site={site} />
        <nav className="nav" aria-label="Primary">
          {nav.map(([label, href]) => (
            <Link href={href} key={label}>
              {label}
            </Link>
          ))}
          <Link href={`/s/${site.id}/calculators`} className="cta">
            Calculate cost
          </Link>
        </nav>
        <label className="nav-burger" htmlFor="ik-nav" aria-label="Toggle navigation menu">
          <span />
        </label>
      </div>
    </header>
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
            <p className="footer-tag" style={{ marginTop: "12px" }}>
              {site.tagline}
            </p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h5>Tools</h5>
              <Link href={`${b}/calculators`}>Cost calculators</Link>
              <Link href={`${b}/compare`}>Comparisons</Link>
              <Link href={`${b}/models`}>Model database</Link>
              <Link href={`${b}#guides`}>Cost guides</Link>
            </div>
            <div className="footer-col">
              <h5>Trust</h5>
              <Link href={`${b}#method`}>Methodology</Link>
              <Link href={`${b}/models`}>Pricing sources</Link>
              <Link href={`${b}#guides`}>Update history</Link>
            </div>
          </div>
        </div>
        <p className="footer-disclaimer">
          Pricing on InfKey is collected from public provider pages and shown for estimation only. It
          excludes taxes, prompt-caching discounts and failed-generation retries, and can change at
          any time — always confirm against the provider&apos;s official pricing before you commit spend.
        </p>
        <div className="footer-base">
          <span>
            © {year} <span className="accent">{site.name}</span>
          </span>
          <span>·</span>
          <span>Know the real cost before you build.</span>
        </div>
      </div>
    </footer>
  );
}

/** Standard page wrapper: masthead + shell main + footer. */
export function InfShell({ site, children }: { site: Site; children: ReactNode }) {
  return (
    <>
      <Masthead site={site} />
      <main>
        <div className="shell">{children}</div>
      </main>
      <Footer site={site} />
    </>
  );
}
