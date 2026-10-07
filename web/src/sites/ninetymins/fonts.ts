// Sports-desk type pairing for NinetyMins, self-hosted via next/font (no CLS).
// Barlow Condensed — tall, tight, broadcast-style headlines and scoreboard labels.
// Inter — body copy, UI and tabular figures.
import { Barlow_Condensed, Inter } from "next/font/google";

export const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--nm-display",
  display: "swap",
});

export const sans = Inter({
  subsets: ["latin"],
  variable: "--nm-sans",
  display: "swap",
});

export const fontVars = `${display.variable} ${sans.variable}`;
