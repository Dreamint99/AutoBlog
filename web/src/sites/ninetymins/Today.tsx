"use client";

import { useEffect, useMemo, useState } from "react";

/* Today — every match in every sport on the visitor's own calendar day, in their own time:
   live first (tap → our live match centre), then a timeline of kick-offs, then results.
   Data: nm-api /v1/today (the same feed the Android app's Today screen reads), refreshed every
   30 s. Times render after mount so they use the visitor's time zone, not the server's. */

export const TODAY_API = "https://api.ninetymins.com/v1/today";

type Side = { id: string; name: string; short: string; abbr: string; score: string; winner: boolean };
type Stream = { id: string; kind: string; url?: string; channel: string; live: boolean };
export type TodayItem = {
  id: string;
  sport: string;
  league: string;
  leagueName: string;
  state: "pre" | "in" | "post";
  detail: string;
  clock: string;
  date: string;
  tag: string;
  venue: string;
  home: Side;
  away: Side;
  watch: { stream?: Stream; tv: string[]; guide?: { title: string; url: string } };
};
export type TodayFeed = { t: number; items: TodayItem[] };

const SPORT: Record<string, [string, string]> = {
  football: ["⚽", "Football"],
  cricket: ["🏏", "Cricket"],
  basketball: ["🏀", "Basketball"],
  tennis: ["🎾", "Tennis"],
  mma: ["🥊", "UFC"],
  nfl: ["🏈", "NFL"],
  hockey: ["🏒", "Hockey"],
  baseball: ["⚾", "Baseball"],
};
const BIG = ["afc.saff.championship", "eng.1", "uefa.champions", "esp.1", "ita.1", "ger.1", "fra.1"];
const weight = (e: TodayItem) =>
  e.league === "afc.saff.championship" || e.home.name === "Bangladesh" || e.away.name === "Bangladesh" ? 0 : BIG.includes(e.league) ? 1 + BIG.indexOf(e.league) : 20;

const FOOTBALL = [
  { title: "FIFA+ — free live football (varies by country)", url: "https://www.fifa.com/en" },
  { title: "BTV — Bangladesh matches when on air", url: "https://www.btvlive.gov.bd/" },
];
const CRICKET = [
  { title: "ICC.tv — free where available", url: "https://www.icc-cricket.com/icc-tv" },
  { title: "BTV — Bangladesh matches when on air", url: "https://www.btvlive.gov.bd/" },
];

const slug = (x: string) => x.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** Our live match centre (football has full pages; other sports go to the live scores hub). */
const matchHref = (e: TodayItem) =>
  e.sport === "football" && /^\d+$/.test(e.id) ? `/match/${e.league.replace(/\./g, "-")}/${e.id}-${`${slug(e.home.name)}-vs-${slug(e.away.name)}`.slice(0, 80)}` : "/scores";
const streamUrl = (s: Stream) => (s.kind === "youtube" ? `https://www.youtube.com/watch?v=${s.id}` : s.url || "");
const hhmm = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Share one match (Web Share sheet on phones → WhatsApp/Facebook/X…; copies the text elsewhere). */
async function shareMatch(e: TodayItem, now: Date | null): Promise<boolean> {
  const when = e.state === "in" ? `LIVE ${e.home.score}-${e.away.score}` : e.state === "post" ? `FT ${e.home.score}-${e.away.score}` : now ? `${hhmm(new Date(e.date))} (my time)` : "";
  const url = `https://ninetymins.com${matchHref(e) === "/scores" ? "/today" : matchHref(e)}`;
  const text = `${(SPORT[e.sport] || ["🏟️"])[0]} ${e.home.name} v ${e.away.name} · ${when} · ${e.leagueName}${e.venue ? ` · ${e.venue}` : ""}
Live score & where to watch on NinetyMins`;
  try {
    if (navigator.share) {
      await navigator.share({ title: `${e.home.name} v ${e.away.name}`, text, url });
      return false;
    }
    await navigator.clipboard.writeText(`${text}
${url}`);
    return true;
  } catch {
    return false;
  }
}

function until(d: Date, now: Date) {
  const m = Math.round((d.getTime() - now.getTime()) / 60_000);
  if (m <= 0) return "SOON";
  if (m < 60) return `IN ${m}M`;
  return `IN ${Math.floor(m / 60)}H`;
}

