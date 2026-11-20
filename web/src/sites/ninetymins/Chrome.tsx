import "./theme.css";
import "./v2.css";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { Site, Article } from "@/lib/types";
import { fontVars } from "./fonts";
import { NM_COMPS, compOf, ago, type NmComp } from "./comps";
import { thumb } from "@/lib/img";
import { AppBanner, AppPopup, AppTopBar } from "./AppPromo";
import { ThemeToggle } from "./Livescore";
import { PLAY_URL } from "./sports";
import { NavMore } from "./NavMore";
import { publicPath, sitePrefix } from "@/lib/public-path";

/* Shared NinetyMins chrome: header (quick links, theme, app, sports row), footer, and the card primitives every page uses. */


export function Badge({ comp }: { comp: NmComp }) {
  return (
    <span className="nm-badge" style={{ background: comp.color }}>
      {comp.short}
    </span>
  );
}

export function Kicker({ comp, siteId }: { comp: NmComp; siteId: string }) {
  return (
    <Link href={publicPath(siteId, `/topic/${comp.slug}`)} className="nm-kicker" style={comp.color === "#111827" ? undefined : ({ "--kc": comp.color } as CSSProperties)}>
      {comp.label}
    </Link>
  );
}

const NAV: Array<[string, string]> = [
  ["", "Live scores"],
  ["/today", "Today"],
  ["/cricket", "Cricket"],
  ["/saff", "SAFF"],
  ["/highlights", "Highlights"],
  ["/live-tv", "Live TV"],
];

