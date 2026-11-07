"use client";

import { useEffect, useRef, useState } from "react";

/** Number that counts up from 0 when it scrolls into view.
 *  The final value is server-rendered (crawlers saw "0" before, and the 0→199 width
 *  change shifted the hero: CLS 0.2) and the box keeps the final width throughout. */
export function CountUp({ to, duration = 1200 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(to);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen at load: no count (it would only flicker the first paint).
    if (el.getBoundingClientRect().top < innerHeight) return;
    let raf = 0;
    const run = () => {
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        run();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return (
    <span
      ref={ref}
      style={{ display: "inline-block", minWidth: `${String(to).length}ch`, fontVariantNumeric: "tabular-nums" }}
    >
      {v}
    </span>
  );
}

/** Adds .is-in to children with [data-reveal] once visible (bars grow, rows fade in). */
export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target as HTMLElement).classList.add("is-in")),
      { rootMargin: "0px 0px -8% 0px" },
    );
    el.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
