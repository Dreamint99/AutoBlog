"use client";

import { useEffect, useState } from "react";

/* "Get the NinetyMins app" promos → the Play Store listing.
   - AppTopBar: mobile sticky bottom bar, after scroll or 20s, at most once per 7 days,
     never on the first screen of the first visit. Android-only app (hidden on iOS).
   - AppBanner: static strip for the footer and inside articles (no JS, no layout shift).
   - AppPopup: kept as a no-op so existing imports compile; the old sheet stacked with
     the top bar and the Adsterra popunder. */

const PLAY = "https://play.google.com/store/apps/details?id=com.ninetymins.app";
export const playUrl = (medium: string) =>
  `${PLAY}&referrer=${encodeURIComponent(`utm_source=ninetymins.com&utm_medium=${medium}&utm_campaign=web_to_app`)}`;

function track(placement: string, store = "play") {
  try {
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.("event", "app_download_click", { placement, store });
  } catch {
    /* gtag may be delayed */
  }
}

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

const linkProps = (medium: string) => ({
  href: playUrl(medium),
  target: "_blank" as const,
  rel: "noopener",
  "data-google-vignette": "false",
  onClick: () => track(medium),
});

export function AppBanner({ variant, medium }: { variant: "footer" | "article"; medium: string }) {
  return (
    <a className={`nm-appban nm-appban-${variant}`} {...linkProps(medium)}>
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

const BAR_CLOSED = "nm-appbar-closed";
const BAR_SEEN = "nm-appbar-seen";

export function AppTopBar() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
    if (window.matchMedia && !window.matchMedia("(max-width: 900px)").matches) return;
    const until = Number(store(BAR_CLOSED) || 0);
    if (until > Date.now()) return;
    const first = !store(BAR_SEEN);
    const pastFold = () => scrollY > Math.min(innerHeight * 0.6, 400);
    let shown = false;
    const show = () => {
      if (shown) return;
      if (first && !pastFold()) return;
      shown = true;
      store(BAR_SEEN, "1");
      setOpen(true);
    };
    const onScroll = () => {
      if (pastFold()) show();
    };
    addEventListener("scroll", onScroll, { passive: true });
    const t = setTimeout(() => {
      if (!first || pastFold()) show();
    }, 20000);
    return () => {
      clearTimeout(t);
      removeEventListener("scroll", onScroll);
    };
  }, []);
  if (!open) return null;
  const close = () => {
    store(BAR_CLOSED, String(Date.now() + 7 * 864e5));
    setOpen(false);
  };
  return (
    <div className="nm-appbar nm-appbar-dock" role="region" aria-label="NinetyMins app">
      <button className="nm-appbar-x" onPointerUp={close} onClick={close} aria-label="Close">
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/ninetymins-app-icon.webp" alt="" width={36} height={36} />
      <span className="nm-appbar-txt">
        <b>Live scores in the app</b>
        <small>Goal alerts &amp; SAFF — free</small>
      </span>
      <a className="nm-appbar-btn" {...linkProps("sticky_bar")}>
        Get the app
      </a>
    </div>
  );
}

/** @deprecated Full-sheet popup removed; bottom bar covers this. */
export function AppPopup() {
  return null;
}
