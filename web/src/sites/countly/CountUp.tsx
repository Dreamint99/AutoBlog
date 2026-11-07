"use client";
/**
 * A number that counts up from 0 the first time it scrolls into view.
 * The final value is server-rendered (crawlers and no-JS readers see it), the
 * width never changes (tabular figures), and reduced-motion users get no animation.
 */
import { useEffect, useRef } from "react";

export default function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const dur = 1100;
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          el.textContent = fmt(value * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return <b ref={ref}>{value.toLocaleString("en-US")}</b>;
}
