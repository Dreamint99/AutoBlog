"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { matchHref } from "./LiveScores";
import { thumb } from "@/lib/img";
import { LS_SPORTS } from "./sports";

/* The NinetyMins scoreboard: one dense, live list of every match the feeds
   expose, grouped by competition. Sport tabs, a 7-day date strip, Live /
   Finished / Scheduled filters and starred competitions (kept on this device).
   Server renders today's football list for crawlers; the client then polls
   /api/scores (30 s while anything is live, 2 min otherwise). */

type Team = { name: string; abbr: string; logo: string; score: string; winner: boolean };
export type LsEvent = {
  id: string;
  league: string;
  leagueLabel: string;
  state: "pre" | "in" | "post";
  detail: string;
  date: string;
  name: string;
  home: Team | null;
  away: Team | null;
};


const FILTERS = [
  ["all", "All"],
  ["in", "Live"],
  ["post", "Finished"],
  ["pre", "Scheduled"],
] as const;
type Filter = (typeof FILTERS)[number][0];

const PIN_KEY = "nm-pinned-leagues";

function ymd(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function days() {
  const out: Array<{ off: number; d: Date }> = [];
  for (let off = -3; off <= 3; off++) {
    const d = new Date();
    d.setDate(d.getDate() + off);
    out.push({ off, d });
  }
  return out;
}

function dayLabel(off: number, d: Date) {
  if (off === 0) return "Today";
  if (off === -1) return "Yest.";
  if (off === 1) return "Tmrw";
  return d.toLocaleDateString([], { weekday: "short" });
}

function clock(e: LsEvent) {
  if (e.state === "pre") {
    const d = new Date(e.date);
    return Number.isNaN(d.getTime()) ? e.detail : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (e.state === "post") {
    if (/FT|Final/i.test(e.detail) || !e.detail || e.detail.length > 8) return "FT";
    return e.detail;
  }
  // Cricket and some sports send a sentence here; the row shows LIVE and the sentence below.
  return e.detail && e.detail.length <= 8 ? e.detail : "LIVE";
}

const longDetail = (e: LsEvent) => e.state !== "pre" && !!e.detail && e.detail.length > 8;

/** Stable kit-like colour per team (the app's C.hashed fallback). */
function kit(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  return `hsl(${h % 360} 62% 40%)`;
}

function readPins(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PIN_KEY) || "[]");
  } catch {
    return [];
  }
}

function Side({ t, state, flash }: { t: Team; state: LsEvent["state"]; flash: boolean }) {
  return (
    <span className={`lv-side${state === "post" && t.winner ? " win" : ""}${state === "post" && !t.winner ? " lose" : ""}`}>
      {t.logo ? <img src={thumb(t.logo)} alt="" width={20} height={20} loading="lazy" /> : <i aria-hidden="true">{(t.abbr || t.name).slice(0, 3)}</i>}
      <span className="lv-name">{t.name}</span>
      <b className={`${flash ? "lv-flash" : ""}${t.score.length > 4 ? " lv-long" : ""}`.trim() || undefined}>{state === "pre" ? "" : t.score}</b>
    </span>
  );
}

