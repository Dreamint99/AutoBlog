"use client";
// Pre-match model cards (Poisson win probability + form guide) from nm-api /v1/insights.
// Rendered on the server when the R2 copy exists; otherwise fetched here (the site Worker cannot call api.ninetymins.com).
import { useEffect, useState } from "react";

export interface Insight { kind: string; title: string; home?: number; draw?: number; away?: number; labels?: string[]; items?: string[]; text?: string }

export function InsightCards({ items }: { items: Insight[] }) {
  return (
    <>
      {items.map((it, i) =>
        it.kind === "prob" && it.home != null ? (
          <section className="mx-box" key={i}>
            <h2 className="mx-h">{it.title}</h2>
            <div className="mx-prob" role="img" aria-label={(it.labels || []).map((l, j) => `${l} ${Math.round(([it.home, it.draw, it.away][j] || 0) * 100)}%`).join(", ")}>
              {[it.home, it.draw, it.away].map((p, j) => (p ? <span key={j} className={`mx-p${j}`} style={{ flexGrow: p }} /> : null))}
            </div>
            <div className="mx-prob-l">
              {(it.labels || []).map((l, j) => (
                <span key={l + j}>
                  <b>{Math.round(([it.home, it.draw, it.away][j] || 0) * 100)}%</b> {l}
                </span>
              ))}
            </div>
            <p className="mx-note">NinetyMins model from recent form — an estimate, not a prediction of the result.</p>
          </section>
        ) : it.items?.length ? (
          <section className="mx-box" key={i}>
            <h2 className="mx-h">{it.title}</h2>
            <ul className="mx-list">
              {it.items.map((s, j) => (
                <li key={j}>{s}</li>
              ))}
            </ul>
          </section>
        ) : it.text ? (
          <section className="mx-box" key={i}>
            <h2 className="mx-h">{it.title}</h2>
            <p>{it.text}</p>
          </section>
        ) : null,
      )}
    </>
  );
}

export default function Insights({ url, initial }: { url: string; initial: Insight[] | null }) {
  const [items, setItems] = useState<Insight[] | null>(initial);
  useEffect(() => {
    if (initial) return;
    fetch(url).then((r) => (r.ok ? r.json() : null)).then((j) => j?.items && setItems(j.items)).catch(() => {});
  }, [url, initial]);
  return items?.length ? <InsightCards items={items} /> : null;
}
