import Link from "next/link";
import type { ReactNode } from "react";
import type { Site } from "@/lib/types";
import "./ai.css";
import { aiFont } from "./fonts";

/* Shared InfKey chrome — masthead, footer, logo, page shell.
   Used by Home, Article and every data-product route so nav stays consistent. */

export function navFor(site: Site): ReadonlyArray<readonly [string, string]> {
  const b = `/s/${site.id}`;
  return [
    ["Prompts", `${b}#prompt-library`],
    ["Best AI for…", `${b}#best-ai-for`],
    ["Use AI free", `${b}#use-free`],
    ["AI vs AI", `${b}#compare`],
    ["Plans & deals", `${b}#deals`],
    ["API cost", `${b}/calculators`],
    ["Models", `${b}/models`],
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
    <header className={`masthead ai-masthead ${aiFont.variable}`}>
      <div className="shell masthead-row">
        <input type="checkbox" id="ik-nav" className="nav-toggle" aria-hidden="true" />
        <Logo site={site} />
        <nav className="nav" aria-label="Primary">
          {nav.map(([label, href]) => (
            <Link href={href} key={label}>
              {label}
            </Link>
          ))}
          <Link href={`/s/${site.id}/search`} className="cta">
            ✦ Ask InfKey
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
              <h5>AI tools</h5>
              <Link href={`${b}#prompt-library`}>Viral prompt library</Link>
              <Link href={`${b}#best-ai-for`}>Best AI for your job</Link>
              <Link href={`${b}#use-free`}>Use AI free</Link>
              <Link href={`${b}#compare`}>ChatGPT vs Claude vs Gemini</Link>
              <Link href={`${b}#deals`}>Plans, prices &amp; deals</Link>
            </div>
            <div className="footer-col">
              <h5>Builders</h5>
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
          InfKey is independent and not affiliated with OpenAI, Anthropic, Google, Microsoft or any AI provider; product
          names are trademarks of their owners. Prices, plans and free limits are collected from public pages for guidance
          only and change often — always confirm on the provider&apos;s official site before you pay.
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
          <span>AI tools, explained.</span>
        </div>
      </div>
    </footer>
  );
}

/** Standard page wrapper: masthead + shell main + footer. */
export function InfShell({ site, children }: { site: Site; children: ReactNode }) {
  return (
    <div className={`ai-root ${aiFont.variable}`}>
      <Masthead site={site} />
      <main>
        <div className="shell">{children}</div>
      </main>
      <Footer site={site} />
    </div>
  );
}
