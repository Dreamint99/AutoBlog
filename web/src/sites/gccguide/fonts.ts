// GCCGuide type (v2): Inter Tight for headlines and figures, Inter for body text.
import { Inter, Inter_Tight } from "next/font/google";

export const gccSans = Inter({ subsets: ["latin"], variable: "--gv-sans", display: "swap" });
export const gccHead = Inter_Tight({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--gv-head-f", display: "swap" });
