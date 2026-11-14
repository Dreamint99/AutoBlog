// Same type system as the NinetyMins app ("Matchday Poster"), self-hosted via next/font (no CLS).
// Anton — tall poster type for headlines, scores and labels (single weight: never fake-bold it).
// Inter — body copy, UI and tabular figures.
import { Anton, Inter } from "next/font/google";

export const display = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--nm-display",
  display: "swap",
});

export const sans = Inter({
  subsets: ["latin"],
  variable: "--nm-sans",
  display: "swap",
});

export const fontVars = `${display.variable} ${sans.variable}`;
