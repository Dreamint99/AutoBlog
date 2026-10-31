"use client";

import { useEffect, useState } from "react";

/* "Get the NinetyMins app" promos → the Play Store listing.
   - AppPopup: small bottom sheet, after 12 s or half a page of scrolling, at most once a day,
     never again once closed (or tapped). Not shown on iPhone/iPad (Android-only app).
   - AppBanner: static strip for the footer and inside articles (no JS, no layout shift). */

const PLAY = "https://play.google.com/store/apps/details?id=com.ninetymins.app";
export const playUrl = (medium: string) => `${PLAY}&referrer=${encodeURIComponent(`utm_source=ninetymins.com&utm_medium=${medium}`)}`;

const CLOSED = "nm-app-closed";
const SEEN = "nm-app-seen";

function store(k: string, v?: string): string | null {
  try {
    if (v !== undefined) localStorage.setItem(k, v);
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M4.2 2.4c-.3.3-.4.7-.4 1.3v16.6c0 .6.1 1 .4 1.3l9.3-9.6zm10.7 8.2 2.8-2.9L6 1.3c-.4-.2-.8-.3-1.1-.2zm0 2.8L4.9 22.9c.3.1.7 0 1.1-.2l11.7-6.4zm4.2-4.9-3.2-1.8-3 3.1 3 3.1 3.2-1.8c.9-.5.9-2.1 0-2.6z" />
    </svg>
  );
}

export function AppBanner({ variant, medium }: { variant: "footer" | "article"; medium: string }) {
  return (
    <a className={`nm-appban nm-appban-${variant}`} href={playUrl(medium)} target="_blank" rel="noopener">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/ninetymins-app-icon.webp" alt="" width={48} height={48} loading="lazy" />
      <span className="nm-appban-txt">
        <b>Get the NinetyMins app</b>
        <small>Live scores, SAFF &amp; instant goal alerts — free</small>
      </span>
      <span className="nm-appban-btn">
        <PlayIcon /> Google Play
      </span>
    </a>
  );
}

export function AppPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
    if (store(CLOSED)) return;
    const today = new Date().toISOString().slice(0, 10);
    if (store(SEEN) === today) return;
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      store(SEEN, today);
      setOpen(true);
      cleanup();
    };
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      if (h > 0 && scrollY / h > 0.5) show();
    };
    const t = setTimeout(show, 12000);
    addEventListener("scroll", onScroll, { passive: true });
    const cleanup = () => {
      clearTimeout(t);
      removeEventListener("scroll", onScroll);
    };
    return cleanup;
  }, []);

  if (!open) return null;
  const close = () => {
    store(CLOSED, "1");
    setOpen(false);
  };
  return (
    <div className="nm-apppop" role="dialog" aria-label="Get the NinetyMins app">
      <button className="nm-apppop-x" onClick={close} aria-label="Close">
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/ninetymins-app-icon.webp" alt="" width={56} height={56} />
      <div className="nm-apppop-txt">
        <b>NinetyMins app</b>
        <span>Live scores, SAFF Championship &amp; goal alerts on your phone.</span>
      </div>
      <a className="nm-apppop-btn" href={playUrl("popup")} target="_blank" rel="noopener" onClick={close}>
        <PlayIcon /> Get it free
      </a>
    </div>
  );
}
