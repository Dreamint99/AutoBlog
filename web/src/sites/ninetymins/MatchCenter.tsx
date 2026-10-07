"use client";

import { useEffect, useState } from "react";
import type { NmMatch, NmKeyEvent, NmLineup } from "./live";

/* Match centre body. Server renders the first snapshot (so the page has real
   HTML for search engines); while the game is live the client re-polls
   /api/scores?match= every 30s and swaps in fresh data. */

const ICON: Record<NmKeyEvent["kind"], string> = {
  goal: "⚽",
  own: "⚽",
  pen: "⚽",
  yellow: "🟨",
  red: "🟥",
  sub: "⇄",
  period: "⏱",
  other: "•",
};

function kickoff(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Crest({ logo, name, color }: { logo: string; name: string; color: string }) {
  return logo ? (
    <img className="nm-mc-crest" src={logo} alt={`${name} crest`} width={88} height={88} />
  ) : (
    <span className="nm-mc-crest nm-mc-crest-ph" style={{ background: color || "#1f222b" }}>
      {name.slice(0, 3).toUpperCase()}
    </span>
  );
}

function pct(a: string, b: string): number {
  const x = parseFloat(a);
  const y = parseFloat(b);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x + y <= 0) return 50;
  return Math.round((x / (x + y)) * 100);
}

