import "./hub.css";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Site } from "@/lib/types";
import { GcShell } from "../Chrome";
import { toPath, thin, type Pt } from "./series";
import { dateLong, dateShort, fmt, pct } from "./format";

/* Reusable server-rendered building blocks for the Gulf Expat Data Hub.
 * No "use client", no hooks, no chart library: every page is plain HTML + one
 * inline SVG, so it renders without JavaScript and costs nothing on mobile. */

/* ── Page scaffolding ─────────────────────────────────────────────────────── */

export function HubPage({ site, children, active }: { site: Site; children: ReactNode; active?: string }) {
  return (
    <GcShell site={site} active={active ?? "home"}>
      <div className="gh-wrap">{children}</div>
    </GcShell>
  );
}

export function Crumbs({ site, items }: { site: Site; items: { label: string; href?: string }[] }) {
  return (
    <nav className="gh-crumbs" aria-label="Breadcrumb">
      <Link href={`/s/${site.id}`}>{site.name}</Link>
      {items.map((it) => (
        <span key={it.label}>
          <i aria-hidden="true">›</i>
          {it.href ? <Link href={it.href}>{it.label}</Link> : <b aria-current="page">{it.label}</b>}
        </span>
      ))}
    </nav>
  );
}

export function PageHead({
  kicker,
  title,
  dek,
  children,
}: {
  kicker?: string;
  title: ReactNode;
  dek?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="gh-head">
      {kicker ? <span className="gh-kicker">{kicker}</span> : null}
      <h1>{title}</h1>
      {dek ? <p className="gh-dek">{dek}</p> : null}
      {children}
    </header>
  );
}

export function SectionHead({ title, dek, right }: { title: ReactNode; dek?: ReactNode; right?: ReactNode }) {
  return (
    <div className="gh-sechead">
      <div>
        <h2>{title}</h2>
        {dek ? <p>{dek}</p> : null}
      </div>
      {right}
    </div>
  );
}

/* ── Big number cards ─────────────────────────────────────────────────────── */

export function BigStat({
  label,
  value,
  unit,
  sub,
  tone = "navy",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  tone?: "navy" | "gold" | "teal";
}) {
  return (
    <div className={`gh-stat gh-t-${tone}`}>
      <span className="gh-stat-k">{label}</span>
      <b className="gh-stat-v">
        {value}
        {unit ? <small>{unit}</small> : null}
      </b>
      {sub ? <span className="gh-stat-s">{sub}</span> : null}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="gh-stats">{children}</div>;
}

/* ── Chart ────────────────────────────────────────────────────────────────── */

const W = 720;
const H = 220;

/** Server-rendered trend line. `points` is ascending by date. */
export function TrendChart({
  points,
  dp,
  label,
  caption,
}: {
  points: Pt[];
  dp: number;
  label: string;
  caption?: ReactNode;
}) {
  const p = thin(points, 120);
  const path = toPath(p, W, H, 6);
  if (!path) return null;
  // ~8 date labels along the bottom, and a sampled table for screen readers and
  // for crawlers that want the numbers in text.
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => p[Math.round(f * (p.length - 1))]);
  const tableRows = thin(p, 12);
  const up = p[p.length - 1].v >= p[0].v;

  return (
    <figure className="gh-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={up ? "up" : "down"}>
        <defs>
          <linearGradient id="gh-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={path.area} fill="url(#gh-fill)" />
        <path d={path.line} className="gh-line" fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="gh-chart-x" aria-hidden="true">
        {ticks.map((t, i) => (
          <span key={i}>{dateShort(t.d)}</span>
        ))}
      </div>
      {caption ? <figcaption className="gh-chart-cap">{caption}</figcaption> : null}
      <details className="gh-chart-data">
        <summary>Daily values in the chart</summary>
        <div className="gh-tablewrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">{label}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.d}>
                  <td>{dateShort(r.d)}</td>
                  <td>{fmt(r.v, dp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/* ── Tables ───────────────────────────────────────────────────────────────── */

export function AmountTable({
  rows,
  caption,
  head,
}: {
  rows: [string, string][];
  caption?: ReactNode;
  head: [string, string];
}) {
  return (
    <div className="gh-tablewrap gh-amounts">
      <table>
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            <th scope="col">{head[0]}</th>
            <th scope="col">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a}>
              <td>{a}</td>
              <td>
                <b>{b}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Generic data table used by gold, fuel, holidays, fees and prayer pages. */
export function DataTable({
  head,
  rows,
  caption,
  foot,
}: {
  head: string[];
  rows: ReactNode[][];
  caption?: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <div className="gh-tablewrap">
      <table>
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {head.map((h) => (
              <th scope="col" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {foot ? <p className="gh-tablefoot">{foot}</p> : null}
    </div>
  );
}

/* ── FAQ + source + related ───────────────────────────────────────────────── */

export function Faq({ items, title = "Frequently asked questions" }: { items: { q: string; a: ReactNode }[]; title?: string }) {
  return (
    <section className="gh-faq" aria-labelledby="gh-faq-h">
      <h2 id="gh-faq-h">{title}</h2>
      <dl>
        {items.map((it) => (
          <div key={it.q}>
            <dt>{it.q}</dt>
            <dd>{it.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The "where this came from / when" line. Every data page carries one. */
export function SourceLine({
  source,
  url,
  updated,
  note,
}: {
  source: string;
  url: string;
  updated: string;
  note?: ReactNode;
}) {
  return (
    <p className="gh-source" data-nosnippet>
      <span className="gh-src-k">Source</span>
      <a href={url} target="_blank" rel="noopener nofollow">
        {source}
      </a>
      <span className="gh-src-sep" aria-hidden="true">·</span>
      <span className="gh-src-k">Updated</span>
      <time dateTime={updated}>{dateLong(updated)}</time>
      {note ? <span className="gh-src-note">{note}</span> : null}
    </p>
  );
}

export function Related({ title = "Related", links }: { title?: string; links: { label: string; href: string }[] }) {
  if (!links.length) return null;
  return (
    <section className="gh-related">
      <h2>{title}</h2>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Callout({ tone = "info", title, children }: { tone?: "info" | "warn" | "law"; title?: ReactNode; children: ReactNode }) {
  return (
    <aside className={`gh-callout gh-c-${tone}`}>
      {title ? <b>{title}</b> : null}
      <div>{children}</div>
    </aside>
  );
}

/** Shown instead of a number when the feed is empty — never a guess. */
export function NoData({ what = "data" }: { what?: string }) {
  return (
    <p className="gh-nodata">
      {what} is temporarily unavailable — the last successful update is shown above. Nothing is shown here rather than an
      estimate.
    </p>
  );
}

export function Delta({ n, children }: { n: number | null; children?: ReactNode }) {
  const t = n == null ? "flat" : Math.abs(n) < 0.0005 ? "flat" : n > 0 ? "up" : "down";
  return (
    <span className={`gh-delta gh-d-${t}`}>
      {n != null ? pct(n) : "—"}
      {children}
    </span>
  );
}
