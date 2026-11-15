"use client";

import { useEffect, useRef, useState } from "react";

/* Tiny progressive enhancement for a server-rendered `.itable`:
   - instant filter (reads ?q= from the URL, so the hero/header search lands here pre-filtered)
   - click a header with [data-sort] to sort by that column (cells carry data-v).
   Rows stay in the HTML for crawlers; this only hides/reorders them. */
export default function TableTools({ target, noun = "models", placeholder = "Filter by model or provider" }: { target: string; noun?: string; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    const table = document.getElementById(target) as HTMLTableElement | null;
    if (!table) return;
    const body = table.tBodies[0];
    setTotal(body.rows.length);
    const initial = new URLSearchParams(window.location.search).get("q") || "";
    if (initial) setQ(initial);
    ready.current = true;

    const heads = Array.from(table.tHead?.rows[0]?.cells ?? []);
    const handlers: Array<[HTMLElement, string, EventListener]> = [];
    heads.forEach((th, idx) => {
      const kind = th.dataset.sort;
      if (!kind) return;
      th.tabIndex = 0;
      const run = () => {
        const asc = th.getAttribute("aria-sort") !== "ascending";
        heads.forEach((h) => h.removeAttribute("aria-sort"));
        th.setAttribute("aria-sort", asc ? "ascending" : "descending");
        const rows = Array.from(body.rows);
        const val = (r: HTMLTableRowElement) => r.cells[idx]?.dataset.v ?? r.cells[idx]?.textContent ?? "";
        rows.sort((a, b) => {
          const x = val(a);
          const y = val(b);
          const c = kind === "num" ? Number(x) - Number(y) : x.localeCompare(y);
          return asc ? c : -c;
        });
        // unknown prices (-1) always last
        if (kind === "num") rows.sort((a, b) => Number(Number(val(a)) < 0) - Number(Number(val(b)) < 0));
        body.append(...rows);
      };
      const key = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          run();
        }
      };
      th.addEventListener("click", run);
      th.addEventListener("keydown", key);
      handlers.push([th, "click", run], [th, "keydown", key as EventListener]);
    });
    return () => {
      handlers.forEach(([el, type, fn]) => el.removeEventListener(type, fn));
    };
  }, [target]);

  useEffect(() => {
    if (!ready.current) return;
    const table = document.getElementById(target) as HTMLTableElement | null;
    if (!table) return;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    for (const r of Array.from(table.tBodies[0].rows)) {
      const hay = r.dataset.s ?? (r.textContent || "").toLowerCase();
      const ok = terms.every((t) => hay.includes(t));
      r.hidden = !ok;
      if (ok) n++;
    }
    setShown(terms.length ? n : null);
  }, [q, target]);

  return (
    <div className="tt-bar">
      <label className="tt-search">
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      </label>
      {total !== null ? (
        <span className="tt-count" aria-live="polite">
          {shown !== null ? `${shown} of ${total} ${noun}` : `${total} ${noun}`}
        </span>
      ) : null}
    </div>
  );
}
