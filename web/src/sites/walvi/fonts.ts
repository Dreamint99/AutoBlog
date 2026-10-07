// VisaPoint type: Plus Jakarta Sans (headings, confident geometric) + Inter (body/UI).
import { Plus_Jakarta_Sans, Inter } from "next/font/google";

export const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--vp-display",
  display: "swap",
});

export const body = Inter({ subsets: ["latin"], variable: "--vp-body", display: "swap" });

export const fontVars = `vp-root ${display.variable} ${body.variable}`;
