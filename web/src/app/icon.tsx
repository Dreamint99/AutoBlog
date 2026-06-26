import { ImageResponse } from "next/og";
import { activeSite } from "../lib/site-context";

// Per-site favicon, generated at build/runtime from the deployment's SITE_ID.
// One file → every site in the network gets its own branded icon (theme colour
// + the site name's initial). Next.js auto-injects the <link rel="icon"> for it.
// Generate per request so the icon uses the deployment's runtime SITE_ID
// (these projects pass SITE_ID via `vercel deploy -e`, not stored project env).
export const dynamic = "force-dynamic";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Brand colour per theme (background / letter).
const COLORS: Record<string, { bg: string; fg: string }> = {
  "trust-blue": { bg: "#1d4ed8", fg: "#ffffff" }, // VisaExpert
  "tech-dark": { bg: "#0ea5e9", fg: "#04121f" }, // AINews
  "bd-green": { bg: "#047857", fg: "#ffffff" }, // BangladeshExpert
  "qatar-maroon": { bg: "#7a1e3a", fg: "#ffffff" }, // QatarExperts
  "infkey-noir": { bg: "#7c3aed", fg: "#ffffff" }, // InfKey
  "walvi-atlas": { bg: "#0d9488", fg: "#ffffff" }, // Walvi
  "countly-data": { bg: "#4f46e5", fg: "#ffffff" }, // Countly
};

export default function Icon() {
  const site = activeSite();
  const c = COLORS[site.theme] ?? { bg: "#111827", fg: "#ffffff" };
  const letter = (site.name || "A").trim().charAt(0).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: c.bg,
          color: c.fg,
          fontSize: 44,
          fontWeight: 700,
          borderRadius: 14,
        }}
      >
        {letter}
      </div>
    ),
    { ...size }
  );
}
