import "./theme.css";
import "./editorial.css";
import Link from "next/link";
import { fontVars } from "./fonts";
import { top10Articles, topNumber, CN_CATEGORIES } from "./categories";
import LiveTicker from "./LiveTicker";
import NewsletterForm from "./NewsletterForm";
import HouseAd from "./HouseAd";
import type { SiteHomeProps, Article } from "@/lib/types";

/* ────────────────────────────────────────────────────────────
   Inline icons (no client JS, no extra packages)
   ──────────────────────────────────────────────────────────── */
function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="7" y="12" width="3" height="5" rx="0.6" fill="currentColor" opacity=".25" />
      <rect x="7" y="12" width="3" height="5" rx="0.6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12.5" y="8" width="3" height="9" rx="0.6" fill="currentColor" opacity=".25" />
      <rect x="12.5" y="8" width="3" height="9" rx="0.6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="5" width="3" height="12" rx="0.6" fill="currentColor" opacity=".25" />
      <rect x="18" y="5" width="3" height="12" rx="0.6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
export function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

/** Section label shown above a headline (Forbes-style kicker). */
function kickerOf(a: Article): string {
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

function todayLine(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

/* ────────────────────────────────────────────────────────────
   Shared header — masthead + section rail. Used by Home and every
   other Countly page (topic, Top 10, search, info, AI tools).
   ──────────────────────────────────────────────────────────── */
export function CnHeader({ site }: { site: { id: string; name: string } }) {
  const s = `/s/${site.id}`;
  return (
    <header className="cx-masthead">
      <div className="cx-util">
        <div className="cx-wrap">
          <span className="cx-util-date">{todayLine()}</span>
          <div className="cx-util-links">
            <Link href={`${s}/top10`}>The Lists</Link>
            <Link href={`${s}/best-ai-tools`}>Best AI Tools</Link>
            <a href="#cn-newsletter">Newsletter</a>
          </div>
        </div>
      </div>
      <div className="cx-brandrow">
        <Link href={s} className="cx-logo" aria-label={`${site.name} home`}>
          <b>
            Count<span>ly</span>
          </b>
          <small>The World in Numbers</small>
        </Link>
      </div>
      <div className="cx-navrow">
        <div className="cx-wrap">
          <nav className="cx-nav" aria-label="Sections">
            <Link href={s}>Latest</Link>
            <Link href={`${s}/top10`} className="cx-nav-gold">
              Top 10 Lists
            </Link>
            <Link href={`${s}/search?q=richest`}>Wealth</Link>
            <Link href={`${s}/topic/ai-chatgpt`}>AI</Link>
            <Link href={`${s}/topic/social-media`}>Social</Link>
            <Link href={`${s}/topic/companies`}>Companies</Link>
            <Link href={`${s}/topic/internet`}>Internet</Link>
            <Link href={`${s}/topic/countries`}>Countries</Link>
            <Link href={`${s}/topic/rankings`}>Rankings</Link>
            <Link href={`${s}/crypto`}>Crypto</Link>
            <Link href={`${s}/currency-converter`}>Converter</Link>
            <Link href={`${s}/best-ai-tools`}>AI Tools</Link>
          </nav>
          <form className="cx-navsearch" action={`${s}/search`} method="get" role="search">
            <IconSearch />
            <input type="search" name="q" placeholder="Search data…" aria-label="Search" />
          </form>
        </div>
      </div>
      <div className="cx-disclaim">
        Independent data &amp; statistics — best-available figures compiled from public sources. Verify before citing.
      </div>
    </header>
  );
}

function Byline({ article }: { article: Article }) {
  return (
    <div className="cx-byline">
      <b>Countly Data Desk</b>
      <span>·</span>
      <span>{fmtDate(article.created_at)}</span>
      {article.reading_time ? (
        <>
          <span>·</span>
          <span>{article.reading_time} min read</span>
        </>
      ) : null}
    </div>
  );
}

function Img({ href, article, className = "", badge }: { href: string; article: Article; className?: string; badge?: string }) {
  return (
    <Link href={href} className={`cx-img ${className}`} aria-label={article.title} tabIndex={-1}>
      {article.image_url ? <img src={article.image_url} alt="" loading="lazy" /> : null}
      {badge ? <span className="cx-badge">{badge}</span> : null}
    </Link>
  );
}

/* Kept for the topic / search pages, which still use the card grid. */
function ArticleMeta({ article }: { article: Article }) {
  return (
    <div className="cn-meta">
      <span>
        <IconClock />
        {article.reading_time} min read
      </span>
      <span className="cn-dot" aria-hidden="true" />
      <span>
        <IconCalendar />
        {fmtDate(article.created_at)}
      </span>
    </div>
  );
}

function CardChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="cn-chips">
      {tags.slice(0, 2).map((t) => (
        <span className="cn-chip" key={t}>
          {t}
        </span>
      ))}
    </div>
  );
}