export default function Today({ initial }: { initial: TodayFeed | null }) {
  const [feed, setFeed] = useState<TodayFeed | null>(initial);
  const [now, setNow] = useState<Date | null>(null);
  const [sport, setSport] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date());
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch(TODAY_API, { cache: "no-store" });
        if (r.ok && !stop) setFeed((await r.json()) as TodayFeed);
      } catch {}
      if (!stop) setNow(new Date()); // also rolls over to the new day at midnight
    };
    const t = setInterval(load, 30_000);
    load();
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  const day = useMemo(() => (feed?.items || []).filter((e) => e.state === "in" || (now ? sameDay(new Date(e.date), now) : true)), [feed, now]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of day) c[e.sport] = (c[e.sport] || 0) + 1;
    return c;
  }, [day]);
  const shown = sport === "all" ? day : day.filter((e) => e.sport === sport);
  const live = shown.filter((e) => e.state === "in").sort((a, b) => weight(a) - weight(b));
  const next = shown.filter((e) => e.state === "pre").sort((a, b) => a.date.localeCompare(b.date) || weight(a) - weight(b));
  const done = shown.filter((e) => e.state === "post").sort((a, b) => b.date.localeCompare(a.date));
  const liveN = day.filter((e) => e.state === "in").length;
  const off = now ? -now.getTimezoneOffset() : 0;
  const gmt = `GMT${off < 0 ? "−" : "+"}${Math.floor(Math.abs(off) / 60)}${Math.abs(off) % 60 ? `:${String(Math.abs(off) % 60).padStart(2, "0")}` : ""}`;

  const card = (e: TodayItem) => {
    const d = new Date(e.date);
    const emoji = (SPORT[e.sport] || ["🏟️"])[0];
    const s = e.watch.stream;
    const key = `${e.sport}:${e.id}`;
    const ways = e.sport === "football" ? FOOTBALL : e.sport === "cricket" ? CRICKET : [];
    return (
      <article className={`nm-td-card nm-td-${e.state}`} key={key}>
        <a className="nm-td-rail" href={matchHref(e)} aria-label={`${e.home.name} v ${e.away.name}`}>
          {e.state === "in" ? (
            <>
              <small>LIVE</small>
              <b>{e.sport === "football" && e.clock && e.clock !== "0'" ? e.clock : "NOW"}</b>
            </>
          ) : e.state === "post" ? (
            <>
              <small>{now ? hhmm(d) : ""}</small>
              <b>FT</b>
            </>
          ) : (
            <>
              <b>{now ? hhmm(d) : "··:··"}</b>
              <small>{now ? until(d, now) : ""}</small>
            </>
          )}
        </a>
        <div className="nm-td-body">
          <a className="nm-td-main" href={matchHref(e)}>
            <span className="nm-td-lg">
              {emoji} {e.leagueName}
              {e.tag && e.tag.length < 14 ? ` · ${e.tag}` : ""}
              {e.state === "in" ? <i className="nm-td-live">LIVE</i> : null}
            </span>
            {[e.home, e.away].map((t, i) => (
              <span className={`nm-td-team${e.state === "post" && (e.home.winner || e.away.winner) && !t.winner ? " lost" : ""}`} key={i}>
                <span>{t.name}</span>
                {e.state !== "pre" && t.score ? <b>{t.score}</b> : null}
              </span>
            ))}
            {e.state === "in" && e.detail && e.sport !== "football" ? <span className="nm-td-detail">{e.detail}</span> : null}
            {e.venue ? <span className="nm-td-venue">📍 {e.venue}</span> : null}
          </a>
          {e.state !== "post" ? (
            <div className="nm-td-watch">
              {s ? (
                <a className="nm-td-btn nm-td-free" href={streamUrl(s)} target="_blank" rel="noopener">
                  ▶ {s.live ? "Watch live free" : "Free stream"} <small>{s.channel}</small>
                </a>
              ) : null}
              <button className="nm-td-btn" onClick={() => setOpen(open === key ? null : key)} aria-expanded={open === key}>
                📺 Where to watch
              </button>
              <a className="nm-td-btn" href={matchHref(e)}>
                ⚡ Live score
              </a>
            </div>
          ) : null}
          <button
            className="nm-td-share"
            aria-label={`Share ${e.home.name} v ${e.away.name}`}
            onClick={async () => {
              if (await shareMatch(e, now)) {
                setCopied(key);
                setTimeout(() => setCopied(null), 2000);
              }
            }}
          >
            {copied === key ? "✓ Copied" : "↗ Share"}
          </button>
          {open === key ? (
            <ul className="nm-td-ways">
              {s ? (
                <li>
                  <a href={streamUrl(s)} target="_blank" rel="noopener">
                    ▶ Free official stream — {s.channel}
                  </a>
                </li>
              ) : null}
              {e.watch.tv.length ? <li>📺 On TV: {e.watch.tv.join(" · ")}</li> : null}
              {e.watch.guide ? (
                <li>
                  <a href={e.watch.guide.url}>📰 {e.watch.guide.title}</a>
                </li>
              ) : null}
              {ways.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noopener">
                    ↗ {l.title}
                  </a>
                </li>
              ))}
              <li>
                <a href="https://play.google.com/store/apps/details?id=com.ninetymins.app" target="_blank" rel="noopener">
                  📱 Goal alerts for this match in the NinetyMins app
                </a>
              </li>
              <li className="nm-td-note">We only list official, free and legal sources. Availability depends on your country.</li>
            </ul>
          ) : null}
        </div>
      </article>
    );
  };

  const block = (title: string, l: TodayItem[], cls: string) =>
    l.length ? (
      <section className="nm-td-block">
        <h2 className={cls}>
          {cls === "live" ? <i className="nm-dot" /> : null}
          {title} <span>{l.length}</span>
        </h2>
        <div className="nm-td-list">{l.map(card)}</div>
      </section>
    ) : null;

  return (
    <div className="nm-td">
      <div className="nm-td-head">
        <div className="nm-td-stats">
          <b>{day.length}</b> matches
          {liveN ? (
            <>
              {" · "}
              <b className="hot">{liveN}</b> live
            </>
          ) : null}
          {" · "}
          <b>{Object.keys(counts).length}</b> sports
        </div>
        <div className="nm-td-tz">🕒 All times in your time{now ? ` · ${gmt}` : ""}</div>
      </div>
      <div className="nm-td-chips">
        <button className={sport === "all" ? "on" : ""} onClick={() => setSport("all")}>
          All <span>{day.length}</span>
        </button>
        {Object.keys(SPORT)
          .filter((s) => counts[s])
          .map((s) => (
            <button key={s} className={sport === s ? "on" : ""} onClick={() => setSport(s)}>
              {SPORT[s][0]} {SPORT[s][1]} <span>{counts[s]}</span>
            </button>
          ))}
      </div>
      {!feed ? <p className="nm-td-empty">Loading today’s matches…</p> : shown.length ? null : <p className="nm-td-empty">A quiet day — no matches left today.</p>}
      {block("Live now", live, "live")}
      {block("Coming up", next, "next")}
      {block("Finished", done, "done")}
    </div>
  );
}
