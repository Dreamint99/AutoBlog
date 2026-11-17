import "./theme.css";
import "./hub/hub.css";
import "./v2.css";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Article, Site } from "@/lib/types";
import { COUNTRIES, TOPICS, countryOf, topicOf, flag } from "./data";
import { gccSans, gccHead } from "./fonts";
import { thumb } from "@/lib/img";
import { publicPath, sitePrefix } from "@/lib/public-path";

/* GCCGuide shell (v2): one light design system. Sticky white bar with the brand
   logo, six sections + More, search; a <details> drawer on phones (no client JS);
   a calm footer. Independent — not a government site. Styles: v2.css (.gv). */

export function Mark() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/gccguide/mark.svg" alt="" width={40} height={40} />;
}

export function Logo({ site }: { site: Site }) {
  return (
    <Link href={publicPath(site.id, "/")} className="gc-logo gv-logo" aria-label={`${site.name} home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/gccguide/logo.svg" alt="GCCGuide" width={475} height={77} />
    </Link>
  );
}

export const ICONS: Record<string, string> = {
  rates: "M4 7h13l-3-3M20 17H7l3 3",
  gold: "M3 18h18l-3-6H6zM7 12l2-5h6l2 5",
  fuel: "M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M3 20h13M5 10h9M14 8l3 2v7a1.5 1.5 0 0 0 3 0V9l-3-3",
  prayer: "M12 3c3 2 5 4.5 5 7.5V20H7v-9.5C7 7.5 9 5 12 3zM4 20h16M12 14v6",
  embassy: "M3 20h18M5 20v-9M9 20v-9M15 20v-9M19 20v-9M3 11h18L12 4z",
  report: "M5 20V4M5 20h15M9 16v-4M13 16V8M17 16v-6",
  calc: "M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01",
  visa: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h3",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4",
  arrow: "M5 12h13M13 6l6 6-6 6",
  chev: "m6 9 6 6 6-6",
  guides: "M4 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z",
};

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="gv-ico">
      <path d={ICONS[name] ?? ICONS.arrow} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV: [string, string][] = [
  ["Exchange rates", "rates"],
  ["Gold", "gold-rate"],
  ["Fuel", "fuel-price"],
  ["Prayer times", "prayer-times"],
  ["Embassies", "embassy"],
  ["Remittance", "reports/remittance"],
];

const MORE_TOOLS: [string, string][] = [
  ["Salary & gratuity calculators", "calculators"],
  ["Visa & residence fees", "visa-fees"],
  ["Public holidays", "public-holidays"],
  ["All guides", "archive"],
];

function SearchForm({ b, className }: { b: string; className: string }) {
  return (
    <form className={className} action={`${b}/search`} role="search">
      <Icon name="search" size={18} />
      <input name="q" type="search" placeholder="Search visas, driving, jobs…" aria-label="Search GCCGuide" />
    </form>
  );
}

export function TopBar({ site }: { site: Site }) {
  const b = sitePrefix(site.id);
  return (
    <header className="gv-bar">
      <div className="gv-wrap gv-bar-in">
        <Logo site={site} />
        <nav className="gv-nav" aria-label="Primary">
          {NAV.map(([label, p]) => (
            <Link key={p} href={`${b}/${p}`}>
              {label}
            </Link>
          ))}
          <details className="gv-more">
            <summary>
              More <Icon name="chev" size={16} />
            </summary>
            <div className="gv-more-menu">
              <div>
                <h4>Countries</h4>
                {COUNTRIES.map((c) => (
                  <Link key={c.slug} href={`${b}/country/${c.slug}`}>
                    <img src={flag(c.iso, 40)} alt="" width={20} height={14} />
                    {c.name}
                  </Link>
                ))}
              </div>
              <div>
                <h4>Tools</h4>
                {MORE_TOOLS.map(([label, p]) => (
                  <Link key={p} href={`${b}/${p}`}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </details>
        </nav>
        <SearchForm b={b} className="gv-search" />
        <details className="gv-burger">
          <summary aria-label="Menu">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </summary>
          <div className="gv-drawer">
            <SearchForm b={b} className="gv-search gv-search-m" />
            <div className="gv-drawer-grid">
              {NAV.map(([label, p]) => (
                <Link key={p} href={`${b}/${p}`}>
                  {label}
                </Link>
              ))}
              {MORE_TOOLS.map(([label, p]) => (
                <Link key={p} href={`${b}/${p}`}>
                  {label}
                </Link>
              ))}
            </div>
            <div className="gv-drawer-flags">
              {COUNTRIES.map((c) => (
                <Link key={c.slug} href={`${b}/country/${c.slug}`}>
                  <img src={flag(c.iso, 40)} alt="" width={20} height={14} />
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

/** Uniform guide card used on home, country, article "read next" and search. */
export function GuideCard({ site, a }: { site: Site; a: Article }) {
  const c = countryOf(a);
  const t = topicOf(a);
  const href = publicPath(site.id, `/${a.slug}`);
  const img = a.image_url ? thumb(a.image_url, a.title) : "";
  return (
    <article className="gv-card">
      <Link href={href} className="gv-card-media" tabIndex={-1} aria-hidden="true">
        {img ? <img src={img} alt="" loading="lazy" decoding="async" /> : <span className="gv-card-ph"><Icon name="guides" size={28} /></span>}
      </Link>
      <div className="gv-card-body">
        <span className="gv-kicker">
          {c ? <img src={flag(c.iso, 40)} alt="" width={16} height={11} /> : null}
          {t.label}
        </span>
        <h3>
          <Link href={href}>{a.title}</Link>
        </h3>
        <span className="gv-meta">{a.reading_time} min read</span>
      </div>
    </article>
  );
}

// Footer boilerplate carries data-nosnippet: Google was quoting the legal line
// ("GCCGuide is an independent guide…") as the search snippet for every article.
export function Footer({ site }: { site: Site }) {
  const b = sitePrefix(site.id);
  return (
    <footer className="gv-foot">
      <div className="gv-wrap">
        <div className="gv-foot-grid">
          <div className="gv-foot-brand">
            <Logo site={site} />
            <p data-nosnippet>Visas, jobs, driving, money and daily rates for the six Gulf countries — sourced and dated.</p>
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
            <h4>Live data</h4>
            <Link href={`${b}/rates`}>Exchange rates</Link>
            <Link href={`${b}/reports/remittance`}>Remittance reports</Link>
            <Link href={`${b}/gold-rate`}>Gold rates</Link>
            <Link href={`${b}/fuel-price`}>Fuel prices</Link>
            <Link href={`${b}/prayer-times`}>Prayer times</Link>
            <Link href={`${b}/embassy`}>Embassies</Link>
            <Link href={`${b}/visa-fees`}>Visa fees</Link>
            <Link href={`${b}/public-holidays`}>Public holidays</Link>
            <Link href={`${b}/calculators`}>Calculators</Link>
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
            <h4>About</h4>
            <Link href={`${b}/about`}>About</Link>
            <Link href={`${b}/contact`}>Contact</Link>
            <Link href={`${b}/privacy`}>Privacy Policy</Link>
            <Link href={`${b}/terms`}>Terms</Link>
            <Link href={`${b}/disclaimer`}>Disclaimer</Link>
            <Link href={`${b}/archive`}>All articles</Link>
          </div>
        </div>
        <p className="gv-legal" data-nosnippet>
          GCCGuide is an independent guide and is not affiliated with any Gulf government, ministry or embassy. Rules, fees and
          visa conditions change — always confirm on the official portal linked on each country page before you apply or pay.
        </p>
        <div className="gv-foot-base" data-nosnippet>
          <span>© {new Date().getFullYear()} GCCGuide</span>
          <span>Qatar · UAE · Saudi Arabia · Kuwait · Oman · Bahrain</span>
        </div>
      </div>
    </footer>
  );
}

export function GcShell({ site, children }: { site: Site; children: ReactNode; active?: string }) {
  return (
    <div className={`gc-root gv ${gccSans.variable} ${gccHead.variable}`}>
      <TopBar site={site} />
      <main className="gc-main gv-main">{children}</main>
      <Footer site={site} />
    </div>
  );
}
