// Premium type pairing for Countly, loaded via next/font (self-hosted, no CLS).
// Fraunces — an expressive editorial serif for display headlines & the wordmark.
// Inter — a clean grotesk for body, UI and tabular figures.
// Both are variable fonts; exposed as CSS variables consumed by theme.css.
import { Fraunces, Inter } from "next/font/google";

export const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  display: "swap",
});

export const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** Combined className to put the font CSS variables in scope. */
export const fontVars = `${display.variable} ${sans.variable}`;
