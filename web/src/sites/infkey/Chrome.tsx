import Link from "next/link";
import type { ReactNode } from "react";
import type { Site } from "@/lib/types";
import "./v2.css";
import { aiFont } from "./fonts";
import { publicPath, sitePrefix } from "@/lib/public-path";

/* Shared InfKey chrome (v2) — sticky header, footer, page shell.
   Used by Home, Article and every data route so the nav stays consistent.
   No client JS: the "More" menu and the phone drawer are <details>. */

export function navFor(site: Site): ReadonlyArray<readonly [string, string]> {
  const b = sitePrefix(site.id);
  return [
    ["Models", `${b}/models`],
    ["Compare", `${b}/compare`],
    ["Price changes", `${b}/changes`],
    ["Is it down?", `${b}/status`],
    ["Can I run it?", `${b}/run`],
    ["Calculator", `${b}/calculators`],
  ];
}

function moreFor(site: Site): ReadonlyArray<readonly [string, string]> {
  const b = sitePrefix(site.id);
  return [
    ["New models", `${b}/new`],
    ["GPU guide", `${b}/gpu`],
    ["Guides", `${b}/archive`],
    ["Search guides", `${b}/search`],
    ["About", `${b}/about`],
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
  /* Brand wordmark: "inf" + gradient "key" + muted ".com" (Space Grotesk). */
  return (
    <Link href={publicPath(site.id, "/")} className="ik-logo" aria-label={`${site.name} home`}>
      <span className="ik-wm-a">inf</span>
      <span className="ik-wm-k">key</span>
      <span className="ik-wm-d">.com</span>
    </Link>
  );
}

const Chevron = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
    <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/* Removes images that fail to load (dead Wikimedia renditions etc.) so cards never show a broken icon.
   Capture-phase listener, registered before any <img> in the page is parsed. */
const IMG_GUARD =
  "document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG'){var f=t.closest('figure');if(f&&f.className.indexOf('hero-figure')>-1){f.remove()}else{t.remove()}}},true);";

export function Masthead({ site }: { site: Site }) {
  const nav = navFor(site);
  const more = moreFor(site);
  const b = sitePrefix(site.id);
  return (
    <header className={`ik-bar ${aiFont.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: IMG_GUARD }} />
      <div className="ik-wrap ik-bar-in">
        <Logo site={site} />
        <nav className="ik-nav" aria-label="Primary">
          {nav.map(([label, href]) => (
            <Link href={href} key={label}>
              {label}
            </Link>
          ))}
          <details className="ik-more">
            <summary>
              More <Chevron />
            </summary>
            <div className="ik-more-menu">
              {more.map(([label, href]) => (
                <Link href={href} key={label}>
                  {label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
        <form className="ik-hsearch" action={`${b}/models`} role="search">
          <SearchIcon />
          <input name="q" type="search" placeholder="Search models" aria-label="Search AI models" />
        </form>
        <details className="ik-burger">
          <summary aria-label="Open menu">
            <span />
          </summary>
          <nav className="ik-drawer" aria-label="All sections">
            <form className="ik-dsearch" action={`${b}/models`} role="search">
              <SearchIcon />
              <input name="q" type="search" placeholder="Search 400+ AI models" aria-label="Search AI models" />
            </form>
            {[...nav, ...more].map(([label, href]) => (
              <Link href={href} key={label}>
                {label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}

export function Footer({ site }: { site: Site }) {
  const year = new Date().getFullYear();
  const b = sitePrefix(site.id);
  const cols: ReadonlyArray<[string, ReadonlyArray<[string, string]>]> = [
    [
      "Data",
      [
        ["AI model prices", `${b}/models`],
        ["Compare models", `${b}/compare`],
        ["Price changes", `${b}/changes`],
        ["New models", `${b}/new`],
      ],
    ],
    [
      "Tools",
      [
        ["Is it down?", `${b}/status`],
        ["Can I run it?", `${b}/run`],
        ["GPU guide", `${b}/gpu`],
        ["API cost calculator", `${b}/calculators`],
      ],
    ],
    [
      "InfKey",
      [
        ["About", `${b}/about`],
        ["Contact", `${b}/contact`],
        ["Guides", `${b}/archive`],
        ["Privacy Policy", `${b}/privacy`],
        ["Terms", `${b}/terms`],
        ["Disclaimer", `${b}/disclaimer`],
      ],
    ],
  ];
  return (
    <footer className="ik-foot">
      <div className="ik-wrap">
        <div className="ik-foot-top">
          <div className="ik-foot-brand">
            <Logo site={site} />
            <p>Live prices, status and specs for AI models. Refreshed every day.</p>
          </div>
          {cols.map(([h, links]) => (
            <div className="ik-foot-col" key={h}>
              <h2>{h}</h2>
              {links.map(([label, href]) => (
                <Link href={href} key={label}>
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <p className="ik-foot-note" data-nosnippet>
          InfKey is independent and not affiliated with OpenAI, Anthropic, Google, Microsoft or any AI provider; product
          names are trademarks of their owners. Prices are collected from public listings for guidance only and change
          often — confirm on the provider&apos;s site before you pay.
        </p>
        <div className="ik-foot-base">
          <span>© {year} {site.name}</span>
          <span>USD per 1M tokens unless noted</span>
        </div>
      </div>
    </footer>
  );
}

/** Standard page wrapper: header + content column + footer. */
export function InfShell({ site, children }: { site: Site; children: ReactNode }) {
  return (
    <div className={`ai-root ik ${aiFont.variable}`}>
      <Masthead site={site} />
      <main className="ik-main">
        <div className="ik-wrap shell">{children}</div>
      </main>
      <Footer site={site} />
    </div>
  );
}
