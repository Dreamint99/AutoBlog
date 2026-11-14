import "./theme.css";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Site, Article } from "@/lib/types";
import { fontVars } from "./fonts";
import { NM_COMPS, compOf, ago, type NmComp } from "./comps";
import { thumb } from "@/lib/img";
import { AppBanner, AppPopup, AppTopBar } from "./AppPromo";
import { ThemeToggle } from "./Livescore";
import { PLAY_URL } from "./sports";

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
    <Link href={`/s/${siteId}/topic/${comp.slug}`} className="nm-kicker" style={{ color: comp.color === "#111827" ? undefined : comp.color }}>
      {comp.label}
    </Link>
  );
}

const SPORT_NAV: Array<[string, string]> = [
  ["/scores", "Football"],
  ["/cricket", "Cricket"],
  ["/saff", "SAFF"],
  ["/league/uefa-champions", "Champions League"],
  ["/league/eng-1", "Premier League"],
  ["/league/nba", "Basketball"],
  ["/league/atp", "Tennis"],
  ["/league/nhl", "Hockey"],
  ["/league/nfl", "NFL"],
  ["/league/mlb", "Baseball"],
  ["/league/ufc", "MMA"],
  ["/league/f1", "F1"],
];

export function Header({ site }: { site: Site; home?: boolean }) {
  const s = `/s/${site.id}`;
  return (
    <>
      <AppTopBar />
      <header className="nm-hd">
        <div className="nm-wrap nm-hd-row">
          <Link href={s} className="nm-hd-logo" aria-label={`${site.name} home`}>
            <span className="nm-hd-90" aria-hidden="true">90</span>
            <span className="nm-hd-word">NinetyMins</span>
          </Link>
          <nav className="nm-hd-quick" aria-label="Main">
            <Link href={s} className="nm-hd-live">
              <i className="nm-dot" aria-hidden="true" />
              Live scores
            </Link>
            <Link href={`${s}/today`}>Today</Link>
            <Link href={`${s}/tomorrow`}>Tomorrow</Link>
            <Link href={`${s}/archive`}>Stories</Link>
          </nav>
          <div className="nm-hd-act">
            <ThemeToggle />
            <a className="nm-hd-app" href={PLAY_URL("header")} target="_blank" rel="noopener">
              Get the app
            </a>
          </div>
        </div>
        <nav className="nm-hd-sports" aria-label="Sports and competitions">
          <div className="nm-wrap nm-hd-sports-in">
            {SPORT_NAV.map(([path, label]) => (
              <Link href={`${s}${path}`} key={path}>
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}

export function Footer({ site }: { site: Site }) {
  const s = `/s/${site.id}`;
  const year = new Date().getFullYear();
  return (
    <footer className="nm-footer">
      <div className="nm-wrap">
        <AppBanner variant="footer" medium="footer" />
        <div className="nm-foot-grid">
          <div>
            <Link href={s} className="nm-logo" aria-label={`${site.name} home`}>
              <span className="nm-hd-90" aria-hidden="true">90</span>
              <span className="nm-hd-word">NinetyMins</span>
            </Link>
            <p>
              Independent viewing guides: dates, kick-off times by timezone and legal ways to watch. We are not
              affiliated with any league, club or broadcaster — always confirm with the official rights holder.
            </p>
          </div>
          <div>
            <h4>Competitions</h4>
            <ul>
              {NM_COMPS.slice(0, 5).map((c) => (
                <li key={c.slug}>
                  <Link href={`${s}/topic/${c.slug}`}>{c.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>More sports</h4>
            <ul>
              {NM_COMPS.slice(5).map((c) => (
                <li key={c.slug}>
                  <Link href={`${s}/topic/${c.slug}`}>{c.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>NinetyMins</h4>
            <ul>
              <li><Link href={`${s}/scores`}>Live scores</Link></li>
              <li><Link href={`${s}/today`}>Today&apos;s matches</Link></li>
              <li><Link href={`${s}/saff`}>SAFF live centre</Link></li>
              <li><Link href={`${s}/about`}>About</Link></li>
              <li><Link href={`${s}/contact`}>Contact</Link></li>
              <li><Link href={`${s}/privacy`}>Privacy Policy</Link></li>
              <li><Link href={`${s}/terms`}>Terms</Link></li>
              <li><Link href={`${s}/disclaimer`}>Disclaimer</Link></li>
              <li><Link href={`${s}/archive`}>All articles</Link></li>
            </ul>
          </div>
        </div>
        <div className="nm-foot-base">
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
    <div className={`nm-root ${fontVars}`}>
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
  const href = `/s/${site.id}/${article.slug}`;
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
