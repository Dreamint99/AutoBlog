// NinetyMins type system (self-hosted via next/font, no CLS).
// Inter Tight — headlines and figures (v2, 2026-11-15). It owns --nm-display, so every older
//   rule that asks for `400 … var(--nm-display)` gets Inter Tight: only 700/800 faces are loaded,
//   so CSS font matching picks the 700 face for those requests (clean bold, never faux-bold).
// Anton — the app's poster face, kept for the "90" mark, the wordmark and big hero scores only (--nm-poster).
// Inter — body copy, UI and tabular figures.
import { Anton, Inter, Inter_Tight } from "next/font/google";

export const poster = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--nm-poster",
  display: "swap",
});

export const display = Inter_Tight({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--nm-display",
  display: "swap",
});

export const sans = Inter({
  subsets: ["latin"],
  variable: "--nm-sans",
  display: "swap",
});

export const fontVars = `${poster.variable} ${display.variable} ${sans.variable}`;