const MORE: Array<{ h: string; links: Array<[string, string]> }> = [
  {
    h: "Football",
    links: [
      ["/scores", "All football"],
      ["/league/eng-1", "Premier League"],
      ["/league/uefa-champions", "Champions League"],
      ["/league/esp-1", "LaLiga"],
      ["/league/ita-1", "Serie A"],
      ["/league/ger-1", "Bundesliga"],
    ],
  },
  {
    h: "More sports",
    links: [
      ["/league/nba", "Basketball"],
      ["/league/atp", "Tennis"],
      ["/league/nfl", "NFL"],
      ["/league/nhl", "Hockey"],
      ["/league/mlb", "Baseball"],
      ["/league/ufc", "MMA"],
      ["/league/f1", "Formula 1"],
    ],
  },
  {
    h: "NinetyMins",
    links: [
      ["/tomorrow", "Tomorrow"],
      ["/archive", "Stories"],
      ["/widgets", "Score widgets"],
      ["/about", "About"],
    ],
  },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** The app's "90" mark + wordmark. */
export function Logo({ href, name, className = "nv-logo" }: { href: string; name: string; className?: string }) {
  return (
    <Link href={href} className={className} aria-label={`${name} home`}>
      <span className="nv-logo-90" aria-hidden="true">90</span>
      <span className="nv-logo-word">NinetyMins</span>
    </Link>
  );
}

export function Header({ site }: { site: Site; home?: boolean }) {
  const s = sitePrefix(site.id);
  return (
    <>
      <AppTopBar />
      <header className="nm-hd nv-hd">
        <div className="nm-wrap nv-hd-row">
          <Logo href={s || "/"} name={site.name} />
          <nav className="nv-nav" aria-label="Main">
            {NAV.map(([p, label]) => (
              <Link href={`${s}${p}`} key={label} className={p === "" ? "nv-nav-live" : undefined}>
                {p === "" ? <i className="nv-live-dot" aria-hidden="true" /> : null}
                {label}
              </Link>
            ))}
            <NavMore>
              {MORE.map((g) => (
                <div key={g.h}>
                  <b>{g.h}</b>
                  {g.links.map(([p, label]) => (
                    <Link href={`${s}${p}`} key={p}>
                      {label}
                    </Link>
                  ))}
                </div>
              ))}
            </NavMore>
          </nav>
          <div className="nv-hd-act">
            <Link href={`${s}/search`} className="nv-icon" aria-label="Search">
              <SearchIcon />
            </Link>
            <ThemeToggle />
            <a className="nv-getapp" href={PLAY_URL("header")} target="_blank" rel="noopener" data-google-vignette="false" onClick={() => { try { (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", "app_download_click", { placement: "header", store: "play" }); } catch {} }}>
              Get the app
            </a>
          </div>
        </div>
      </header>
    </>
  );
}

export function Footer({ site }: { site: Site }) {
  const s = sitePrefix(site.id);
  const year = new Date().getFullYear();
  return (
    <footer className="nm-footer nv-footer">
      <div className="nm-wrap">
        <AppBanner variant="footer" medium="footer" />
        <div className="nv-foot-grid">
          <div className="nv-foot-brand">
            <Logo href={s || "/"} name={site.name} />
            <p data-nosnippet="">
              Live scores and legal viewing guides. Not affiliated with any league, club or broadcaster.
            </p>
          </div>
          <div>
            <h4>Scores</h4>
            <ul>
              <li><Link href={s || "/"}>Live scores</Link></li>
              <li><Link href={`${s}/today`}>Today&apos;s matches</Link></li>
              <li><Link href={`${s}/tomorrow`}>Tomorrow</Link></li>
              <li><Link href={`${s}/scores`}>Football</Link></li>
              <li><Link href={`${s}/cricket`}>Cricket</Link></li>
              <li><Link href={`${s}/saff`}>SAFF live centre</Link></li>
            </ul>
          </div>
          <div>
            <h4>Competitions</h4>
            <ul>
              {NM_COMPS.map((c) => (
                <li key={c.slug}>
                  <Link href={`${s}/topic/${c.slug}`}>{c.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Watch</h4>
            <ul>
              <li><Link href={`${s}/live-tv`}>Live TV</Link></li>
              <li><Link href={`${s}/highlights`}>Highlights</Link></li>
              <li><Link href={`${s}/archive`}>All stories</Link></li>
              <li><Link href={`${s}/widgets`}>Score widgets</Link></li>
            </ul>
          </div>
          <div>
            <h4>NinetyMins</h4>
            <ul>
              <li><Link href={`${s}/about`}>About</Link></li>
              <li><Link href={`${s}/contact`}>Contact</Link></li>
              <li><Link href={`${s}/privacy`}>Privacy Policy</Link></li>
              <li><Link href={`${s}/terms`}>Terms</Link></li>
              <li><Link href={`${s}/disclaimer`}>Disclaimer</Link></li>
            </ul>
          </div>
        </div>
        <div className="nv-foot-base">
          <span>© {year} {site.name}</span>
          <span>Never miss a match.</span>
        </div>
      </div>
    </footer>
  );
}

/** Page wrapper: fonts in scope + header + footer. */
export function Shell({ site, strip, home = false, children }: { site: Site; strip?: Article[]; home?: boolean; children: ReactNode }) {
  return (
    <div className={`nm-root nv ${fontVars}`}>
      <a href="#nm-main" className="nm-skip">
        Skip to content
      </a>
      <script
        // Apply the saved light/dark choice before paint (no flash).
        dangerouslySetInnerHTML={{
          __html:
            "try{var t=localStorage.getItem('nm-theme');document.documentElement.dataset.nmTheme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}",
        }}
      />
      <script
        // Hide images that fail to load (dead crests, removed thumbnails); the frame keeps its placeholder.
        dangerouslySetInnerHTML={{
          __html:
            "document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG')t.setAttribute('data-broken','')},true);addEventListener('load',function(){document.querySelectorAll('img').forEach(function(i){if(i.complete&&i.getAttribute('src')&&!i.naturalWidth)i.setAttribute('data-broken','')})})",
        }}
      />
      <Header site={site} home={home} />
      <main id="nm-main">{children}</main>
      <Footer site={site} />
      <AppPopup />
    </div>
  );
}

export function Thumb({ href, article, ratio = "16 / 9", children }: { href: string; article: Article; ratio?: string; children?: ReactNode }) {
  return (
    <Link href={href} className="nm-thumb" style={{ aspectRatio: ratio }} aria-label={article.title} tabIndex={-1}>
      {article.image_url ? <img src={thumb(article.image_url, article.title)} alt={article.title} loading="lazy" decoding="async" /> : <span className="nm-thumb-ph" />}
      {children}
    </Link>
  );
}

/** Standard story card (image, competition kicker, headline, time). */
export function Card({ site, article, dek = false }: { site: Site; article: Article; dek?: boolean }) {
  const href = publicPath(site.id, `/${article.slug}`);
  const c = compOf(article);
  return (
    <article className="nm-card">
      <Thumb href={href} article={article}>
        <span className="nm-card-bar" style={{ background: c.color }} />
      </Thumb>
      <div className="nm-card-body">
        <Kicker comp={c} siteId={site.id} />
        <h3 className="nm-h">
          <Link href={href}>{article.title}</Link>
        </h3>
        {dek && article.excerpt ? <p className="nm-dek">{article.excerpt}</p> : null}
        <span className="nm-time">{ago(article.created_at)} · {article.reading_time} min read</span>
      </div>
    </article>
  );
}
