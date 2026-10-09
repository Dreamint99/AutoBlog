import "./theme.css";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Site } from "@/lib/types";
import { COUNTRIES, TOPICS, flag } from "./data";
import { gccFont } from "./fonts";

/* GCCGuide app shell: glass top bar with search, a country rail, a mobile
   bottom tab bar (app feel), and a rich footer. Independent — not a government site. */

export function Mark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="gcm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6c453" />
          <stop offset="1" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#gcm)" />
      <path d="M8 29h24M11 29V18l3-3v14M17 29V10l3-3 3 3v19M26 29V15l3 3v11" fill="none" stroke="#0b1020" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="29.5" cy="10.5" r="2.6" fill="#0b1020" />
    </svg>
  );
}

export function Logo({ site }: { site: Site }) {
  return (
    <Link href={`/s/${site.id}`} className="gc-logo" aria-label={`${site.name} home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/gccguide-logo.webp" alt="GCCGuide.com" width={140} height={40} />
    </Link>
  );
}

export function TopBar({ site }: { site: Site }) {
  const b = `/s/${site.id}`;
  return (
    <header className="gc-top">
      <div className="gc-wrap gc-top-in">
        <Logo site={site} />
        <nav className="gc-nav" aria-label="Primary">
          {TOPICS.slice(0, 5).map((t) => (
            <Link key={t.key} href={`${b}/search?q=${encodeURIComponent(t.label.split(" ")[0])}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <form className="gc-search" action={`${b}/search`} role="search">
          <input name="q" type="search" placeholder="Search visas, driving, jobs…" aria-label="Search GCCGuide" />
          <button type="submit" aria-label="Search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <path d="M20 20l-3.6-3.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </form>
      </div>
      <div className="gc-rail">
        <div className="gc-wrap gc-rail-in">
          {COUNTRIES.map((c) => (
            <Link key={c.slug} href={`${b}/country/${c.slug}`} style={{ ["--ca" as string]: c.accent }}>
              <img src={flag(c.iso, 40)} alt="" width={20} height={14} />
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

export function BottomTabs({ site, active = "home" }: { site: Site; active?: string }) {
  const b = `/s/${site.id}`;
  const tabs: [string, string, string, string][] = [
    ["home", "Home", b, "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
    ["countries", "Countries", `${b}#countries`, "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c3 3 3 17 0 20m0-20c-3 3-3 17 0 20M2 12h20"],
    ["tools", "Tools", `${b}#tools`, "M14 7l3-3 3 3-3 3M4 20l9-9M4 14v6h6"],
    ["search", "Search", `${b}/search`, "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16l-4-4"],
  ];
  return (
    <nav className="gc-tabs" aria-label="App navigation">
      {tabs.map(([k, label, href, d]) => (
        <Link key={k} href={href} className={active === k ? "on" : ""}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function Footer({ site }: { site: Site }) {
  const b = `/s/${site.id}`;
  return (
    <footer className="gc-foot">
      <div className="gc-wrap">
        <div className="gc-foot-grid">
          <div>
            <Logo site={site} />
            <p>The all-in-one guide to living, working and travelling in the six Gulf countries — visas, jobs, driving, laws, money and the best things to do.</p>
          </div>
          <div>
            <h4>Countries</h4>
            {COUNTRIES.map((c) => (
              <Link key={c.slug} href={`${b}/country/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </div>
          <div>
            <h4>Guides</h4>
            {TOPICS.map((t) => (
              <Link key={t.key} href={`${b}/search?q=${encodeURIComponent(t.label.split(" ")[0])}`}>
                {t.label}
              </Link>
            ))}
          </div>
          <div>
            <h4>GCCGuide</h4>
            <Link href={`${b}/about`}>About</Link>
            <Link href={`${b}/contact`}>Contact</Link>
            <Link href={`${b}/privacy`}>Privacy Policy</Link>
            <Link href={`${b}/terms`}>Terms</Link>
            <Link href={`${b}/disclaimer`}>Disclaimer</Link>
          </div>
        </div>
        <p className="gc-legal">
          GCCGuide is an independent guide and is not affiliated with any Gulf government, ministry or embassy. Rules, fees and
          visa conditions change — always confirm on the official portal linked on each country page before you apply or pay.
        </p>
        <div className="gc-foot-base">
          <span>© {new Date().getFullYear()} GCCGuide</span>
          <span>Qatar · UAE · Saudi Arabia · Kuwait · Oman · Bahrain</span>
        </div>
      </div>
    </footer>
  );
}

export function GcShell({ site, children, active }: { site: Site; children: ReactNode; active?: string }) {
  return (
    <div className={`gc-root ${gccFont.variable}`}>
      <TopBar site={site} />
      <main className="gc-main">{children}</main>
      <Footer site={site} />
      <BottomTabs site={site} active={active} />
    </div>
  );
}
