"use client";
// Home "Live now": the same official YouTube feed as /live-tv (feed.ninetymins.com/v1/tv.json).
// The Worker often cannot read that host during SSR, so the browser refreshes it too.
import { useEffect, useState } from "react";
import Link from "next/link";
import { TV_FEED, cleanStreamTitle, liveYoutube, youtubeWatchUrl, type TvFeed, type TvStream } from "./tv";

const SHOW = 4;

function thumbOf(s: TvStream): string {
  return (s.thumb || `https://i.ytimg.com/vi/${s.id}/mqdefault.jpg`).replace("maxresdefault", "mqdefault");
}

export default function HomeLive({ initial, liveHref }: { initial: TvFeed | null; liveHref: string }) {
  const [feed, setFeed] = useState<TvFeed | null>(initial);
  const [ready, setReady] = useState(initial != null);

  useEffect(() => {
    let stop = false;
    const load = () =>
      fetch(TV_FEED, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: TvFeed | null) => {
          if (!stop && j && Array.isArray(j.live)) setFeed(j);
        })
        .catch(() => {})
        .finally(() => {
          if (!stop) setReady(true);
        });
    load();
    const t = setInterval(load, 60_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  const all = liveYoutube(feed);
  const shown = all.slice(0, SHOW);

  return (
    <div className="nv-live-now">
      <div className="nv-subhead">
        <h3 id="nv-now">
          Live now
          {all.length ? <span className="nv-live-n"> · {all.length}</span> : null}
        </h3>
        <Link href={liveHref}>All live TV →</Link>
      </div>
      {shown.length ? (
        <>
          <div className="hl-grid">
            {shown.map((s) => {
              const href = youtubeWatchUrl(s);
              if (!href) return null;
              const title = cleanStreamTitle(s.title) || s.channel || "Live stream";
              return (
                <article className="hl-card" key={s.id}>
                  <a className="hl-thumb" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${title} — watch live on YouTube`}>
                    <img src={thumbOf(s)} alt="" loading="lazy" decoding="async" />
                    <span className="hl-livetag">● LIVE</span>
                  </a>
                  <div className="hl-body">
                    <span className="hl-sport">{s.sport}</span>
                    <h4>
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {title}
                      </a>
                    </h4>
                    <span className="hl-meta">
                      {s.channel}
                      {s.viewers ? ` · ${s.viewers.toLocaleString("en")} watching` : ""}
                      {" · YouTube"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="hl-note">Official YouTube streams from leagues, boards and broadcasters. Some are limited to certain countries.</p>
        </>
      ) : ready ? (
        <p className="hl-lede nv-live-empty">
          No official YouTube stream is live right now. <Link href={liveHref}>See what is coming up on Live TV</Link>.
        </p>
      ) : (
        <p className="hl-lede">Checking official live streams…</p>
      )}
    </div>
  );
}
