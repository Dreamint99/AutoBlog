// VisaPoint type: Source Serif 4 (institutional headings, ministry/embassy register)
// + Public Sans (body/UI — designed for government services, very legible).
import { Source_Serif_4, Public_Sans } from "next/font/google";

export const display = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--vp-display",
  display: "swap",
});

export const body = Public_Sans({ subsets: ["latin"], variable: "--vp-body", display: "swap" });

export const fontVars = `vp-root ${display.variable} ${body.variable}`;
