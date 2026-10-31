"use client";

import { useEffect, useMemo, useState } from "react";

/* SAFF live centre — every SAFF tournament (men, women, youth), Bangladesh and news.
   Data: nm-api /v1/saff (Wikipedia + ESPN live + Google News, rebuilt by the Worker cron),
   the same feed the Android app reads. Refreshes every 20 s while something is live, else 60 s. */

export const SAFF_API = "https://api.ninetymins.com/v1/saff";

type Team = { name: string; code: string; flag: string };
export type Match = {
  id: string;
  comp: string;
  stage: string;
  date: string;
  home: Team;
  away: Team;
  hs: string;
  as: string;
  pen: string;
  state: "pre" | "in" | "post";
  detail: string;
  venue: string;
  goals: { home: string[]; away: string[] };
  espn?: { league: string; id: string };
  compName?: string;
  short?: string;
};
type Row = { team: Team; p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number };
type Comp = {
  id: string;
  title: string;
  name: string;
  short: string;
  year: number;
  host: string;
  dates: string;
  status: "live" | "upcoming" | "done";
  champion: string;
  wiki: string;
  matches: Match[];
  tables: Array<{ name: string; rows: Row[] }>;
  scorers: Array<{ name: string; team: string; flag: string; goals: number }>;
};
export type SaffFeed = {
  t: number;
  live: Match[];
  comps: Comp[];
  bangladesh: { next: Match[]; recent: Match[]; senior: Match[]; seniorNext?: Match[]; women?: Match[]; womenNext?: Match[] };
  news: Array<{ title: string; source: string; url: string; date: string }>;
};
type Squad = { team: Team; players: Array<{ no: string; pos: string; name: string; club: string; caps: string; goals: string; captain: boolean }> };

const TABS = ["Matches", "Table", "Scorers", "Squads"] as const;