export function Livescore({ initial, day = "", sport: startSport = "football" }: { initial: LsEvent[]; day?: string; sport?: string }) {
  const [sport, setSport] = useState(startSport);
  const [off, setOff] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [events, setEvents] = useState<LsEvent[]>(initial);
  const [loading, setLoading] = useState(false);
  const [pins, setPins] = useState<string[]>([]);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const prev = useRef<Record<string, string>>({});
  const first = useRef(true);

  useEffect(() => setPins(readPins()), []);

  const S = LS_SPORTS.find((s) => s.key === sport) ?? LS_SPORTS[0];
  const strip = useMemo(days, []);
  const date = ymd(strip[off + 3].d);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const url = `/api/scores?l=${S.leagues.join(",")}&d=${date}`;
    const load = (spinner: boolean) => {
      if (document.visibilityState === "hidden") return schedule(false);
      if (spinner) setLoading(true);
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { events?: LsEvent[] } | null) => {
          if (!alive || !j?.events) return;
          // Flash a score that changed since the last poll.
          const changed: Record<string, number> = {};
          for (const e of j.events) {
            const sc = `${e.home?.score}-${e.away?.score}`;
            if (prev.current[e.id] && prev.current[e.id] !== sc && e.state === "in") changed[e.id] = Date.now();
            prev.current[e.id] = sc;
          }
          if (Object.keys(changed).length) setFlash((f) => ({ ...f, ...changed }));
          setEvents(j.events);
          schedule(j.events.some((e) => e.state === "in"));
        })
        .catch(() => schedule(false))
        .finally(() => alive && setLoading(false));
    };
    const schedule = (live: boolean) => {
      if (!alive || off !== 0) return;
      timer = setTimeout(() => load(false), live ? 30000 : 120000);
    };
    // The server already rendered today's football list.
    if (first.current && sport === startSport && off === 0 && day === date) {
      first.current = false;
      for (const e of initial) prev.current[e.id] = `${e.home?.score}-${e.away?.score}`;
      schedule(initial.some((e) => e.state === "in"));
    } else load(true);
    const vis = () => document.visibilityState === "visible" && off === 0 && load(false);
    document.addEventListener("visibilitychange", vis);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [S, date, sport, off, startSport, initial, day]);

  const togglePin = (league: string) => {
    const next = pins.includes(league) ? pins.filter((p) => p !== league) : [...pins, league];
    setPins(next);
    try {
      localStorage.setItem(PIN_KEY, JSON.stringify(next));
    } catch {}
  };

  const live = events.filter((e) => e.state === "in").length;
  const shown = events.filter((e) => e.home && e.away && (filter === "all" || e.state === filter));
  const groups = useMemo(() => {
    const order = S.leagues;
    const by = new Map<string, LsEvent[]>();
    for (const e of shown) by.set(e.league, [...(by.get(e.league) || []), e]);
    const rank = { in: 0, pre: 1, post: 2 } as const;
    return [...by.entries()]
      .map(([league, evs]) => ({
        league,
        label: evs[0].leagueLabel,
        evs: evs.sort((a, b) => rank[a.state] - rank[b.state] || a.date.localeCompare(b.date)),
      }))
      .sort((a, b) => Number(pins.includes(b.league)) - Number(pins.includes(a.league)) || order.indexOf(a.league) - order.indexOf(b.league));
  }, [shown, pins, S]);

  return (
    <section className="lv-board" aria-label="Live scores">
      <nav className="lv-sports" aria-label="Sports">
        {LS_SPORTS.map((s) => (
          <button key={s.key} type="button" className={s.key === sport ? "on" : ""} aria-pressed={s.key === sport} onClick={() => setSport(s.key)}>
            {s.label}
          </button>
        ))}
      </nav>

      <div className="lv-days" role="tablist" aria-label="Day">
        {strip.map(({ off: o, d }) => (
          <button key={o} type="button" role="tab" aria-selected={o === off} className={o === off ? "on" : ""} onClick={() => setOff(o)}>
            <span suppressHydrationWarning>{dayLabel(o, d)}</span>
            <small suppressHydrationWarning>{d.getDate()}</small>
          </button>
        ))}
      </div>

      <div className="lv-filters">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" className={`${k === filter ? "on" : ""}${k === "in" ? " lv-f-live" : ""}`} aria-pressed={k === filter} onClick={() => setFilter(k)}>
            {k === "in" ? <i className="nm-dot" aria-hidden="true" /> : null}
            {label}
            {k === "in" && live ? <em>{live}</em> : null}
          </button>
        ))}
        {loading ? <span className="lv-loading" aria-live="polite">Updating…</span> : null}
      </div>

      {(filter === "all" || filter === "in") && live > 0 ? (
        <div className="lv-now">
          <h2>
            <i className="lv-rec" aria-hidden="true" /> Live now <em>{live}</em>
          </h2>
          <div className="lv-posters">
            {events
              .filter((e) => e.state === "in" && e.home && e.away)
              .slice(0, 12)
              .map((e) => {
                const href = matchHref(e);
                const card = (
                  <>
                    <span className="lv-p-lg">{e.leagueLabel}</span>
                    <span className="lv-p-min" suppressHydrationWarning>● {clock(e)}</span>
                    <b className={`lv-p-sc${(e.home!.score + e.away!.score).length > 6 ? " lv-p-long" : ""}`}>
                      <span>{e.home!.score}</span>
                      <i>-</i>
                      <span>{e.away!.score}</span>
                    </b>
                    <span className="lv-p-h">{e.home!.abbr || e.home!.name}</span>
                    <span className="lv-p-a">{e.away!.abbr || e.away!.name}</span>
                  </>
                );
                const style = { ["--h" as string]: kit(e.home!.name), ["--a" as string]: kit(e.away!.name) };
                return href ? (
                  <Link key={e.id} href={href} className="lv-poster" style={style}>
                    {card}
                  </Link>
                ) : (
                  <div key={e.id} className="lv-poster" style={style}>
                    {card}
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}

      {groups.length === 0 ? (
        <p className="lv-empty">{loading ? "Loading matches…" : filter === "in" ? "No live matches right now." : "No matches for this day."}</p>
      ) : (
        groups.map((g) => (
          <div className="lv-group" key={g.league}>
            <div className="lv-ghead">
              <button
                type="button"
                className={`lv-star${pins.includes(g.league) ? " on" : ""}`}
                aria-label={pins.includes(g.league) ? `Unpin ${g.label}` : `Pin ${g.label} to the top`}
                aria-pressed={pins.includes(g.league)}
                onClick={() => togglePin(g.league)}
              >
                ★
              </button>
              <span className="lv-glabel">{g.label}</span>
              {g.evs.some((e) => e.state === "in") ? <span className="lv-gl-live">{g.evs.filter((e) => e.state === "in").length} LIVE</span> : null}
              {g.league !== "cricket" ? (
                <Link className="lv-gmore" href={`/league/${g.league.replace(/\./g, "-")}`}>
                  Table &amp; fixtures
                </Link>
              ) : (
                <Link className="lv-gmore" href="/cricket">
                  All cricket
                </Link>
              )}
            </div>
            <ul>
              {g.evs.map((e) => {
                const href = matchHref(e);
                const hot = flash[e.id] && Date.now() - flash[e.id] < 8000;
                const body = (
                  <>
                    <span className={`lv-clock st-${e.state}`} suppressHydrationWarning>{clock(e)}</span>
                    <span className="lv-teams">
                      <Side t={e.home!} state={e.state} flash={!!hot} />
                      <Side t={e.away!} state={e.state} flash={!!hot} />
                      {longDetail(e) ? <span className="lv-detail">{e.detail}</span> : null}
                    </span>
                  </>
                );
                return (
                  <li key={e.id} className={`lv-row st-${e.state}${hot ? " lv-hot" : ""}`}>
                    {href ? <Link href={href}>{body}</Link> : <div>{body}</div>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
      <p className="lv-note">Kick-off times in your time zone · Live data from ESPN and CricketData · Updates automatically</p>
    </section>
  );
}

/** Light/dark switch for the scoreboard pages (remembered on this device). */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    let v: string | null = null;
    try {
      v = localStorage.getItem("nm-theme");
    } catch {}
    const d = v ? v === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(d);
    document.documentElement.dataset.nmTheme = d ? "dark" : "light";
  }, []);
  if (dark === null) return null;
  return (
    <button
      type="button"
      className="lv-theme"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const d = !dark;
        setDark(d);
        document.documentElement.dataset.nmTheme = d ? "dark" : "light";
        try {
          localStorage.setItem("nm-theme", d ? "dark" : "light");
        } catch {}
      }}
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
