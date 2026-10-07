"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BOARD_LEAGUES } from "./comps";

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
  ["eng.1,uefa.champions,esp.1,ita.1,ger.1,cricket,nba", "All"],
  ["cricket", "Cricket"],
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

/** Match-centre link (clean path; mirrors live.ts matchPath, which is server-only). */
export function matchHref(e: Ev): string | null {
  if (!e.home || !e.away) return null;
  const s = (x: string) => x.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (e.league === "cricket") {
    return /^[0-9a-f-]{36}$/i.test(e.id) ? `/cricket/${e.id}-${`${s(e.home.name)}-vs-${s(e.away.name)}`.slice(0, 80)}` : null;
  }
  if (!/^\d+$/.test(e.id)) return null;
  return `/match/${e.league.replace(/\./g, "-")}/${e.id}-${`${s(e.home.name)}-vs-${s(e.away.name)}`.slice(0, 80)}`;
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
          evs.map((e) => {
            const href = matchHref(e);
            const body = (
              <>
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
              </>
            );
            return href ? (
              <Link href={href} className={`nm-sc st-${e.state}`} key={`${e.league}-${e.id}`} prefetch={false}>
                {body}
              </Link>
            ) : (
              <div className={`nm-sc st-${e.state}`} key={`${e.league}-${e.id}`}>
                {body}
              </div>
            );
          })
        )}
      </div>
      <div className="nm-scores-note">
        Times shown in your timezone · Scores via ESPN · Refreshes every minute ·{" "}
        <Link href="/scores" prefetch={false}>All live scores →</Link>
      </div>
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
          {evs.map((e) => {
            const href = matchHref(e);
            const row = (
              <>
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
              </>
            );
            return (
              <li key={e.id} className={`st-${e.state}`}>
                {href ? <Link href={href} prefetch={false}>{row}</Link> : row}
              </li>
            );
          })}
        </ul>
      )}
      <p className="nm-box-note">Times in your timezone · via ESPN</p>
    </section>
  );
}

/* ── Full scoreboard (/scores) ───────────────────────────── */


function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function days(): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = [];
  for (let i = -2; i <= 4; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label =
      i === 0 ? "Today" : i === -1 ? "Yesterday" : i === 1 ? "Tomorrow" : d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
    out.push({ key: i === 0 ? "" : ymd(d), label });
  }
  return out;
}

function BoardCard({ e }: { e: Ev }) {
  const href = matchHref(e);
  const inner = (
    <>
      <span className="nm-bd-when" suppressHydrationWarning>
        {e.state === "in" ? (
          <>
            <i className="nm-dot" /> {e.detail || "LIVE"}
          </>
        ) : e.state === "pre" ? (
          kickoff(e.date)
        ) : (
          e.detail || "FT"
        )}
      </span>
      {e.home && e.away ? (
        <span className="nm-bd-teams">
          <span className={`t${e.state === "post" && e.home.winner ? " win" : ""}`}>
            {e.home.logo ? <img src={e.home.logo} alt="" width={22} height={22} loading="lazy" /> : <i />}
            {e.home.name}
          </span>
          <b>{e.state === "pre" ? "–" : `${e.home.score} : ${e.away.score}`}</b>
          <span className={`t r${e.state === "post" && e.away.winner ? " win" : ""}`}>
            {e.away.name}
            {e.away.logo ? <img src={e.away.logo} alt="" width={22} height={22} loading="lazy" /> : <i />}
          </span>
        </span>
      ) : (
        <span className="nm-bd-teams">{e.name}</span>
      )}
      {href ? <span className="nm-bd-go" aria-hidden="true">›</span> : null}
    </>
  );
  return href ? (
    <Link href={href} className={`nm-bd-row st-${e.state}`} prefetch={false}>
      {inner}
    </Link>
  ) : (
    <div className={`nm-bd-row st-${e.state}`}>{inner}</div>
  );
}

export function Scoreboard({ initial }: { initial: Ev[] }) {
  const ds = days();
  const [day, setDay] = useState("");
  const [only, setOnly] = useState<"all" | "live">("all");
  const data = useJson<{ events: Ev[] }>(`/api/scores?l=${BOARD_LEAGUES.join(",")}${day ? `&d=${day}` : ""}`, day ? 300000 : 30000);
  const evs = (data ? data.events : day ? null : initial) ?? null;
  const shown = (evs || []).filter((e) => only === "all" || e.state === "in");
  const liveCount = (evs || []).filter((e) => e.state === "in").length;
  const groups = BOARD_LEAGUES.map((l) => ({ l, items: order(shown.filter((e) => e.league === l)) })).filter((g) => g.items.length);

  return (
    <div className="nm-board">
      <div className="nm-board-days" role="tablist" aria-label="Day">
        {ds.map((d) => (
          <button key={d.key || "today"} suppressHydrationWarning role="tab" aria-selected={day === d.key} className={day === d.key ? "on" : ""} onClick={() => setDay(d.key)}>
            {d.label}
          </button>
        ))}
      </div>
      <div className="nm-board-filter">
        <button className={only === "all" ? "on" : ""} onClick={() => setOnly("all")}>All matches</button>
        <button className={only === "live" ? "on" : ""} onClick={() => setOnly("live")}>
          <i className="nm-dot" /> Live now{liveCount ? ` (${liveCount})` : ""}
        </button>
      </div>
      {!evs ? (
        <p className="nm-sc-loading">Loading matches…</p>
      ) : groups.length === 0 ? (
        <div className="nm-box nm-mc-empty">
          <p>{only === "live" ? "No matches are live right now — check today's fixtures." : "No fixtures listed for this day in the leagues we track."}</p>
        </div>
      ) : (
        groups.map((g) => (
          <section className="nm-bd-group" key={g.l}>
            <h2>{g.items[0].leagueLabel}</h2>
            {g.items.map((e) => (
              <BoardCard e={e} key={e.id} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

/** National-team fixtures involving South Asian sides (AFC qualifiers, friendlies). */
export function RegionFixtures({ teams, title }: { teams: string[]; title: string }) {
  const data = useJson<{ events: Ev[] }>(`/api/scores?l=fifa.worldq.afc,afc.asian.cupq,fifa.friendly`, 300000);
  const re = new RegExp(`\\b(${teams.join("|")})\\b`, "i");
  const evs = order((data?.events || []).filter((e) => re.test(`${e.home?.name} ${e.away?.name} ${e.name}`))).slice(0, 10);
  if (data && !evs.length) return null;
  return (
    <section className="nm-box" aria-label={title}>
      <h3 className="nm-box-h">{title}</h3>
      {!data ? (
        <p className="nm-sc-loading">Loading fixtures…</p>
      ) : (
        <div className="nm-board nm-board-mini">
          {evs.map((e) => (
            <BoardCard e={e} key={`${e.league}-${e.id}`} />
          ))}
        </div>
      )}
      <p className="nm-box-note">AFC qualifiers & internationals · via ESPN</p>
    </section>
  );
}