export function StatCard({ siteId, article, index }: { siteId: string; article: Article; index: number }) {
  const href = `/s/${siteId}/${article.slug}`;
  return (
    <article className="cn-card">
      <Link href={href} className="cn-card-media" aria-label={article.title}>
        {article.image_url ? <img src={article.image_url} alt={article.title} loading="lazy" /> : <span aria-hidden="true" />}
        <span className="cn-card-index" aria-hidden="true">
          {String(index).padStart(2, "0")}
        </span>
      </Link>
      <div className="cn-card-body">
        <CardChips tags={article.tags} />
        <h3>
          <Link href={href}>{article.title}</Link>
        </h3>
        <p className="cn-excerpt">{article.excerpt || article.meta_description}</p>
        <div className="cn-card-foot">
          <ArticleMeta article={article} />
        </div>
      </div>
    </article>
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
  const topStories = take(null, 4);
  const lists = take(top10Articles(articles), 6);
  const wealthAll = articles.filter((a) => WEALTH.test(a.title));
  const wealth = take(wealthAll, 6);
  const desks = DESKS.map((slug) => ({
    cat: CN_CATEGORIES.find((c) => c.slug === slug)!,
    items: take(articles.filter((a) => !WEALTH.test(a.title) && deskOf(a) === slug), 4),
  })).filter((d) => d.items.length >= 2);
  const river = take(null, 14);

  const reportsCount = articles.length;
  const countryCount = articles.filter((a) => /richest people in /i.test(a.title)).length;
  const topListCount = top10Articles(articles).length;
  const updated = articles[0] ? fmtDate(articles[0].created_at) : fmtDate(new Date().toISOString());

  return (
    <div className={`cn-root ${fontVars}`}>
      <LiveTicker />
      <CnHeader site={site} />

      {articles.length === 0 ? (
        <section className="cx-sec">
          <div className="cx-wrap">
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

      {/* ── LEAD PACKAGE ── */}
      {lead ? (
        <div className="cx-wrap">
          <section className="cx-lead" aria-label="Top stories">
            <div>
              <div className="cx-colhead">Top Stories</div>
              <div className="cx-stack">
                {topStories.map((a, i) => (
                  <article className="cx-stack-item" key={a.id}>
                    {i === 0 ? <Img href={href(a)} article={a} /> : null}
                    <span className="cx-kicker">{kickerOf(a)}</span>
                    <h3 className="cx-hl">
                      <Link href={href(a)}>{a.title}</Link>
                    </h3>
                    <div className="cx-byline">{fmtDate(a.created_at)}</div>
                  </article>
                ))}
              </div>
            </div>

            <article className="cx-leadstory">
              <Img href={href(lead)} article={lead} badge="Data report" />
              <span className="cx-kicker">{kickerOf(lead)}</span>
              <h1 className="cx-hl">
                <Link href={href(lead)}>{lead.title}</Link>
              </h1>
              <p className="cx-dek">{lead.excerpt || lead.meta_description}</p>
              <Byline article={lead} />
            </article>

            <aside>
              <div className="cx-colhead">The Countly Lists</div>
              <div className="cx-lists">
                {lists.map((a, i) => (
                  <Link href={href(a)} className="cx-listitem" key={a.id}>
                    <span className="cx-listnum">{i + 1}</span>
                    <span>
                      <b>{a.title}</b>
                      <small>Top {topNumber(a.title)} · {fmtDate(a.created_at)}</small>
                    </span>
                  </Link>
                ))}
              </div>
              <div className="cx-tools">
                <span className="cx-kicker gold">Live tools</span>
                <Link href={`${s}/crypto`}>
                  Crypto prices <span>›</span>
                </Link>
                <Link href={`${s}/currency-converter`}>
                  Currency converter <span>›</span>
                </Link>
                <Link href={`${s}/best-ai-tools`}>
                  Best AI tools ranked <span>›</span>
                </Link>
                <Link href={`${s}/top10`}>
                  All Top 10 lists <span>›</span>
                </Link>
              </div>
            </aside>
          </section>
        </div>
      ) : null}

      {/* ── BY THE NUMBERS ── */}
      {articles.length ? (
        <section className="cx-numbers" aria-label="Countly by the numbers">
          <div className="cx-wrap">
            <div className="cx-num">
              <b>{reportsCount.toLocaleString("en-US")}</b>
              <span>Data reports</span>
            </div>
            <div className="cx-num">
              <b>{topListCount}</b>
              <span>Ranked lists</span>
            </div>
            <div className="cx-num">
              <b>{countryCount}</b>
              <span>Country rich lists</span>
            </div>
            <div className="cx-num">
              <b>Daily</b>
              <span>Updated {updated}</span>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── WEALTH BAND ── */}
      {wealth.length >= 3 ? (
        <section className="cx-wealth" aria-label="Wealth">
          <div className="cx-wrap">
            <div className="cx-sechead">
              <h2>
                Wealth &amp; <em>Billionaires</em>
              </h2>
              <Link href={`${s}/search?q=richest`} className="cx-more">
                All rich lists →
              </Link>
            </div>
            <div className="cx-wealth-grid">
              <article className="cx-wealth-lead">
                <Img href={href(wealth[0])} article={wealth[0]} />
                <span className="cx-kicker gold">The Rich List</span>
                <h3 className="cx-hl">
                  <Link href={href(wealth[0])}>{wealth[0].title}</Link>
                </h3>
                <p className="cx-dek">{wealth[0].excerpt || wealth[0].meta_description}</p>
              </article>
              <div className="cx-wealth-list">
                {wealth.slice(1).map((a, i) => (
                  <Link href={href(a)} key={a.id}>
                    <span className="cx-rank">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <b>{a.title}</b>
                      <small>{fmtDate(a.created_at)}</small>
                    </span>
                    <span className="cx-img cx-thumb">
                      {a.image_url ? <img src={a.image_url} alt="" loading="lazy" /> : null}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── TOPIC DESKS ── */}
      {desks.length ? (
        <section className="cx-sec">
          <div className="cx-wrap cx-desks">
            {desks.map(({ cat, items }) => {
              const [top, ...more] = items;
              return (
                <div className="cx-desk" key={cat.slug}>
                  <div className="cx-sechead">
                    <h2>{cat.label}</h2>
                    <Link href={`${s}/topic/${cat.slug}`} className="cx-more">
                      More →
                    </Link>
                  </div>
                  <article className="cx-desk-top">
                    <Img href={href(top)} article={top} />
                    <div>
                      <h3 className="cx-hl">
                        <Link href={href(top)}>{top.title}</Link>
                      </h3>
                      <p className="cx-dek">{top.excerpt || top.meta_description}</p>
                    </div>
                  </article>
                  <ul>
                    {more.map((a) => (
                      <li key={a.id}>
                        <h4 className="cx-hl">
                          <Link href={href(a)}>{a.title}</Link>
                        </h4>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── LATEST RIVER + RAIL ── */}
      {river.length ? (
        <section className="cx-sec">
          <div className="cx-wrap">
            <div className="cx-sechead">
              <h2>Latest</h2>
              <Link href={`${s}/search?q=2026`} className="cx-more">
                All reports →
              </Link>
            </div>
            <div className="cx-river-grid">
              <div>
                {river.map((a) => (
                  <article className="cx-row" key={a.id}>
                    <div>
                      <span className="cx-kicker">{kickerOf(a)}</span>
                      <h3 className="cx-hl">
                        <Link href={href(a)}>{a.title}</Link>
                      </h3>
                      <p className="cx-dek">{a.excerpt || a.meta_description}</p>
                      <Byline article={a} />
                    </div>
                    <Img href={href(a)} article={a} />
                  </article>
                ))}
              </div>

              <aside className="cx-rail">
                <div className="cx-railbox dark">
                  <span className="cx-kicker gold">The Countly Lists</span>
                  <h3>Rankings, re-checked every day.</h3>
                  <p>Richest people by country, biggest companies, most-used apps — sourced, dated and ranked.</p>
                  <Link href={`${s}/top10`} className="cx-btn">
                    Explore the lists →
                  </Link>
                </div>
                <div className="cx-railbox">
                  <h3>Browse by topic</h3>
                  <div className="cx-topics">
                    {CN_CATEGORIES.map((c) => (
                      <Link href={`${s}/topic/${c.slug}`} key={c.slug}>
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="cx-railbox">
                  <h3>How we work</h3>
                  <div className="cx-method">
                    <div>
                      <b>Sourced figures</b>
                      Filings, government databases and industry reports — named in every report.
                    </div>
                    <div>
                      <b>Estimates, labelled</b>
                      No false precision: official and estimated numbers are always marked apart.
                    </div>
                    <div>
                      <b>Dated &amp; updated</b>
                      Every report carries its date. Re-verify before you cite.
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      ) : null}

      <div id="cn-newsletter">
        <NewsletterForm />
      </div>
      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Footer (shared shape with Article)
   ──────────────────────────────────────────────────────────── */
export function SiteFooter({ siteName, siteId, domain }: { siteName: string; siteId: string; domain: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="cn-footer">
      <div className="cn-wrap">
        <HouseAd />
        <div className="cn-foot-top">
          <div>
            <Link href={`/s/${siteId}`} className="cn-brand" aria-label={`${siteName} home`}>
              <span className="cn-logo">
                <IconChart />
              </span>
              <span className="cn-wordmark">
                <b>
                  Count<span>ly</span>
                </b>
                <small>The World in Numbers</small>
              </span>
            </Link>
            <p className="cn-foot-about">
              {siteName} is an independent data &amp; statistics publication covering technology, AI, social media,
              companies, countries and global markets. We are not affiliated with any analytics company.
            </p>
          </div>
          <div className="cn-foot-cols">
            <div>
              <h4>Topics</h4>
              <ul>
                <li>
                  <Link href={`/s/${siteId}/topic/ai-chatgpt`}>AI &amp; ChatGPT</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}/topic/social-media`}>Social media</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}/topic/companies`}>Companies</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>About</h4>
              <ul>
                <li>
                  <Link href={`/s/${siteId}/about`}>About us</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}/contact`}>Contact</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}/privacy`}>Privacy Policy</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}/terms`}>Terms of Service</Link>
                </li>
                <li>
                  <Link href={`/s/${siteId}/disclaimer`}>Disclaimer</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="cn-foot-disclaimer">
          <b>About the data.</b> Statistics on {siteName} are best-available figures compiled from public sources and
          include estimates where exact numbers are not published. They are provided for general information only, may
          contain errors, and change over time. Always confirm against the original source before citing or making
          decisions based on these numbers.
        </div>

        <div className="cn-foot-bottom">
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
