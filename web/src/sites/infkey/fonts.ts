// InfKey type pairing (v2): Inter Tight for headlines/figures, Inter for UI + body.
// Space Grotesk is kept ONLY for the "infkey.com" wordmark (the brand logo).
// next/font self-hosts all three with size-adjusted fallbacks (no CLS).
import { Inter_Tight, Inter, Space_Grotesk } from "next/font/google";

const display = Inter_Tight({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--ik-display", display: "swap" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--ik-body", display: "swap" });
const logo = Space_Grotesk({ subsets: ["latin"], weight: ["700"], variable: "--ik-logo", display: "swap" });

/** Kept as `aiFont.variable` so every existing caller keeps working. */
export const aiFont = { variable: `${display.variable} ${body.variable} ${logo.variable}` };
