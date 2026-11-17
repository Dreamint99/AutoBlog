"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/* Header "More" menu: a plain <details> (works without JS) that also closes on
   route change, outside click and Escape. Links are server-rendered children. */
export function NavMore({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [path]);
  useEffect(() => {
    const close = (e: Event) => {
      const d = ref.current;
      if (!d || !d.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <details className="nv-more" ref={ref}>
      <summary>
        More
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="nv-more-panel">{children}</div>
    </details>
  );
}
