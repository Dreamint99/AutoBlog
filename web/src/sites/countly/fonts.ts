// Type pairing for Countly, loaded via next/font (self-hosted, size-adjusted fallbacks → no CLS).
// Inter Tight — a tight grotesk for headlines, figures and the wordmark.
// Inter — body, UI and tabular figures.
// Both are variable fonts; exposed as CSS variables consumed by theme.css / v2.css.
// (The variable name --font-display is kept so every existing rule picks up the new face.)
import { Inter_Tight, Inter } from "next/font/google";

export const display = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** Combined className to put the font CSS variables in scope. */
export const fontVars = `${display.variable} ${sans.variable}`;
