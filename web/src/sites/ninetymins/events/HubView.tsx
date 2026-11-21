"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Fx, Hub, LiveHit } from "./types";
import { matchPath, teamPath } from "./paths";
import { knownTeam } from "./directory";
import type { TableRow } from "./table";
import { ZONES, countdown, formatKick, formatVenueDate } from "./zones";
import { IPL_PURSE, IPL_RETAINED } from "./retentions";
import type { LeagueStats } from "./stats-type";

const TABS = ["Schedule", "Numbers", "Squads", "Watch"] as const;
type Tab = (typeof TABS)[number];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function HubView({ hub, live, stats, prefix = "", schedule, table }: { hub: Hub; live: LiveHit[]; stats: LeagueStats | null; prefix?: string; schedule?: Fx[]; table?: { title: string; note: string; rows: TableRow[] } | null }) {
  const [zone, setZone] = useState("");
  const [tab, setTab] = useState<Tab>("Schedule");
  const [stage, setStage] = useState("All");
  const [side, setSide] = useState("All");
  const [now, setNow] = useState(() => Date.now());
  const [aTeam, setATeam] = useState(stats?.latest.teams[0]?.name || "");
  const [bTeam, setBTeam] = useState(stats?.latest.teams[1]?.name || "");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const board = schedule || hub.fixtures;
  const stages = useMemo(() => ["All", ...Array.from(new Set(board.map((f) => f.stage)))], [board]);
  const sides = useMemo(() => {
    const s = new Set<string>();
    for (const f of board) {
      if (f.home) s.add(f.home);
      if (f.away) s.add(f.away);
    }
    return ["All", ...Array.from(s).sort()];
  }, [board]);

  const fixtures = board.filter((f) => (stage === "All" || f.stage === stage) && (side === "All" || f.home === side || f.away === side));
  const next = board.find((f) => f.start && new Date(f.start).getTime() > now);
  const left = next?.start ? countdown(next.start, now) : null;
  const showSquads = hub.slug === "ipl-2027";
  const tabs = TABS.filter((t) => t !== "Squads" || showSquads);

  return (
    <div className="nv-ev">
      <header className="nm-wrap nv-pagehead">
        <p className="nv-ev-kicker">{hub.kicker}</p>
        <h1>{hub.h1}</h1>
        {hub.lede.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
        <p className={`nv-ev-window is-${hub.windowStatus}`}>
          <b>{hub.windowStatus === "confirmed" ? "Confirmed" : hub.windowStatus === "partial" ? "Part confirmed" : "Not fixed"}</b>
          <span>{hub.window}</span>
        </p>
      </header>

      {next && left ? (
        <div className="nv-ev-next">
          <div className="nm-wrap nv-ev-next-in">
            <div>
              <p>Next scheduled start</p>
              <strong>{next.name}</strong>
              <small>{formatKick(next.start!, zone)}{next.city ? ` · ${next.city}` : ""}</small>
            </div>
            <p className="nv-ev-count" role="timer" aria-label={`${left.d} days ${left.h} hours ${left.m} minutes`}>
              <span><b>{left.d}</b>d</span>
              <span><b>{pad(left.h)}</b>h</span>
              <span><b>{pad(left.m)}</b>m</span>
              <span><b>{pad(left.s)}</b>s</span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="nm-wrap nv-ev-facts">
        {hub.facts.map((f) => (
          <p key={f.label}><small>{f.label}</small><b>{f.value}</b></p>
        ))}
      </div>

      {table && table.rows.length ? (
        <section className="nm-wrap nv-ev-table" aria-label="Points">
          <h2>{table.title}</h2>
          <div className="nv-ev-tablewrap">
            <table className="nm-fixtures">
              <caption>{table.note}</caption>
              <thead><tr><th>Team</th><th>P</th><th>W</th><th>L</th><th>NR</th><th>Pts</th><th>Last</th></tr></thead>
              <tbody>
                {table.rows.map((r) => (
                  <tr key={r.name}><td>{knownTeam(hub.slug, r.name) ? <Link href={`${prefix}${teamPath(hub.slug, r.name)}`}>{r.name}</Link> : r.name}</td><td>{r.p}</td><td>{r.w}</td><td>{r.l}</td><td>{r.nr}</td><td>{r.pts}</td><td>{r.form}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {live.length ? (
        <section className="nm-wrap nv-ev-live" aria-label="On the live board">
          <div className="nv-sec-head">
            <h2>On the live board</h2>
            <Link href={`${prefix}${hub.sport === "football" ? "/league/uefa-champions" : "/cricket"}`}>Open the full board</Link>
          </div>
          <ul>
            {live.slice(0, 8).map((m) => (
              <li key={m.id}>
                <Link href={m.href.startsWith("/") ? `${prefix}${m.href}` : m.href}>
                  <i className={m.state === "in" ? "is-live" : ""}>{m.state === "in" ? "Live" : m.state === "post" ? "FT" : "Soon"}</i>
                  <b>{m.home} <span>vs</span> {m.away}</b>
                  <small>{m.score || m.detail}</small>
                </Link>
              </li>
            ))}
          </ul>
          <p className="nv-ev-fine">Same feed as the rest of the site. This page does not call a second score API.</p>
        </section>
      ) : (
        <p className="nm-wrap nv-ev-fine">Nothing from this competition is on the live board right now. When it is, it will show up from the same cricket or Champions League feed.</p>
      )}

      <div className="nm-wrap nv-ev-tabs" role="tablist" aria-label="Sections">
        {tabs.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "is-on" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Schedule" ? (
        <section className="nm-wrap" role="tabpanel">
          <div className="nv-ev-tools">
            <label>Time zone
              <select value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Time zone">
                {ZONES.map((z) => <option key={z.label} value={z.id}>{z.label}</option>)}
              </select>
            </label>
            {stages.length > 2 ? (
              <label>Stage
                <select value={stage} onChange={(e) => setStage(e.target.value)}>
                  {stages.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            ) : null}
            {sides.length > 2 ? (
              <label>Team
                <select value={side} onChange={(e) => setSide(e.target.value)}>
                  {sides.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            ) : null}
          </div>
          <div className="nv-ev-zones" role="group" aria-label="Quick time zones">
            {ZONES.map((z) => (
              <button key={z.label} type="button" className={zone === z.id ? "is-on" : ""} onClick={() => setZone(z.id)}>{z.label}</button>
            ))}
          </div>
          <p className="nv-ev-fine">{hub.fixtureNote}</p>
          {fixtures.length ? (
            <ol className="nv-ev-cards">
              {fixtures.map((f) => <Card key={f.id} f={f} zone={zone} event={hub.slug} prefix={prefix} />)}
            </ol>
          ) : (
            <p className="nv-ev-empty">No matches in this filter. Fixtures that are not published stay off the page.</p>
          )}
        </section>
      ) : null}

      {tab === "Numbers" ? <Numbers stats={stats} aTeam={aTeam} bTeam={bTeam} setA={setATeam} setB={setBTeam} /> : null}
      {tab === "Squads" && showSquads ? <Squads prefix={prefix} /> : null}
      {tab === "Watch" ? (
        <section className="nm-wrap nv-ev-prose" role="tabpanel">
          <h2>Where to watch</h2>
          {hub.watch.length ? (
            <ul className="nv-ev-watch">
              {hub.watch.map((w) => (
                <li key={w.place}><b>{w.place}</b><span>{w.how}</span></li>
              ))}
            </ul>
          ) : null}
          <p>{hub.watchNote}</p>
          <p>NinetyMins does not link to unofficial streams.</p>
        </section>
      ) : null}

      <section className="nm-wrap nv-ev-more">
        <h2>Also on NinetyMins</h2>
        <ul className="nv-tiles">
          {hub.links.map((l) => (
            <li key={l.href}><Link href={`${prefix}${l.href}`}><b>{l.label}</b></Link></li>
          ))}
        </ul>
        <h2>Sources</h2>
        <ul className="nv-ev-src">
          {hub.sources.map((s) => (
            <li key={s.url}><a href={s.url} rel="noopener noreferrer">{s.label}</a></li>
          ))}
          {stats ? <li>Match figures: computed by NinetyMins from <a href="https://cricsheet.org/">Cricsheet</a> {stats.file}, retrieved {stats.retrieved}. Data © Cricsheet, {stats.license}.</li> : null}
        </ul>
      </section>
    </div>
  );
}

function Card({ f, zone, event, prefix }: { f: Fx; zone: string; event: string; prefix: string }) {
  const when = f.start ? formatKick(f.start, zone) : f.localDate ? `${formatVenueDate(f.localDate)} · venue date` : "Date not published";
  const side = (name?: string) => name && knownTeam(event, name) ? <Link href={`${prefix}${teamPath(event, name)}`}>{name}</Link> : name;
  return (
    <li className="nv-ev-card">
      <p className="nv-ev-stage">{f.stage}</p>
      <h3><Link href={`${prefix}${matchPath(event, f.id)}`}>{f.home && f.away ? <>{side(f.home)} vs {side(f.away)}</> : f.name}</Link></h3>
      <p className="nv-ev-when">{when}</p>
      <p className="nv-ev-place">{[f.venue, f.city].filter((x, i, a) => x && a.indexOf(x) === i).join(" · ") || "Venue TBC"}</p>
      {f.start ? (
        <dl className="nv-ev-clocks">
          {ZONES.filter((z) => z.id).map((z) => (
            <div key={z.id}><dt>{z.label}</dt><dd>{formatKick(f.start!, z.id)}</dd></div>
          ))}
        </dl>
      ) : (
        <p className="nv-ev-fine">No kick-off was published, so this is not converted into other zones.</p>
      )}
      {f.note ? <p className="nv-ev-fine">{f.note}</p> : null}
    </li>
  );
}

function Numbers({ stats, aTeam, bTeam, setA, setB }: { stats: LeagueStats | null; aTeam: string; bTeam: string; setA: (s: string) => void; setB: (s: string) => void }) {
  if (!stats) {
    return <section className="nm-wrap nv-ev-prose" role="tabpanel"><h2>Numbers</h2><p>This competition has no Cricsheet match file on the page. Live results stay on the scoreboard.</p></section>;
  }
  const teams = stats.latest.teams;
  const pair = stats.latest.h2h.find((h) => (h.a === aTeam && h.b === bTeam) || (h.a === bTeam && h.b === aTeam));
  const aWins = pair ? (pair.a === aTeam ? pair.aWins : pair.bWins) : 0;
  const bWins = pair ? (pair.a === bTeam ? pair.aWins : pair.bWins) : 0;
  return (
    <section className="nm-wrap nv-ev-nums" role="tabpanel">
      <h2>{stats.label}, {stats.latest.season}</h2>
      <p className="nv-ev-fine">{stats.latest.matches} matches in the file, {stats.latest.from} to {stats.latest.to}. All-time file: {stats.matches} matches, {stats.from} to {stats.to}.</p>
      <div className="nv-ev-split">
        <article>
          <h3>Chasing</h3>
          <Bar label={`This season ${pct(stats.latest.chase.rate)}`} value={stats.latest.chase.rate} hint={`${stats.latest.chase.wins} of ${stats.latest.chase.matches} clean chases`} />
          <Bar label={`All files ${pct(stats.all.chase.rate)}`} value={stats.all.chase.rate} hint={`${stats.all.chase.wins} of ${stats.all.chase.matches}`} />
        </article>
        <article>
          <h3>Toss</h3>
          <Bar label={`Field, season ${pct(stats.latest.toss.field.rate)}`} value={stats.latest.toss.field.rate} hint={`${stats.latest.toss.field.wins}/${stats.latest.toss.field.chosen} wins after bowling first`} />
          <Bar label={`Bat, season ${pct(stats.latest.toss.bat.rate)}`} value={stats.latest.toss.bat.rate} hint={`${stats.latest.toss.bat.wins}/${stats.latest.toss.bat.chosen} wins after batting first`} />
        </article>
      </div>
      <h3>Teams</h3>
      <div className="nv-ev-tablewrap">
        <table className="nm-fixtures">
          <caption>Results in the latest Cricsheet season, playoffs included. Form is the last five matches, oldest on the left.</caption>
          <thead><tr><th>Team</th><th>P</th><th>W</th><th>L</th><th>NR</th><th>Last five</th></tr></thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.name}><td>{t.name}</td><td>{t.p}</td><td>{t.w}</td><td>{t.l}</td><td>{t.nr}</td><td>{t.form}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Compare two sides</h3>
      <div className="nv-ev-tools">
        <label>Side A<select value={aTeam} onChange={(e) => setA(e.target.value)}>{teams.map((t) => <option key={t.name}>{t.name}</option>)}</select></label>
        <label>Side B<select value={bTeam} onChange={(e) => setB(e.target.value)}>{teams.map((t) => <option key={t.name}>{t.name}</option>)}</select></label>
      </div>
      {aTeam && bTeam && aTeam !== bTeam ? (
        <div className="nv-ev-vs">
          <p><b>{aTeam}</b><span>{teams.find((t) => t.name === aTeam)?.form}</span></p>
          <p className="nv-ev-vs-mid">{pair ? `${aWins}–${bWins} in ${pair.matches} meetings this season` : "No meeting in this season's file"}</p>
          <p><b>{bTeam}</b><span>{teams.find((t) => t.name === bTeam)?.form}</span></p>
        </div>
      ) : <p className="nv-ev-fine">Pick two different teams.</p>}
      <h3>Venues</h3>
      <div className="nv-ev-bars">
        {stats.latest.venues.slice(0, 8).map((v) => (
          <Bar key={v.name} label={`${v.name}${v.city ? `, ${v.city}` : ""}`} value={v.chaseRate} hint={`${v.matches} matches · first innings avg ${v.firstInningsAvg ?? "–"} · chase ${v.chaseWins}/${v.chaseMatches}`} />
        ))}
      </div>
      <ul className="nv-ev-fine">
        {stats.notes.map((n) => <li key={n}>{n}</li>)}
      </ul>
    </section>
  );
}

function Bar({ label, value, hint }: { label: string; value: number | null; hint: string }) {
  const pctv = value == null ? 0 : Math.round(value * 100);
  return (
    <div className="nv-ev-bar">
      <div><span>{label}</span><b>{value == null ? "–" : `${pctv}%`}</b></div>
      <div className="nv-ev-track" role="img" aria-label={`${label} ${value == null ? "no sample" : pctv + " percent"}. ${hint}`}>
        <i style={{ width: `${pctv}%` }} />
      </div>
      <small>{hint}</small>
    </div>
  );
}

function pct(v: number | null) {
  return v == null ? "–" : `${Math.round(v * 100)}%`;
}

function Squads({ prefix }: { prefix: string }) {
  const overseas = IPL_RETAINED.reduce((n, t) => n + t.players.filter((p) => p.overseas).length, 0);
  const total = IPL_RETAINED.reduce((n, t) => n + t.players.length, 0);
  return (
    <section className="nm-wrap nv-ev-squads" role="tabpanel">
      <h2>Retained for 2027</h2>
      <p className="nv-ev-fine">
        Names are the BCCI advisory of 18 November 2026. Counting the names on this page gives {total} players and {overseas} marked overseas.
        The advisory also states {IPL_PURSE.retained} retained, {IPL_PURSE.overseas} overseas, ₹{IPL_PURSE.spentCr} crore spent and ₹{IPL_PURSE.leftCr} crore left, with {IPL_PURSE.slots} places and {IPL_PURSE.overseasSlots} overseas places still open.
        {IPL_PURSE.released} players were released, {IPL_PURSE.releasedOverseas} of them overseas. A star is an overseas player. (T) was traded.
      </p>
      <div className="nv-ev-franchises">
        {IPL_RETAINED.map((t) => (
          <article key={t.short}>
            <h3><Link href={`${prefix}${teamPath("ipl-2027", t.team)}`}>{t.team}</Link> <small>{t.players.length}{t.purseLeftCr ? ` · ₹${t.purseLeftCr} cr left` : ""}</small></h3>
            <ul>
              {t.players.map((p) => (
                <li key={p.name}>{p.name}{p.overseas ? " *" : ""}{p.traded ? " (T)" : ""}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="nv-ev-fine">Purse left is shown only where the advisory stated it in the body of the release. Salary rows that did not line up in the source table are left on the official PDF.</p>
    </section>
  );
}
