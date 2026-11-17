import "./v2.css";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SiteHomeProps, Site, Article } from "@/lib/types";
import { getFlagships, getModels, getChangeDays, getDayChanges, latestVerified } from "@/lib/models";
import { getStatuses } from "@/lib/aidata";
import { Masthead, Footer } from "./Chrome";
import { aiFont } from "./fonts";
import { topicOf } from "./topics";
import { ModelTable, ChangeChip, fmtUsd, fmtDate, headliners, pairsOf } from "./data-ui";
import { changePct } from "./Changes";
import { thumb } from "@/lib/img";
import { publicPath, sitePrefix } from "@/lib/public-path";

/* InfKey home (v2) — data first, little text.
   Hero search → KPI strip → today's prices + changes/status side panels →
   providers → tools → popular comparisons → latest guides.
   All data from D1 (refreshed by workers/infkey-sync); queries are React-cached per request. */

function fmtShort(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

const QUICK = ["GPT", "Claude", "Gemini", "DeepSeek", "Llama", "Qwen", "Mistral", "Grok"];

const ICONS: Record<string, ReactNode> = {
  compare: <path d="M7 4v16M17 4v16M3 8h8M13 16h8" />,
  status: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  run: <path d="M4 7h16v10H4zM8 17v3M16 17v3M8 4v3M12 4v3M16 4v3" />,
  calc: <path d="M6 3h12v18H6zM9 7h6M9 11h1M14 11h1M9 15h1M14 15h1" />,
};
function Icon({ k }: { k: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[k]}
    </svg>
  );
}

function GuideCard({ site, a }: { site: Site; a: Article }) {
  const href = publicPath(site.id, `/${a.slug}`);
  return (
    <article className="card">
      <Link href={href} className="card-media" tabIndex={-1} aria-label={a.title}>
        <span className="card-cat">{topicOf(a).label}</span>
        {a.image_url ? <img src={thumb(a.image_url, a.title)} alt={a.title} loading="lazy" decoding="async" /> : null}
      </Link>
      <div className="card-body">
        <h3 className="card-title">
          <Link href={href}>{a.title}</Link>
        </h3>
        <div className="card-foot">
          <span>{fmtShort(a.created_at)}</span>
          <span aria-hidden="true">·</span>
          <span>{a.reading_time} min read</span>
        </div>
      </div>
    </article>
  );
}

