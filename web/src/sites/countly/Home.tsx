import "./theme.css";
import "./editorial.css";
import "./bold.css";
import "./data.css";
import "./v2.css";
import DataHero from "./DataHero";
import Link from "next/link";
import { fontVars } from "./fonts";
import { top10Articles, topNumber, CN_CATEGORIES } from "./categories";
import LiveTicker from "./LiveTicker";
import NewsletterForm from "./NewsletterForm";
import HouseAd from "./HouseAd";
import type { SiteHomeProps, Article } from "@/lib/types";
import { heroSrc, thumb } from "@/lib/img";

/** Countly feature image: always the data-art built from the title (the /card/ path, which
 *  img.ts renders as art on countly). The auto-picked stock photos were often off-topic. The
 *  article's og:image (image_url) is unchanged. */
const src = (a: Article) => `/card/${a.slug}`;

/** Root class for every Countly page: fonts + the v2 design layer (`cv`). */
export const rootClass = `cn-root cv ${fontVars}`;

/* ────────────────────────────────────────────────────────────
   Inline icons (no client JS, no extra packages)
   ──────────────────────────────────────────────────────────── */
export function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function IconArrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function IconCompass() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" fill="currentColor" opacity=".25" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const WEALTH = /richest|billionaire|net worth|wealthiest|fortune/i;

/* Front-page desk for a story, judged on its title + tags only (the topic pages'
   matcher also reads the excerpt, which files e.g. an ecommerce report under AI just
   because its summary mentions ChatGPT). First rule that matches wins. */
const DESK_RULES: Array<[string, RegExp]> = [
  ["social-media", /\b(social media|facebook|instagram|tiktok|youtube|twitter|x users|whatsapp|snapchat|linkedin|reddit|telegram|threads)\b/i],
  ["ai-chatgpt", /\b(ai|chatgpt|openai|gpt|llm|gemini|claude|artificial intelligence|machine learning|generative)\b/i],
  ["internet", /\b(internet|website|ecommerce|e-commerce|online|broadband|apps?|downloads?|digital|smartphone|mobile)\b/i],
  ["companies", /\b(compan(y|ies)|revenue|employees?|workforce|stores?|retail(ers)?|startups?|unicorns?|brands?|banks?|chains?|industry|market cap)\b/i],
  ["countries", /\b(countr(y|ies)|population|gdp|per capita|nations?|by country)\b/i],
];

function deskOf(a: Article): string {
  // Title first: the AI writer tags almost everything "AI"/"ChatGPT", so tags only
  // break the tie when the title itself says nothing.
  for (const hay of [a.title, a.tags.join(" ")]) {
    for (const [slug, re] of DESK_RULES) if (re.test(hay)) return slug;
    if (/top\s*\d|ranking|largest|biggest|most |best /i.test(hay)) return "rankings";
  }
  return "";
}

/** Section label shown above a headline (kicker). */
export function kickerOf(a: Article): string {
  if (WEALTH.test(a.title)) return "Wealth";
  const slug = deskOf(a);
  return CN_CATEGORIES.find((c) => c.slug === slug)?.label || "Data";
}

/** Hands out articles in order, never the same one twice on the page. Real (non-mock)
 *  reports go first so the prominent slots carry the strongest pieces. */
function picker(all: Article[]) {
  const used = new Set<string>();
  const pool = [...all.filter((a) => !a.is_mock), ...all.filter((a) => a.is_mock)];
  return (from: Article[] | null, n: number): Article[] => {
    const src = from ?? pool;
    const out: Article[] = [];
    for (const a of src) {
      if (out.length >= n) break;
      if (used.has(a.id) || (from && a.is_mock)) continue;
      used.add(a.id);
      out.push(a);
    }
    return out;
  };
}

/* ────────────────────────────────────────────────────────────
   Shared header — slim live ticker + sticky white bar. Used by Home
   and every other Countly page (topic, Top 10, search, info, data…).
   No client JS: "More" and the mobile menu are <details> disclosures.
   ──────────────────────────────────────────────────────────── */
