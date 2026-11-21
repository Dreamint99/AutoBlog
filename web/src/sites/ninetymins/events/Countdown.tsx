"use client";

import { useEffect, useState } from "react";
import { countdown } from "./zones";

/** Kick-off countdown. The first paint is static so the server render has no clock. */
export function KickCountdown({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = now == null ? null : countdown(iso, now);
  if (!left) return <p className="nv-face-count">{now == null ? "Kick-off" : "Under way"}</p>;
  return (
    <p className="nv-ev-count nv-face-count" role="timer" aria-label={`${left.d} days ${left.h} hours ${left.m} minutes`}>
      <span><b>{left.d}</b>d</span>
      <span><b>{String(left.h).padStart(2, "0")}</b>h</span>
      <span><b>{String(left.m).padStart(2, "0")}</b>m</span>
      <span><b>{String(left.s).padStart(2, "0")}</b>s</span>
    </p>
  );
}
