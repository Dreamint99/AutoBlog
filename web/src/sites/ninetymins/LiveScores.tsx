"use client";

import { useEffect, useState } from "react";

/* Client-side live data (the page HTML is edge-cached for 30 min, scores can't
   be). Fetches /api/scores, refreshes every 60s while the tab is visible, and
   renders nothing at all if the feed is empty or down. */

type Team = { name: string; abbr: string; logo: string; score: string; winner: boolean };
type Ev = {
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
type Row = { rank: number; team: string; abbr: string; logo: string; played: number; points: number; gd: number };

const TABS: Array<[string, string]> = [
  ["eng.1,uefa.champions,esp.1,ita.1,ger.1,nba", "All"],
  ["eng.1", "Premier League"],
  ["uefa.champions", "Champions League"],
  ["esp.1", "LaLiga"],
  ["ita.1", "Serie A"],
  ["ger.1", "Bundesliga"],
  ["nba", "NBA"],
  ["f1", "F1"],
];

function kickoff(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return sameDay ? time : `${d.toLocaleDateString([], { weekday: "short", day: "numeric" })} ${time}`;
}

function useJson<T>(url: string, every = 60000): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => alive && j && setData(j as T))
        .catch(() => {});
    };
    load();
    const t = setInterval(load, every);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", load);
    };
  }, [url, every]);
  return data;
}

function order(evs: Ev[]): Ev[] {
  const rank = { in: 0, pre: 1, post: 2 } as const;
  return [...evs].sort(
    (a, b) =>
      rank[a.state] - rank[b.state] ||
      (a.state === "post" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)),
  );
}

function TeamLine({ t, state }: { t: Team; state: Ev["state"] }) {
  return (
    <span className={`nm-sc-team${state === "post" && t.winner ? " win" : ""}`}>
      {t.logo ? <img src={t.logo} alt="" width={18} height={18} /> : <i />}
      <span className="nm-sc-name">{t.abbr || t.name}</span>
      {state !== "pre" ? <b>{t.score}</b> : null}
    </span>
  );
}

export function ScoreStrip() {
  const [tab, setTab] = useState(TABS[0][0]);
  const data = useJson<{ events: Ev[] }>(`/api/scores?l=${tab}`);
  const evs = order(data?.events || []).slice(0, 24);
  if (data && !data.events.length && tab === TABS[0][0]) return null;

  return (
    <div className="nm-scores" aria-label="Scores">
      <div className="nm-scores-tabs" role="tablist">
        {TABS.map(([v, label]) => (
          <button key={v} role="tab" aria-selected={tab === v} className={tab === v ? "on" : ""} onClick={() => setTab(v)}>
            {label}
          </button>
        ))}
      </div>
      <div className="nm-scores-row">
        {!data ? (
          <span className="nm-sc-loading">Loading scores…</span>
        ) : evs.length === 0 ? (
          <span className="nm-sc-loading">No fixtures listed right now.</span>
        ) : (
          evs.map((e) => (
            <div className={`nm-sc st-${e.state}`} key={`${e.league}-${e.id}`}>
              <div className="nm-sc-head">
                <span>{e.leagueLabel}</span>
                <span className="nm-sc-status">
                  {e.state === "in" ? <i className="nm-dot" /> : null}
                  {e.state === "pre" ? kickoff(e.date) : e.detail}
                </span>
              </div>
              {e.home && e.away ? (
                <>
                  <TeamLine t={e.away} state={e.state} />
                  <TeamLine t={e.home} state={e.state} />
                </>
              ) : (
                <span className="nm-sc-event">{e.name}</span>
              )}
            </div>
          ))
        )}
      </div>
      <div className="nm-scores-note">Times shown in your timezone · Scores via ESPN · Refreshes every minute</div>
    </div>
  );
}

export function LeagueTable({ league = "eng.1", title = "Premier League table", rows = 10 }: { league?: string; title?: string; rows?: number }) {
  const data = useJson<{ table: Row[] }>(`/api/scores?table=${league}`, 600000);
  const table = (data?.table || []).slice(0, rows);
  if (data && !table.length) return null;
  return (
    <section className="nm-box nm-table" aria-label={title}>
      <h3 className="nm-box-h">{title}</h3>
      {!data ? (
        <p className="nm-sc-loading">Loading table…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>P</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r) => (
              <tr key={r.abbr || r.team}>
                <td>{r.rank}</td>
                <td className="nm-t-team">
                  {r.logo ? <img src={r.logo} alt="" width={16} height={16} loading="lazy" /> : null}
                  {r.team}
                </td>
                <td>{r.played}</td>
                <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td>
                  <b>{r.points}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="nm-box-note">Standings via ESPN</p>
    </section>
  );
}

/** Upcoming/live fixtures for one league — used on competition hub pages. */
export function LeagueFixtures({ league, title }: { league: string; title: string }) {
  const data = useJson<{ events: Ev[] }>(`/api/scores?l=${league}`);
  const evs = order(data?.events || []).slice(0, 12);
  if (data && !evs.length) return null;
  return (
    <section className="nm-box" aria-label={title}>
      <h3 className="nm-box-h">{title}</h3>
      {!data ? (
        <p className="nm-sc-loading">Loading fixtures…</p>
      ) : (
        <ul className="nm-fx">
          {evs.map((e) => (
            <li key={e.id} className={`st-${e.state}`}>
              <span className="nm-fx-when">
                {e.state === "in" ? <i className="nm-dot" /> : null}
                {e.state === "pre" ? kickoff(e.date) : e.detail}
              </span>
              {e.home && e.away ? (
                <span className="nm-fx-teams">
                  <span>{e.home.name}</span>
                  <b>{e.state === "pre" ? "vs" : `${e.home.score} – ${e.away.score}`}</b>
                  <span>{e.away.name}</span>
                </span>
              ) : (
                <span className="nm-fx-teams">{e.name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="nm-box-note">Times in your timezone · via ESPN</p>
    </section>
  );
}
