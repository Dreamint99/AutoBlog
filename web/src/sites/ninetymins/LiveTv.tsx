"use client";
// Official free live streams (league / board / broadcaster YouTube channels), from nm-api tv.ts.
import { useEffect, useState } from "react";
import { YouTube } from "./Video";
import { TV_FEED, type TvFeed, type TvStream } from "./tv";

export { TV_FEED, type TvFeed, type TvStream };

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });

export default function LiveTv({ initial }: { initial: TvFeed | null }) {
  const [feed, setFeed] = useState<TvFeed | null>(initial);
  const [sport, setSport] = useState("");
  const [play, setPlay] = useState<string | null>(initial?.live[0]?.id || null);
  useEffect(() => {
    const load = () => fetch(TV_FEED, { cache: "no-store" }).then((r) => r.json()).then((j: TvFeed) => { setFeed(j); setPlay((p) => p || j.live[0]?.id || null); }).catch(() => {});
    load(); // the site Worker can't always read the feed during SSR, so the browser fetches it too
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);
  const live = (feed?.live || []).filter((s) => s.kind === "youtube" && (!sport || s.sport === sport));
  const up = (feed?.upcoming || []).filter((s) => s.kind === "youtube" && (!sport || s.sport === sport));
  const sports = [...new Set([...(feed?.live || []), ...(feed?.upcoming || [])].map((s) => s.sport))];
  const cur = live.find((s) => s.id === play) || live[0];
  return (
    <div className="lv-page">
      <div className="nm-wrap">
        <div className="lv-top">
          <h1>
            Live TV <span>· official free streams</span>
          </h1>
        </div>
        <p className="hl-lede">Matches the leagues, boards and broadcasters stream free on their own YouTube channels — nothing else. Some streams are region-locked by the rights holder.</p>
        <nav className="lv-sports" aria-label="Sport">
          <button className={!sport ? "on" : ""} onClick={() => setSport("")}>All</button>
          {sports.map((s) => (
            <button key={s} className={s === sport ? "on" : ""} onClick={() => setSport(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </nav>
        {cur ? (
          <section className="tv-now" aria-label="Now playing">
            <YouTube key={cur.id} id={cur.id} title={cur.title} thumb={cur.thumb} live />
            <p className="hl-facts">
              <b>{cur.channel}</b> · {cur.title}
              {cur.viewers ? <> · {cur.viewers.toLocaleString()} watching</> : null}
            </p>
          </section>
        ) : (
          <p className="hl-lede">No official stream is live right now{sport ? ` for ${sport}` : ""}. Upcoming streams are below.</p>
        )}
        {live.length > 1 ? (
          <>
            <h2 className="hl-h2">Live now · {live.length}</h2>
            <div className="hl-grid">
              {live.map((s) => (
                <button key={s.id} className={`hl-card tv-pick${s.id === cur?.id ? " on" : ""}`} onClick={() => { setPlay(s.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  <span className="hl-thumb">
                    <img src={s.thumb || `https://i.ytimg.com/vi/${s.id}/mqdefault.jpg`} alt="" loading="lazy" />
                    <span className="hl-livetag">● LIVE</span>
                  </span>
                  <span className="hl-body">
                    <span className="hl-sport">{s.sport}</span>
                    <h3>{s.title}</h3>
                    <span className="hl-meta">{s.channel}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : null}
        {up.length ? (
          <>
            <h2 className="hl-h2">Coming up</h2>
            <ul className="tv-up">
              {up.map((s) => (
                <li key={s.id}>
                  <time dateTime={s.start}>{when(s.start)}</time>
                  <span>
                    <b>{s.title}</b>
                    <small>
                      {s.channel} · {s.sport}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}
