// VisaPoint type (2026-11 clean redesign): Inter Tight for headings and figures,
// Inter for body/UI. The variable names stay --vp-display / --vp-body so every
// older stylesheet that reads them picks the new faces up.
import { Inter_Tight, Inter } from "next/font/google";

export const display = Inter_Tight({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--vp-display",
  display: "swap",
});

export const body = Inter({ subsets: ["latin"], variable: "--vp-body", display: "swap" });

/** Page-root class for every VisaPoint page: `vx` switches on the v2 design layer (v2.css). */
export const fontVars = `vp-root vx ${display.variable} ${body.variable}`;