function Lineup({ l }: { l: NmLineup }) {
  return (
    <div className="nm-mc-xi">
      <h4>
        {l.team} {l.formation ? <small>{l.formation}</small> : null}
      </h4>
      <ol>
        {l.starters.map((p) => (
          <li key={`${p.n}-${p.name}`}>
            <span className="n">{p.n}</span>
            <span className="nm-mc-pl">{p.name}</span>
            <span className="pos">{p.pos}</span>
            {p.subOut ? <span className="nm-mc-off" title="Substituted off">▼</span> : null}
          </li>
        ))}
      </ol>
      {l.subs.length ? (
        <>
          <h5>Substitutes</h5>
          <ul>
            {l.subs.map((p) => (
              <li key={`${p.n}-${p.name}`} className={p.subIn ? "on" : ""}>
                <span className="n">{p.n}</span>
                <span className="nm-mc-pl">{p.name}</span>
                {p.subIn ? <span className="nm-mc-in" title="Came on">▲</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export default function MatchCenter({ initial }: { initial: NmMatch }) {
  const [m, setM] = useState(initial);
  const [tab, setTab] = useState<"events" | "stats" | "lineups" | "commentary">("events");

  useEffect(() => {
    if (m.state === "post") return;
    let alive = true;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      fetch(`/api/scores?match=${m.league}:${m.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => alive && j?.match && setM(j.match as NmMatch))
        .catch(() => {});
    };
    load(); // the server HTML may be up to 30 min old (edge cache)
    const t = setInterval(load, m.state === "in" ? 30000 : 120000);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", load);
    };
  }, [m.league, m.id, m.state]);

  const live = m.state === "in";
  const tabs = [
    ["events", "Timeline", m.events.length],
    ["stats", "Stats", m.stats.length],
    ["lineups", "Lineups", m.lineups.length],
    ["commentary", "Commentary", m.commentary.length],
  ].filter(([, , n]) => n) as Array<[typeof tab, string, number]>;
  const current = tabs.find(([k]) => k === tab) ? tab : tabs[0]?.[0];
  const hc = m.home.color || "#d50a0a";
  const ac = m.away.color || "#1d3c9c";

  return (
    <>
      <section className={`nm-mc-board st-${m.state}`} style={{ ["--hc" as string]: hc, ["--ac" as string]: ac }}>
        <div className="nm-wrap">
          <div className="nm-mc-league">
            <span>{m.leagueLabel}</span>
            <span className="nm-mc-state" suppressHydrationWarning>
              {live ? (
                <>
                  <i className="nm-dot" /> LIVE {m.clock && m.clock !== "0'" ? m.clock : m.detail}
                </>
              ) : m.state === "pre" ? (
                kickoff(m.date)
              ) : (
                m.detail || "Full time"
              )}
            </span>
          </div>
          <div className="nm-mc-teams">
            <div className="nm-mc-side">
              <Crest logo={m.home.logo} name={m.home.full} color={m.home.color} />
              <h2>{m.home.full}</h2>
              {m.home.form ? <span className="nm-mc-form">{m.home.form}</span> : null}
            </div>
            <div className="nm-mc-score" aria-live="polite">
              {m.state === "pre" ? (
                <span className="nm-mc-vs">VS</span>
              ) : (
                <>
                  <b>{m.home.score || 0}</b>
                  <span>–</span>
                  <b>{m.away.score || 0}</b>
                </>
              )}
              {m.home.shootout && m.away.shootout ? (
                <small>
                  Pens {m.home.shootout}–{m.away.shootout}
                </small>
              ) : null}
            </div>
            <div className="nm-mc-side">
              <Crest logo={m.away.logo} name={m.away.full} color={m.away.color} />
              <h2>{m.away.full}</h2>
              {m.away.form ? <span className="nm-mc-form">{m.away.form}</span> : null}
            </div>
          </div>
          <div className="nm-mc-goals">
            <ul>
              {m.events.filter((e) => ["goal", "own", "pen"].includes(e.kind) && e.side === "home").map((e, i) => (
                <li key={i}>
                  {e.player || e.text} <b>{e.min}</b>
                  {e.kind === "pen" ? " (P)" : e.kind === "own" ? " (OG)" : ""}
                </li>
              ))}
            </ul>
            <ul>
              {m.events.filter((e) => ["goal", "own", "pen"].includes(e.kind) && e.side === "away").map((e, i) => (
                <li key={i}>
                  {e.player || e.text} <b>{e.min}</b>
                  {e.kind === "pen" ? " (P)" : e.kind === "own" ? " (OG)" : ""}
                </li>
              ))}
            </ul>
          </div>
          <div className="nm-mc-info">
            {m.venue ? <span>🏟 {m.venue}{m.city ? `, ${m.city}` : ""}</span> : null}
            {m.state !== "pre" ? <span suppressHydrationWarning>📅 {kickoff(m.date)}</span> : null}
            {m.referee ? <span>Referee: {m.referee}</span> : null}
            {m.attendance ? <span>Attendance: {m.attendance.toLocaleString()}</span> : null}
          </div>
        </div>
      </section>

      <div className="nm-wrap nm-mc-body">
        {tabs.length ? (
          <>
            <div className="nm-mc-tabs" role="tablist">
              {tabs.map(([k, label]) => (
                <button key={k} role="tab" aria-selected={current === k} className={current === k ? "on" : ""} onClick={() => setTab(k)}>
                  {label}
                </button>
              ))}
            </div>

            {current === "events" ? (
              <ol className="nm-mc-timeline">
                {m.events.map((e, i) => (
                  <li key={i} className={`k-${e.kind} s-${e.side || "mid"}`}>
                    <span className="min">{e.min}</span>
                    <span className="ico" aria-hidden="true">{ICON[e.kind]}</span>
                    <span className="txt">{e.text || e.player}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {current === "stats" ? (
              <div className="nm-mc-stats">
                <div className="nm-mc-stats-h">
                  <span>{m.home.abbr || m.home.name}</span>
                  <span>{m.away.abbr || m.away.name}</span>
                </div>
                {m.stats.map((s) => {
                  const p = pct(s.home, s.away);
                  return (
                    <div className="nm-mc-stat" key={s.label}>
                      <div className="row">
                        <b>{s.home}</b>
                        <span>{s.label}</span>
                        <b>{s.away}</b>
                      </div>
                      <div className="bar">
                        <i style={{ width: `${p}%`, background: hc }} />
                        <i style={{ width: `${100 - p}%`, background: ac }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {current === "lineups" ? (
              <div className="nm-mc-lineups">
                {[...m.lineups].sort((a) => (a.side === "home" ? -1 : 1)).map((l) => (
                  <Lineup l={l} key={l.side} />
                ))}
              </div>
            ) : null}

            {current === "commentary" ? (
              <ol className="nm-mc-comm">
                {m.commentary.map((c, i) => (
                  <li key={i}>
                    <span className="min">{c.min}</span>
                    <p>{c.text}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        ) : (
          <div className="nm-box nm-mc-empty">
            <h3 className="nm-box-h">{m.state === "pre" ? "Match preview" : "Match data"}</h3>
            <p>
              {m.state === "pre"
                ? "Line-ups, the live timeline and match stats appear here automatically once the teams are announced and the game kicks off. Keep this page open — it updates by itself."
                : "Detailed data for this match is not available from our feed."}
            </p>
          </div>
        )}
        <p className="nm-box-note">
          {live ? "Updating automatically every 30 seconds · " : ""}Data via ESPN · Times in your timezone
        </p>
      </div>
    </>
  );
}
