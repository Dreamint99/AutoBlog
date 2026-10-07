"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type TRow = {
  iso2: string;
  slug: string;
  name: string;
  rank: number;
  score: number;
  free: number;
  voa: number;
  eta: number;
  evisa: number;
  required: number;
};

/** Searchable, animated ranking of every passport. */
export default function PassportTable({ rows, siteId }: { rows: TRow[]; siteId: string }) {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);
  const max = rows[0]?.score || 1;
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((r) => r.name.toLowerCase().includes(t)) : rows.slice(0, limit);
  }, [rows, q, limit]);

  return (
    <div className="vp-pt">
      <div className="vp-pt-tools">
        <label className="vp-pt-search">
          <span className="sr-only">Find a passport</span>
          <input
            type="search"
            placeholder="Find a passport — e.g. Bangladesh, India, Nigeria…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <span className="vp-pt-legend">
          <i className="f" /> Visa-free <i className="a" /> On arrival <i className="t" /> eTA <i className="e" /> e-Visa
        </span>
      </div>
      <ol className="vp-pt-list">
        {shown.map((r, i) => {
          const pct = (n: number) => `${(n / max) * 100}%`;
          return (
            <li key={r.iso2} className="vp-pt-row" style={{ animationDelay: `${Math.min(i, 30) * 25}ms` }}>
              <span className="vp-pt-rank">{r.rank}</span>
              <img className="vp-flag" src={`https://flagcdn.com/w80/${r.iso2.toLowerCase()}.png`} alt="" width={30} height={20} loading="lazy" />
              <Link className="vp-pt-name" href={`/s/${siteId}/passport/${r.slug}`}>
                {r.name}
              </Link>
              <span className="vp-pt-bar" aria-hidden="true">
                <i className="f" style={{ width: pct(r.free) }} />
                <i className="a" style={{ width: pct(r.voa) }} />
                <i className="t" style={{ width: pct(r.eta) }} />
                <i className="e" style={{ width: pct(r.evisa) }} />
              </span>
              <span className="vp-pt-score">
                <b>{r.score}</b>
                <small>destinations</small>
              </span>
            </li>
          );
        })}
      </ol>
      {!q && limit < rows.length ? (
        <button className="vp-btn vp-btn-primary vp-pt-more" onClick={() => setLimit(rows.length)}>
          Show all {rows.length} passports
        </button>
      ) : null}
    </div>
  );
}