export default async function Home({ site, articles }: SiteHomeProps) {
  const b = sitePrefix(site.id);
  const [models, flag, statuses, days] = await Promise.all([getModels(), getFlagships(), getStatuses(), getChangeDays()]);
  const latestDay = days[0];
  const changes = latestDay ? await getDayChanges(latestDay) : null;
  const nChanges = changes ? changes.up.length + changes.down.length + changes.added.length : 0;
  const verified = latestVerified(models);

  const top = flag.filter((m) => m.category === "llm").slice(0, 10);

  // providers: most models first, with the cheapest paid input price
  const provMap = new Map<string, { name: string; n: number; from: number | null }>();
  for (const m of models) {
    const p = provMap.get(m.provider) ?? { name: m.provider, n: 0, from: null };
    p.n++;
    const inP = m.input_per_m ?? 0;
    if (inP > 0 && (p.from === null || inP < p.from)) p.from = inP;
    provMap.set(m.provider, p);
  }
  const providers = [...provMap.values()].sort((x, y) => y.n - x.n).slice(0, 12);

  // popular head-to-heads: the headline model of each big lab
  const pairs = pairsOf(headliners(models, 6), 8);

  const down = statuses.filter((s) => s.indicator !== "none");
  const moves = changes ? [...changes.down, ...changes.up].slice(0, 6) : [];
  const guides = articles.filter((a) => !a.is_mock).slice(0, 4);
  const isToday = latestDay === new Date().toISOString().slice(0, 10);

  return (
    <div className={`ai-root ik ${aiFont.variable}`}>
      <a href="#live-prices" className="skip-link">
        Skip to prices
      </a>
      <Masthead site={site} />
      <main>
        <section className="ik-hero">
          <div className="ik-wrap">
            <p className="ik-kicker">Updated {verified ? fmtDate(verified) : "daily"}</p>
            <h1>
              Live prices, status &amp; specs for <span className="count">{models.length || 400}+</span> AI models
            </h1>
            <p className="ik-sub">API prices per million tokens, outages and GPU fit, in one place.</p>
            <form className="ik-search" action={`${b}/models`} role="search">
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input name="q" type="search" placeholder="Search a model — GPT, Claude…" aria-label="Search AI models" />
              <button type="submit">Search</button>
            </form>
            <div className="ik-quick">
              {QUICK.map((q) => (
                <Link key={q} href={`${b}/models?q=${encodeURIComponent(q)}`}>
                  {q}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="ik-wrap">
          <div className="ik-kpis">
            <Link className="ik-kpi" href={`${b}/models`}>
              <b>{models.length}</b>
              <span>Models tracked</span>
            </Link>
            <Link className="ik-kpi" href={`${b}/models`}>
              <b>{provMap.size}</b>
              <span>Providers</span>
            </Link>
            <Link className="ik-kpi" href={`${b}/changes`}>
              <b>{nChanges}</b>
              <span>Price changes{latestDay ? ` · ${fmtShort(latestDay)}` : ""}</span>
            </Link>
            <Link className="ik-kpi" href={`${b}/status`}>
              <b className={down.some((s) => s.indicator !== "minor" && s.indicator !== "maintenance") ? "bad" : down.length ? "warn" : "ok"}>
                {statuses.length - down.length}/{statuses.length || 9}
              </b>
              <span>AI services up</span>
            </Link>
          </div>

          <section className="ik-sec" id="live-prices">
            <div className="ik-split">
              <div>
                <div className="ik-sec-head">
                  <div>
                    <h2>AI API prices today</h2>
                    <p>Newest models from the big labs · USD per 1M tokens</p>
                  </div>
                  <Link className="ik-all" href={`${b}/models`}>
                    All {models.length} →
                  </Link>
                </div>
                <ModelTable site={site} models={top} />
              </div>

              <aside className="ik-side">
                <div className="ik-panel">
                  <div className="ik-panel-h">
                    <h2>{isToday ? "Price changes today" : "Latest price changes"}</h2>
                    <Link href={`${b}/changes`}>All</Link>
                  </div>
                  {moves.length ? (
                    <ul className="ik-rows">
                      {moves.map((c) => (
                        <li key={c.model.id}>
                          <Link href={`${b}/models/${c.model.id}`}>
                            <span className="nm">{c.model.name}</span>
                            <ChangeChip pct={changePct(c)} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : changes && changes.added.length ? (
                    <ul className="ik-rows">
                      {changes.added.slice(0, 6).map((m) => (
                        <li key={m.id}>
                          <Link href={`${b}/models/${m.id}`}>
                            <span className="nm">{m.name}</span>
                            <span className="vl">New · {fmtUsd(m.input_per_m, 3)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="ik-panel-empty">No price moves in the latest snapshot.</p>
                  )}
                </div>

                <div className="ik-panel">
                  <div className="ik-panel-h">
                    <h2>Is it down?</h2>
                    <Link href={`${b}/status`}>Status</Link>
                  </div>
                  <ul className="ik-rows">
                    {statuses.map((s) => (
                      <li key={s.service}>
                        <Link href={`${b}/status/${s.service}`}>
                          <span className={`dot ${s.indicator === "none" ? "ok" : s.indicator === "minor" || s.indicator === "maintenance" ? "warn" : "bad"}`} aria-hidden="true" />
                          <span className="nm">{s.name}</span>
                          <span className="vl">{s.indicator === "none" ? "Up" : s.indicator === "maintenance" ? "Maintenance" : s.indicator === "minor" ? "Degraded" : "Outage"}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          </section>

          {providers.length ? (
            <section className="ik-sec" id="providers">
              <div className="ik-sec-head">
                <h2>Providers</h2>
                <Link className="ik-all" href={`${b}/models`}>
                  All models →
                </Link>
              </div>
              <div className="ik-provs">
                {providers.map((p) => (
                  <Link className="ik-prov" key={p.name} href={`${b}/models?q=${encodeURIComponent(p.name)}`}>
                    <span className="ik-mono" aria-hidden="true">
                      {p.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <b>{p.name}</b>
                      <small>
                        {p.n} model{p.n === 1 ? "" : "s"}
                        {p.from !== null ? ` · from ${fmtUsd(p.from, 3)}` : ""}
                      </small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="ik-sec" id="tools">
            <div className="ik-sec-head">
              <h2>Tools</h2>
            </div>
            <div className="ik-tools">
              <Link className="ik-tool" href={`${b}/compare`}>
                <Icon k="compare" />
                <h3>Compare models</h3>
                <p>Two models side by side on price and context.</p>
              </Link>
              <Link className="ik-tool" href={`${b}/status`}>
                <Icon k="status" />
                <h3>Is it down?</h3>
                <p>ChatGPT, Claude and more, checked every 5 minutes.</p>
              </Link>
              <Link className="ik-tool" href={`${b}/run`}>
                <Icon k="run" />
                <h3>Can I run it?</h3>
                <p>Which open models fit your GPU or Mac.</p>
              </Link>
              <Link className="ik-tool" href={`${b}/calculators`}>
                <Icon k="calc" />
                <h3>API cost calculator</h3>
                <p>Monthly cost for your real workload.</p>
              </Link>
            </div>
          </section>

          {pairs.length ? (
            <section className="ik-sec" id="compare">
              <div className="ik-sec-head">
                <h2>Popular comparisons</h2>
                <Link className="ik-all" href={`${b}/compare`}>
                  More →
                </Link>
              </div>
              <div className="vs-links">
                {pairs.map(([slug, a, c]) => (
                  <Link className="vs-link" href={`${b}/compare/${slug}`} key={slug}>
                    {a.name} <span className="vs">vs</span> {c.name}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {guides.length ? (
            <section className="ik-sec" id="guides">
              <div className="ik-sec-head">
                <h2>Latest guides</h2>
                <Link className="ik-all" href={`${b}/archive`}>
                  All guides →
                </Link>
              </div>
              <div className="ik-cards">
                {guides.map((a) => (
                  <GuideCard site={site} a={a} key={a.id} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
      <Footer site={site} />
    </div>
  );
}
