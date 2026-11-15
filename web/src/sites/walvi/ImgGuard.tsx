"use client";

import { useEffect } from "react";

/** Removes article images that fail to load (dead relative paths, expired AI
 *  renders) together with their <figure>, so no empty gap is left behind. */
export default function ImgGuard({ scope }: { scope: string }) {
  useEffect(() => {
    const root = document.querySelector(scope);
    if (!root) return;
    const drop = (img: HTMLImageElement) => {
      const box = img.closest("figure") || img.closest("picture") || img;
      box.remove();
    };
    const imgs = Array.from(root.querySelectorAll("img"));
    const off: (() => void)[] = [];
    for (const img of imgs) {
      if (img.complete && img.naturalWidth === 0 && img.loading !== "lazy" && img.currentSrc) drop(img);
      else {
        const h = () => drop(img);
        img.addEventListener("error", h, { once: true });
        off.push(() => img.removeEventListener("error", h));
      }
    }
    return () => off.forEach((f) => f());
  }, [scope]);
  return null;
}
