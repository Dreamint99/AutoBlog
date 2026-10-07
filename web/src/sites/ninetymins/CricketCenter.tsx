"use client";

import { useEffect, useState } from "react";
import type { CrMatch, CrTeam } from "./cricket";

/* Cricket match centre. Server sends the first snapshot; while the match is
   on, the client refreshes from the shared (cached) cricket list. */

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Side({ t }: { t: CrTeam }) {
  return (
    <div className="nm-mc-side">
      {t.img ? (
        <img className="nm-mc-crest" src={t.img} alt={`${t.name} logo`} width={88} height={88} />
      ) : (
        <span className="nm-mc-crest nm-mc-crest-ph" style={{ background: "#0b7a8a" }}>{t.short}</span>
      )}
      <h2>{t.name}</h2>
    </div>
  );
}

export default function CricketCenter({ initial }: { initial: CrMatch }) {
  const [m, setM] = useState(initial);

  useEffect(() => {
    if (m.state === "post") return;
    let alive = true;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      fetch("/api/scores?cricket=1")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          const next = (j?.matches as CrMatch[] | undefined)?.find((x) => x.id === m.id);
          if (alive && next) setM(next);
        })
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 120000);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", load);
    };
  }, [m.id, m.state]);

  const [a, b] = m.teams;
  const innings = m.teams.flatMap((t) => t.innings.map((i) => ({ team: t.name, ...i })));

  return (
    <>
      <section className={`nm-mc-board nm-cr-board st-${m.state}`}>
        <div className="nm-wrap">
          <div className="nm-mc-league">
            <span>Cricket{m.type ? ` · ${m.type}` : ""}</span>
            <span className="nm-mc-state" suppressHydrationWarning>
              {m.state === "in" ? (
                <>
                  <i className="nm-dot" /> LIVE
                </>
              ) : m.state === "pre" ? (
                when(m.date)
              ) : (
                "Result"
              )}
            </span>
          </div>
          <div className="nm-mc-teams">
            <Side t={a} />
            <div className="nm-cr-scores">
              <b>{a.score || (m.state === "pre" ? "" : "—")}</b>
              <span>{m.state === "pre" ? "VS" : "v"}</span>
              <b>{b.score || (m.state === "pre" ? "" : "—")}</b>
            </div>
            <Side t={b} />
          </div>
          {m.status ? <p className="nm-cr-status">{m.status}</p> : null}
          <div className="nm-mc-info">
            {m.venue ? <span>🏟 {m.venue}</span> : null}
            <span suppressHydrationWarning>📅 {when(m.date)}</span>
          </div>
        </div>
      </section>
      <div className="nm-wrap nm-mc-body">
        {innings.length ? (
          <div className="nm-mc-stats">
            <div className="nm-mc-stats-h">
              <span>Innings</span>
              <span>Runs / Wkts (Overs)</span>
            </div>
            {innings.map((i) => (
              <div className="nm-mc-stat" key={i.inning}>
                <div className="row">
                  <span>{i.inning}</span>
                  <b>
                    {i.r}/{i.w} <small>({i.o} ov)</small>
                  </b>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="nm-box nm-mc-empty">
            <h3 className="nm-box-h">Match preview</h3>
            <p>The live score appears here once play starts. Keep this page open — it refreshes by itself.</p>
          </div>
        )}
        <p className="nm-box-note">
          {m.state === "in" ? "Refreshes automatically · " : ""}Data via CricketData.org · Times in your timezone
        </p>
      </div>
    </>
  );
}
