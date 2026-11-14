import { ImageResponse } from "next/og";
import { activeSite } from "../lib/site-context";
import { siteBaseUrl } from "../lib/sites.config";

// Sites with a real logo mark in /public/brand use it as the favicon.
const MARKS: Record<string, string> = {
  infkey: "/brand/infkey-mark-sq.png",
  ninetymins: "/brand/ninetymins-mark-90.png",
  countly: "/brand/countly-mark-sq.png",
  gccguide: "/brand/gccguide-mark.png",
  walvi: "/brand/visapoint-mark.png",
};

// Per-site favicon, generated at build/runtime from the deployment's SITE_ID.
// One file → every site in the network gets its own branded icon (theme colour
// + the site name's initial). Next.js auto-injects the <link rel="icon"> for it.
// Generate per request so the icon uses the deployment's runtime SITE_ID
// (these projects pass SITE_ID via `vercel deploy -e`, not stored project env).
export const dynamic = "force-dynamic";
// Google Search only shows favicons whose size is a multiple of 48px (48, 96, 192…);
// 64px was ignored and results showed a generic globe instead of the logo.
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

// Brand colour per theme (background / letter).
const COLORS: Record<string, { bg: string; fg: string }> = {
  "trust-blue": { bg: "#1d4ed8", fg: "#ffffff" }, // VisaExpert
  "tech-dark": { bg: "#0ea5e9", fg: "#04121f" }, // AINews
  "bd-green": { bg: "#047857", fg: "#ffffff" }, // BangladeshExpert
  "qatar-maroon": { bg: "#7a1e3a", fg: "#ffffff" }, // QatarExperts
  "infkey-noir": { bg: "#7c3aed", fg: "#ffffff" }, // InfKey
  "walvi-atlas": { bg: "#0b1f3a", fg: "#2dd4bf" }, // VisaPoint
  "countly-data": { bg: "#4f46e5", fg: "#ffffff" }, // Countly
};

export default async function Icon() {
  const site = activeSite();
  const c = COLORS[site.theme] ?? { bg: "#111827", fg: "#ffffff" };
  const letter = (site.name || "A").trim().charAt(0).toUpperCase();
  // NinetyMins: the app's "90" mark, drawn here (a Worker can't fetch its own zone's /brand file).
  if (site.id === "ninetymins") {
    // Anton = the app's poster font; fall back to the default font if Google Fonts is unreachable.
    const anton = await fetch("https://fonts.gstatic.com/s/anton/v27/1Ptgg87LROyAm0K0.ttf")
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0d0d", borderRadius: 42, position: "relative" }}>
          <div style={{ display: "flex", color: "#f4f1ea", fontSize: anton ? 124 : 112, fontWeight: anton ? 400 : 800, fontFamily: anton ? "Anton" : undefined, letterSpacing: anton ? -2 : -6, marginTop: -6 }}>90</div>
          <div style={{ position: "absolute", right: 18, top: 18, width: 24, height: 24, borderRadius: 12, background: "#c6ff3d" }} />
        </div>
      ),
      { ...size, ...(anton ? { fonts: [{ name: "Anton", data: anton, weight: 400 as const, style: "normal" as const }] } : {}) }
    );
  }
  const mark = MARKS[site.id];
  if (mark) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${siteBaseUrl(site)}${mark}`} width={192} height={192} alt="" />
        </div>
      ),
      { ...size }
    );
  }

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
          fontSize: 132,
          fontWeight: 700,
          borderRadius: 42,
        }}
      >
        {letter}
      </div>
    ),
    { ...size }
  );
}