function Flag({ t, size = 24 }: { t: Team | { flag: string; name: string }; size?: number }) {
  if (!t.flag) return <i className="nm-sf-flag nm-sf-noflag" style={{ width: size, height: Math.round(size * 0.7) }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="nm-sf-flag" src={`https://flagcdn.com/w40/${t.flag}.png`} alt="" width={size} height={Math.round(size * 0.7)} loading="lazy" />;
}

const dhaka = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString("en-GB", { ...o });
const timeOf = (iso: string) => dhaka(iso, { hour: "2-digit", minute: "2-digit" });
const dayOf = (iso: string) => dhaka(iso, { weekday: "short", day: "numeric", month: "short" });

function ago(iso: string): string {
  const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
}

function matchLink(m: Match): string | null {
  if (!m.espn?.id || !/^\d+$/.test(m.espn.id) || !m.espn.league) return null;
  const s = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `/match/${m.espn.league.replace(/\./g, "-")}/${m.espn.id}-${s(m.home.name)}-vs-${s(m.away.name)}`;
}

export function MatchRow({ m, showComp = false }: { m: Match; showComp?: boolean }) {
  const [open, setOpen] = useState(false);
  const hasGoals = m.goals.home.length + m.goals.away.length > 0;
  const href = matchLink(m);
  const played = m.state !== "pre" && m.hs !== "";
  const hw = played && (+m.hs > +m.as || (m.pen && +m.pen.split("–")[0] > +m.pen.split("–")[1]));
  const aw = played && (+m.as > +m.hs || (m.pen && +m.pen.split("–")[1] > +m.pen.split("–")[0]));
  return (
    <div className={`nm-sf-m${m.state === "in" ? " live" : ""}`}>
      <div className="nm-sf-meta">
        {showComp && m.short && m.comp !== "bangladesh" && m.comp !== "bangladesh-w" ? <b>{m.short === "Men" ? "SAFF" : `SAFF ${m.short}`}</b> : null}
        <span>{m.stage}</span>
        {m.state === "in" ? (
          <em className="nm-sf-live">
            <i className="nm-dot" /> {m.detail || "LIVE"}
          </em>
        ) : m.state === "post" ? (
          <em>{m.detail || "FT"}</em>
        ) : (
          <em>{dayOf(m.date)}</em>
        )}
      </div>
      <button className="nm-sf-line" onClick={() => setOpen(!open)} disabled={!hasGoals && !href} aria-expanded={open}>
        <span className={`nm-sf-t home${hw ? " win" : ""}`}>
          <span>{m.home.name}</span>
          <Flag t={m.home} />
        </span>
        <span className="nm-sf-score">{played ? `${m.hs} – ${m.as}` : timeOf(m.date)}</span>
        <span className={`nm-sf-t${aw ? " win" : ""}`}>
          <Flag t={m.away} />
          <span>{m.away.name}</span>
        </span>
      </button>
      {m.pen ? <div className="nm-sf-pen">{m.pen} on penalties</div> : null}
      {open ? (
        <div className="nm-sf-goals">
          <ul>{m.goals.home.map((g) => <li key={g}>⚽ {g}</li>)}</ul>
          <ul>{m.goals.away.map((g) => <li key={g}>⚽ {g}</li>)}</ul>
          {m.venue ? <small>{m.venue}</small> : null}
          {href ? <a href={href}>Match centre →</a> : null}
        </div>
      ) : null}
    </div>
  );
}

function Matches({ c }: { c: Comp }) {
  if (!c.matches.length) return <p className="nm-sf-empty">Fixtures will appear here as soon as they are announced.</p>;
  const days: Array<[string, Match[]]> = [];
  for (const m of c.matches) {
    const d = dayOf(m.date);
    const last = days[days.length - 1];
    if (last && last[0] === d) last[1].push(m);
    else days.push([d, [m]]);
  }
  return (
    <div className="nm-sf-days">
      {days.map(([d, ms]) => (
        <section key={d}>
          <h4>{d}</h4>
          {ms.map((m) => (
            <MatchRow m={m} key={m.id} />
          ))}
        </section>
      ))}
    </div>
  );
}

function Tables({ c }: { c: Comp }) {
  if (!c.tables.length) return <p className="nm-sf-empty">No group table for this tournament yet.</p>;
  return (
    <div className="nm-sf-tables">
      {c.tables.map((g) => (
        <table key={g.name} className="nm-sf-table">
          <caption>{g.name}</caption>
          <thead>
            <tr>
              <th>#</th>
              <th className="tl">Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {g.rows.map((r, i) => (
              <tr key={r.team.code} className={r.team.code === "BAN" ? "bd" : ""}>
                <td>{i + 1}</td>
                <td className="tl">
                  <Flag t={r.team} size={20} /> {r.team.name}
                </td>
                <td>{r.p}</td>
                <td>{r.w}</td>
                <td>{r.d}</td>
                <td>{r.l}</td>
                <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td>
                  <b>{r.pts}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}

function Scorers({ c }: { c: Comp }) {
  if (!c.scorers.length) return <p className="nm-sf-empty">No goals yet — top scorers appear after the first match.</p>;
  return (
    <ol className="nm-sf-scorers">
      {c.scorers.map((s) => (
        <li key={`${s.team}${s.name}`}>
          <Flag t={s} size={20} />
          <span>
            {s.name}
            <small>{s.team}</small>
          </span>
          <b>{s.goals}</b>
        </li>
      ))}
    </ol>
  );
}

function Squads({ c }: { c: Comp }) {
  const [all, setAll] = useState<Record<string, Squad[]> | null>(null);
  const [team, setTeam] = useState(0);
  useEffect(() => {
    fetch(`${SAFF_API}-squads`)
      .then((r) => r.json())
      .then((j) => setAll(j.squads || {}))
      .catch(() => setAll({}));
  }, []);
  if (!all) return <p className="nm-sf-empty">Loading squads…</p>;
  const sq = all[c.id] || [];
  if (!sq.length) return <p className="nm-sf-empty">Squads appear here when the federations announce them.</p>;
  const cur = sq[Math.min(team, sq.length - 1)];
  return (
    <div>
      <div className="nm-sf-chips small">
        {sq.map((s, i) => (
          <button key={s.team.name} className={i === team ? "on" : ""} onClick={() => setTeam(i)}>
            <Flag t={s.team} size={18} /> {s.team.name}
          </button>
        ))}
      </div>
      <ul className="nm-sf-squad">
        {cur.players.map((p) => (
          <li key={`${p.no}${p.name}`}>
            <b>{p.no}</b>
            <em>{p.pos}</em>
            <span>
              {p.name}
              {p.captain ? <i title="Captain">C</i> : null}
              {p.club ? <small>{p.club}</small> : null}
            </span>
            {p.caps ? (
              <small className="caps">
                {p.caps} caps · {p.goals || 0} g
              </small>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BangladeshBox({ bd }: { bd: SaffFeed["bangladesh"] }) {
  const [w, setW] = useState(false);
  const byDate = (a: Match, b: Match) => a.date.localeCompare(b.date);
  const uniq = (ms: Match[]) => ms.filter((m, i) => ms.findIndex((x) => x.home.name === m.home.name && x.away.name === m.away.name && Math.abs(Date.parse(x.date) - Date.parse(m.date)) < 86_400_000) === i);
  const men = { next: uniq([...bd.next.filter((m) => m.short === "Men"), ...(bd.seniorNext || [])].sort(byDate)), past: uniq([...bd.senior, ...bd.recent.filter((m) => m.short === "Men")].sort(byDate).reverse()) };
  const women = { next: uniq([...bd.next.filter((m) => m.short !== "Men"), ...(bd.womenNext || [])].sort(byDate)), past: uniq([...(bd.women || []), ...bd.recent.filter((m) => m.short !== "Men")].sort(byDate).reverse()) };
  const cur = w ? women : men;
  return (
    <section className="nm-sf-card">
      <h2 className="nm-sf-h">🇧🇩 Bangladesh</h2>
      <div className="nm-sf-tabs two" role="tablist">
        <button className={!w ? "on" : ""} onClick={() => setW(false)}>Men</button>
        <button className={w ? "on" : ""} onClick={() => setW(true)}>Women &amp; youth</button>
      </div>
      {cur.next.length ? (
        <>
          <h4 className="nm-sf-sub">Next</h4>
          {cur.next.slice(0, 3).map((m) => (
            <MatchRow m={m} showComp key={m.id} />
          ))}
        </>
      ) : null}
      <h4 className="nm-sf-sub">Recent results</h4>
      {cur.past.length ? cur.past.slice(0, 6).map((m) => <MatchRow m={m} showComp key={m.id} />) : <p className="nm-sf-empty">No recent matches.</p>}
    </section>
  );
}

export default function SaffCentre({ initial }: { initial: SaffFeed | null }) {
  const [d, setD] = useState<SaffFeed | null>(initial);
  const [sel, setSel] = useState(0);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Matches");
  const live = (d?.live.length || 0) > 0;

  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      fetch(SAFF_API)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => alive && j?.comps && setD(j))
        .catch(() => {});
    };
    if (!initial) load();
    const t = setInterval(load, live ? 20000 : 60000);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", load);
    };
  }, [initial, live]);

  const comps = useMemo(() => d?.comps || [], [d]);
  const c = comps[Math.min(sel, Math.max(0, comps.length - 1))];
  if (!d || !c) return <p className="nm-sf-empty">Loading SAFF data…</p>;
  const bd = d.bangladesh;

  return (
    <div className="nm-sf">
      {d.live.length ? (
        <section className="nm-sf-card nm-sf-livebox">
          <h2>
            <i className="nm-dot" /> Live now
          </h2>
          {d.live.map((m) => (
            <MatchRow m={m} showComp key={m.id} />
          ))}
        </section>
      ) : null}

      <div className="nm-sf-chips" role="tablist" aria-label="Tournaments">
        {comps.map((x, i) => (
          <button key={x.id} className={i === sel ? "on" : ""} onClick={() => (setSel(i), setTab("Matches"))} role="tab" aria-selected={i === sel}>
            {x.status === "live" ? <i className="nm-dot" /> : null}
            {x.short} {x.year}
          </button>
        ))}
      </div>

      <section className="nm-sf-card">
        <header className="nm-sf-head">
          <div>
            <h2>
              {c.year} {c.name}
            </h2>
            <p>
              {[c.host, c.dates].filter(Boolean).join(" · ")}
              {c.champion ? ` · 🏆 ${c.champion}` : c.status === "live" ? " · In progress" : c.status === "upcoming" ? " · Coming up" : ""}
            </p>
          </div>
        </header>
        <div className="nm-sf-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} className={t === tab ? "on" : ""} onClick={() => setTab(t)} role="tab" aria-selected={t === tab}>
              {t}
            </button>
          ))}
        </div>
        {tab === "Matches" ? <Matches c={c} /> : tab === "Table" ? <Tables c={c} /> : tab === "Scorers" ? <Scorers c={c} /> : <Squads c={c} />}
        <p className="nm-sf-src">
          Updated {ago(new Date(d.t).toISOString())} · Sources: Wikipedia (<a href={c.wiki} target="_blank" rel="noopener nofollow">page</a>), FotMob &amp; ESPN live
        </p>
      </section>

      <div className="nm-sf-two">
        <BangladeshBox bd={bd} />

        <section className="nm-sf-card">
          <h2 className="nm-sf-h">SAFF news</h2>
          <ul className="nm-sf-news">
            {d.news.slice(0, 12).map((n) => (
              <li key={n.url}>
                <a href={n.url} target="_blank" rel="noopener nofollow">
                  {n.title}
                </a>
                <small>
                  {n.source} · {ago(n.date)}
                </small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
