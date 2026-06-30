import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Ahrefs Web Analytics — key is per-property, so only load it on the site it
// belongs to (countly) to avoid mixing data across the network.
const AHREFS_KEYS: Record<string, string> = {
  countly: "zC07+zoO7RVGL92RRb6zdg",
};
const ahrefsKey = AHREFS_KEYS[process.env.SITE_ID || ""] || "";

// Search-engine site verification, per-deployment via env (set on Vercel).
//   GOOGLE_SITE_VERIFICATION  → <meta name="google-site-verification">
//   YANDEX_VERIFICATION       → <meta name="yandex-verification">
//   BING_SITE_VERIFICATION    → <meta name="msvalidate.01">  (Bing)
const verification: Metadata["verification"] = {
  google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  yandex: process.env.YANDEX_VERIFICATION || undefined,
  other: process.env.BING_SITE_VERIFICATION
    ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
    : {},
};

export const metadata: Metadata = {
  title: { template: "%s", default: "AutoBlog" },
  description: "AutoBlog network",
  robots: { index: true, follow: true },
  verification,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
        {ahrefsKey ? (
          <Script
            src="https://analytics.ahrefs.com/analytics.js"
            data-key={ahrefsKey}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
