"use client";
// "Where to watch" for one fixture: TV names + the paired official stream from /v1/today (browser fetch;
// the site Worker can't reliably read feed.ninetymins.com during SSR).
import { useEffect, useState } from "react";
import { YouTube } from "./Video";

type Watch = { tv: string[]; stream?: { id: string; kind: string; url?: string; channel: string; title?: string } };

export default function WatchBox({ sport, id, title, state }: { sport: string; id: string; title: string; state: string }) {
  const [w, setW] = useState<Watch | null>(null);
  useEffect(() => {
    fetch("https://feed.ninetymins.com/v1/today.json")
      .then((r) => r.json())
      .then((j: { items: { id: string; sport: string; watch: Watch }[] }) => setW(j.items.find((x) => x.id === id && x.sport === sport)?.watch || null))
      .catch(() => {});
  }, [sport, id]);
  const s = w?.stream;
  const yt = s?.kind === "youtube" && /^[\w-]{11}$/.test(s.id) ? s.id : null;
  const url = yt ? `https://www.youtube.com/watch?v=${yt}` : s?.url?.startsWith("https://") ? s.url : null;
  if (!w || (!w.tv.length && !url)) return null;
  return (
    <section className="mx-box mx-wide">
      <h2 className="mx-h">Where to watch</h2>
      {yt && state !== "post" ? <YouTube id={yt} title={s?.title || `${title} live`} live={state === "in"} /> : null}
      {url ? (
        <p>
          Official free stream:{" "}
          <a href={url} rel="noopener" target="_blank">
            {s?.channel}
          </a>{" "}
          (the rights holder may limit some regions).
        </p>
      ) : null}
      {w.tv.length ? <p>TV: {w.tv.join(", ")}. Rights vary by country — check your local broadcaster.</p> : null}
    </section>
  );
}
