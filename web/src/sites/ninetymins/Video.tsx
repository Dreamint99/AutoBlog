"use client";
// Click-to-play YouTube (official channels only). The thumbnail paints first; the iframe loads on tap.
import { useState } from "react";

export function YouTube({ id, title, thumb, live = false, autoplay = false }: { id: string; title: string; thumb?: string; live?: boolean; autoplay?: boolean }) {
  const [on, setOn] = useState(autoplay);
  const src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  return (
    <div className="hl-player">
      {on ? (
        <iframe src={src} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      ) : (
        <button type="button" onClick={() => setOn(true)} aria-label={`Play: ${title}`}>
          <img src={thumb || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" decoding="async" />
          <span className="hl-play" aria-hidden="true">▶</span>
          {live ? <span className="hl-livetag">● LIVE</span> : null}
        </button>
      )}
    </div>
  );
}