const PRIMARY: Array<[string, string]> = [
  ["/data", "Country Data"],
  ["/top10", "Top 10"],
  ["/search?q=richest", "Wealth"],
  ["/topic/ai-chatgpt", "AI"],
  ["/topic/social-media", "Social"],
  ["/topic/companies", "Companies"],
];
const MORE: Array<[string, string]> = [
  ["/topic/internet", "Internet"],
  ["/topic/countries", "Countries"],
  ["/topic/rankings", "Rankings"],
  ["/crypto", "Crypto prices"],
  ["/currency-converter", "Currency converter"],
  ["/best-ai-tools", "Best AI tools"],
];

export function CnHeader({ site }: { site: { id: string; name: string } }) {
  const s = `/s/${site.id}`;
  return (
    <>
      <LiveTicker />
      <header className="cv-bar">
        <div className="cv-wrap cv-bar-in">
          <details className="cv-burger">
            <summary aria-label="Open menu">
              <IconMenu />
            </summary>
            <nav className="cv-drawer" aria-label="All sections">
              <Link href={s}>Latest</Link>
              {[...PRIMARY, ...MORE].map(([h, l]) => (
                <Link href={`${s}${h}`} key={h}>
                  {l}
                </Link>
              ))}
            </nav>
          </details>

          <Link href={s} className="cv-logo" aria-label={`${site.name} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/countly-mark-96.webp" alt="" width={40} height={40} />
            <span className="cv-word">
              <b>Countly</b>
              <small>The world in numbers</small>
            </span>
          </Link>

          <nav className="cv-nav" aria-label="Sections">
            {PRIMARY.map(([h, l]) => (
              <Link href={`${s}${h}`} key={h}>
                {l}
              </Link>
            ))}
            <details className="cv-more">
              <summary>
                More <IconDown />
              </summary>
              <div className="cv-more-menu">
                {MORE.map(([h, l]) => (
                  <Link href={`${s}${h}`} key={h}>
                    {l}
                  </Link>
                ))}
              </div>
            </details>
          </nav>

          <form className="cv-search" action={`${s}/search`} method="get" role="search">
            <IconSearch />
            <input type="search" name="q" placeholder="Search data" aria-label="Search" />
          </form>
          <Link href={`${s}/search`} className="cv-search-btn" aria-label="Search">
            <IconSearch />
          </Link>
        </div>
      </header>
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Cards
   ──────────────────────────────────────────────────────────── */
function Art({ a, priority = false }: { a: Article; priority?: boolean }) {
  return priority ? (
    <img src={heroSrc(src(a), a.title)} alt={a.title} width={1200} height={630} fetchPriority="high" />
  ) : (
    <img src={thumb(src(a), a.title)} alt={a.title} width={600} height={315} loading="lazy" decoding="async" />
  );
}

/** The one story card used across the site: art, category tag, headline, date. */
export function Card({ siteId, article, priority = false }: { siteId: string; article: Article; priority?: boolean }) {
  const href = `/s/${siteId}/${article.slug}`;
  return (
    <article className="cv-card">
      <Link href={href} className="cv-card-art" tabIndex={-1} aria-hidden="true">
        <Art a={article} priority={priority} />
      </Link>
      <span className="cv-tag">{kickerOf(article)}</span>
      <h3>
        <Link href={href}>{article.title}</Link>
      </h3>
      <time dateTime={article.created_at}>{fmtDate(article.created_at)}</time>
    </article>
  );
}

/** Kept for the topic / search pages (same signature as before), now the v2 card. */
export function StatCard({ siteId, article }: { siteId: string; article: Article; index?: number }) {
  return <Card siteId={siteId} article={article} />;
}

function SecHead({ title, href, more = "See all" }: { title: string; href?: string; more?: string }) {
  return (
    <div className="cv-sechead">
      <h2>{title}</h2>
      {href ? (
        <Link href={href} className="cv-seeall">
          {more} <IconArrow />
        </Link>
      ) : null}
    </div>
  );
}

const DESKS = ["ai-chatgpt", "social-media", "companies", "internet", "countries", "rankings"];

/* ────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */
export default function Home({ site, articles }: SiteHomeProps) {
  const s = `/s/${site.id}`;
  const href = (a: Article) => `${s}/${a.slug}`;
  const take = picker(articles);

  const [lead] = take(null, 1);
  const trending = take(null, 5);
  const lists = take(top10Articles(articles), 6);
  const wealth = take(articles.filter((a) => WEALTH.test(a.title)), 4);
  const desks = DESKS.map((slug) => ({
    cat: CN_CATEGORIES.find((c) => c.slug === slug)!,
    items: take(articles.filter((a) => !WEALTH.test(a.title) && deskOf(a) === slug), 4),
  })).filter((d) => d.items.length >= 2);
  const latest = take(null, 8);

  return (
    <div className={rootClass}>
      <CnHeader site={site} />

      <main>
        {articles.length === 0 ? (
          <section className="cv-sec">
            <div className="cv-wrap">
              <div className="cn-emptywrap">
                <span className="cn-empty-ico">
                  <IconCompass />
                </span>
                <h3>New data reports are on the way</h3>
                <p>We&apos;re compiling sourced, dated statistics on AI, social media, companies and countries.</p>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── HERO: featured story + trending ── */}
        {lead ? (
          <section className="cv-sec cv-hero" aria-label="Top stories">
            <div className="cv-wrap cv-hero-grid">
              <article className="cv-feature">
                <Link href={href(lead)} className="cv-card-art" tabIndex={-1} aria-hidden="true">
                  <Art a={lead} priority />
                </Link>
                <div className="cv-feature-body">
                  <span className="cv-tag">{kickerOf(lead)}</span>
                  <h1>
                    <Link href={href(lead)}>{lead.title}</Link>
                  </h1>
                  <p className="cv-dek">{lead.excerpt || lead.meta_description}</p>
                  <div className="cv-meta">
                    <span>Countly Data Desk</span>
                    <time dateTime={lead.created_at}>{fmtDate(lead.created_at)}</time>
                    {lead.reading_time ? (
                      <span>
                        <IconClock /> {lead.reading_time} min read
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>

              <aside className="cv-trending" aria-label="Trending">
                <h2 className="cv-label">Trending</h2>
                <ol>
                  {trending.map((a, i) => (
                    <li key={a.id}>
                      <span className="cv-num">{i + 1}</span>
                      <div>
                        <span className="cv-tag">{kickerOf(a)}</span>
                        <Link href={href(a)}>{a.title}</Link>
                      </div>
                    </li>
                  ))}
                </ol>
              </aside>
            </div>
          </section>
        ) : null}

        {/* ── WORLD IN NUMBERS ── */}
        <DataHero s={s} />

        {/* ── WEALTH ── */}
        {wealth.length >= 2 ? (
          <section className="cv-sec" aria-label="Wealth">
            <div className="cv-wrap">
              <SecHead title="Wealth & Billionaires" href={`${s}/search?q=richest`} />
              <div className="cv-grid">
                {wealth.map((a) => (
                  <Card siteId={site.id} article={a} key={a.id} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── TOP 10 LISTS ── */}
        {lists.length ? (
          <section className="cv-sec" aria-label="Top 10 lists">
            <div className="cv-wrap">
              <SecHead title="The Countly Lists" href={`${s}/top10`} more="All Top 10 lists" />
              <ol className="cv-lists">
                {lists.map((a, i) => (
                  <li key={a.id}>
                    <Link href={href(a)}>
                      <span className="cv-num">{String(i + 1).padStart(2, "0")}</span>
                      <span>
                        <b>{a.title}</b>
                        <small>
                          Top {topNumber(a.title)} · {fmtDate(a.created_at)}
                        </small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        {/* ── TOPIC DESKS ── */}
        {desks.map(({ cat, items }) => (
          <section className="cv-sec" key={cat.slug} aria-label={cat.label}>
            <div className="cv-wrap">
              <SecHead title={cat.label} href={`${s}/topic/${cat.slug}`} />
              <div className="cv-grid">
                {items.map((a) => (
                  <Card siteId={site.id} article={a} key={a.id} />
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* ── TOOLS ── */}
        <section className="cv-sec" aria-label="Tools">
          <div className="cv-wrap">
            <SecHead title="Live tools" />
            <div className="cv-tools">
              <Link href={`${s}/crypto`}>
                <b>Crypto prices</b>
                <small>Live market data</small>
              </Link>
              <Link href={`${s}/currency-converter`}>
                <b>Currency converter</b>
                <small>Daily exchange rates</small>
              </Link>
              <Link href={`${s}/data/compare`}>
                <b>Compare countries</b>
                <small>Population &amp; economy</small>
              </Link>
              <Link href={`${s}/best-ai-tools`}>
                <b>Best AI tools</b>
                <small>Ranked &amp; reviewed</small>
              </Link>
            </div>
          </div>
        </section>

        {/* ── LATEST ── */}
        {latest.length ? (
          <section className="cv-sec" aria-label="Latest">
            <div className="cv-wrap">
              <SecHead title="Latest reports" href={`${s}/archive`} more="All reports" />
              <div className="cv-grid">
                {latest.map((a) => (
                  <Card siteId={site.id} article={a} key={a.id} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <div id="cn-newsletter">
          <NewsletterForm />
        </div>
      </main>
      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Footer (shared by every Countly page)
   ──────────────────────────────────────────────────────────── */
export function SiteFooter({ siteName, siteId, domain }: { siteName: string; siteId: string; domain: string }) {
  const year = new Date().getFullYear();
  const s = `/s/${siteId}`;
  return (
    <footer className="cv-footer">
      <div className="cv-wrap">
        <HouseAd />
        <div className="cv-foot-top">
          <div className="cv-foot-brand">
            <Link href={s} className="cv-logo" aria-label={`${siteName} home`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/countly-mark-96.webp" alt="" width={36} height={36} loading="lazy" />
              <span className="cv-word">
                <b>Countly</b>
                <small>The world in numbers</small>
              </span>
            </Link>
            <p>
              {siteName} is an independent data &amp; statistics publication covering technology, AI, social media,
              companies, countries and global markets. We are not affiliated with any analytics company.
            </p>
          </div>
          <div>
            <h4>Topics</h4>
            <ul>
              <li><Link href={`${s}/topic/ai-chatgpt`}>AI &amp; ChatGPT</Link></li>
              <li><Link href={`${s}/topic/social-media`}>Social media</Link></li>
              <li><Link href={`${s}/topic/companies`}>Companies</Link></li>
              <li><Link href={`${s}/topic/internet`}>Internet</Link></li>
              <li><Link href={`${s}/topic/countries`}>Countries</Link></li>
            </ul>
          </div>
          <div>
            <h4>Data</h4>
            <ul>
              <li><Link href={`${s}/data`}>Country data</Link></li>
              <li><Link href={`${s}/top10`}>Top 10 lists</Link></li>
              <li><Link href={`${s}/crypto`}>Crypto prices</Link></li>
              <li><Link href={`${s}/currency-converter`}>Currency converter</Link></li>
              <li><Link href={`${s}/archive`}>All articles</Link></li>
            </ul>
          </div>
          <div>
            <h4>About</h4>
            <ul>
              <li><Link href={`${s}/about`}>About us</Link></li>
              <li><Link href={`${s}/contact`}>Contact</Link></li>
              <li><Link href={`${s}/privacy`}>Privacy Policy</Link></li>
              <li><Link href={`${s}/terms`}>Terms of Service</Link></li>
              <li><Link href={`${s}/disclaimer`}>Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        <p className="cv-foot-note" data-nosnippet>
          <b>About the data.</b> Statistics on {siteName} are best-available figures compiled from public sources and
          include estimates where exact numbers are not published. They are provided for general information only, may
          contain errors, and change over time. Always confirm against the original source before citing or making
          decisions based on these numbers.
        </p>

        <div className="cv-foot-bottom">
          <span>
            © {year} {siteName}
            {domain ? ` · ${domain}` : ""}
          </span>
          <span>Data that explains the world.</span>
        </div>
      </div>
    </footer>
  );
}
