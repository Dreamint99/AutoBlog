"use client";

import { useMemo, useState } from "react";
import type { AiTool } from "@/lib/data";

export interface CatMeta {
  key: string;
  name: string;
  heading: string;
  blurb: string;
  count: number;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "k";
  return String(n);
}

function pricingClass(p: string): string {
  const k = p.toLowerCase();
  if (k.includes("open")) return "cn-ai-price open";
  if (k === "free") return "cn-ai-price free";
  if (k === "paid") return "cn-ai-price paid";
  return "cn-ai-price freemium";
}

function faviconFor(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return `https://www.google.com/s2/favicons?domain=${h}&sz=64`;
  } catch {
    return "";
  }
}

function ToolCard({ t }: { t: AiTool }) {
  const hasStars = Boolean(t.github_repo) && t.stars > 0;
  const showGrowth = hasStars && t.stars_prev > 0 && t.growth_pct !== 0;
  const up = t.growth_pct > 0;
  const fav = faviconFor(t.url);
  return (
    <article className="cn-ai-card">
      <div className="cn-ai-card-head">
        <span className="cn-ai-logo" data-letter={t.name.charAt(0)}>
          {fav ? (
            <img
              src={fav}
              alt=""
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
        </span>
        <div className="cn-ai-titlewrap">
          <h3 className="cn-ai-name">{t.name}</h3>
          {t.highlight ? <span className="cn-ai-tagline">{t.highlight}</span> : null}
        </div>
        <span className="cn-ai-rank" aria-hidden="true">
          #{t.rank}
        </span>
      </div>

      <p className="cn-ai-blurb">{t.blurb}</p>

      <div className="cn-ai-chipsrow">
        <span className={pricingClass(t.pricing)}>{t.pricing}</span>
        {hasStars ? (
          <span className="cn-ai-metric" title="Live GitHub stars — refreshed daily">
            <span className="cn-ai-star" aria-hidden="true">
              ★
            </span>
            <b>{fmtNum(t.stars)}</b>
            {showGrowth ? (
              <span className={up ? "cn-ai-growth up" : "cn-ai-growth down"}>
                {up ? "▲" : "▼"} {Math.abs(t.growth_pct).toFixed(2)}%
              </span>
            ) : null}
          </span>
        ) : t.users_est ? (
          <span className="cn-ai-metric" title="Publicly-reported scale — estimate, not a live figure">
            <span className="cn-ai-users" aria-hidden="true">
              ◕
            </span>
            <b>{t.users_est}</b>
            <span className="cn-ai-metric-lbl">est.</span>
          </span>
        ) : null}
      </div>

      <a
        className="cn-ai-visit"
        href={t.url}
        target="_blank"
        rel="nofollow noopener sponsored"
        aria-label={`Visit ${t.name}`}
      >
        Visit {t.name} <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}

export default function AiToolsBrowser({
  tools,
  categories,
}: {
  tools: AiTool[];
  categories: CatMeta[];
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string>("all");

  const query = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    return tools.filter((t) => {
      if (!t.url_ok) return false;
      if (active !== "all" && t.category_key !== active) return false;
      if (!query) return true;
      const hay = (
        t.name +
        " " +
        t.blurb +
        " " +
        t.category +
        " " +
        (t.tags || []).join(" ") +
        " " +
        t.highlight
      ).toLowerCase();
      return hay.includes(query);
    });
  }, [tools, active, query]);

  const shownCats = categories.filter((c) =>
    filtered.some((t) => t.category_key === c.key),
  );

  return (
    <>
      {/* ── Sticky filter / search bar ── */}
      <div className="cn-ai-toolbar">
        <div className="cn-wrap cn-ai-toolbar-inner">
          <div className="cn-ai-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search 120+ AI tools — coding, video, chat, image…"
              aria-label="Search AI tools"
            />
          </div>
          <div className="cn-ai-chips" role="tablist" aria-label="Categories">
            <button
              className={active === "all" ? "cn-ai-chip on" : "cn-ai-chip"}
              onClick={() => setActive("all")}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.key}
                className={active === c.key ? "cn-ai-chip on" : "cn-ai-chip"}
                onClick={() => setActive(c.key)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category sections ── */}
      <div className="cn-wrap cn-ai-body">
        {filtered.length === 0 ? (
          <div className="cn-emptywrap">
            <h3>No tools match “{q}”.</h3>
            <p>Try a broader term like “video”, “chat”, “coding” or “open source”.</p>
          </div>
        ) : (
          shownCats.map((c) => {
            const items = filtered.filter((t) => t.category_key === c.key);
            return (
              <section className="cn-ai-cat" id={c.key} key={c.key}>
                <div className="cn-ai-cat-head">
                  <h2>{c.heading}</h2>
                  <span className="cn-ai-cat-count">{items.length} tools</span>
                </div>
                {c.blurb ? <p className="cn-ai-cat-blurb">{c.blurb}</p> : null}
                <div className="cn-ai-grid">
                  {items.map((t) => (
                    <ToolCard key={t.slug} t={t} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
