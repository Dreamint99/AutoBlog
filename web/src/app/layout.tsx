import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";

// Ahrefs Web Analytics — key is per-property, so only load it on the site it
// belongs to (countly) to avoid mixing data across the network.
const AHREFS_KEYS: Record<string, string> = {
  countly: "zC07+zoO7RVGL92RRb6zdg",
  walvi: "pR+KnDZlDBlS2qiWfQIfBg",
};
const ahrefsKey = AHREFS_KEYS[process.env.SITE_ID || ""] || "";

// Google Analytics 4 — per-property measurement ID, loaded only on its own site.
const GA4_IDS: Record<string, string> = {
  countly: "G-6RX4BLWGKH",
  walvi: "G-QM8RG2SLKK",
  infkey: "G-0G8JDFETNP",
};
const ga4Id = GA4_IDS[process.env.SITE_ID || ""] || "";

// Pulse realtime presence — anonymous per-tab beat every 25s to our own
// dashboard worker (no cookies, no PII; id lives in sessionStorage only).
const pulseSiteId = process.env.SITE_ID || "";
const PULSE_BEACON = `(function(){try{
var s='${pulseSiteId}';var k='_plsid';
var id=sessionStorage.getItem(k);
if(!id){id=(self.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);sessionStorage.setItem(k,id);}
function beat(){if(document.visibilityState==='hidden')return;
try{navigator.sendBeacon('https://pulse.countly.net/api/beat',JSON.stringify({id:id,site:s,path:location.pathname}));}catch(e){}}
beat();setInterval(beat,25000);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')beat();});
}catch(e){}})();`;

// Adsterra ads — per-site ad-unit codes (Native Banner + Social Bar), keyed by
// SITE_ID so the shared bundle serves the right units per worker. A site with
// no entry gets no ad scripts. Native Banner = invoke.js + a container div;
// Social Bar = a single floating script (no placement needed).
type AdsterraUnits = { socialBar?: string; nativeInvoke?: string; nativeContainer?: string };
const ADSTERRA: Record<string, AdsterraUnits> = {
  countly: {
    socialBar: "https://pl30263461.effectivecpmnetwork.com/a5/a1/01/a5a10138c46d0ce013195ab1c038ee3d.js",
    nativeInvoke: "https://pl30263460.effectivecpmnetwork.com/07db29087a1a24463680898243b16f48/invoke.js",
    nativeContainer: "container-07db29087a1a24463680898243b16f48",
  },
  // walvi + infkey: pending — add their Native Banner + Social Bar codes here.
};
const ads = ADSTERRA[process.env.SITE_ID || ""] || {};

// Search-engine site verification, per-deployment via env (build-time).
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
        {/* Hide any image that fails to load (e.g. a dead legacy Supabase-Storage
            feature image) so the card shows its clean background instead of a
            broken-image icon + alt text. Capture-phase catches <img> load errors. */}
        <Script id="img-fallback" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html:
          `document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG'){t.style.visibility='hidden';}},true);` }} />
        {pulseSiteId ? (
          <Script
            id="pulse-beacon"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: PULSE_BEACON }}
          />
        ) : null}
        {ahrefsKey ? (
          <Script
            src="https://analytics.ahrefs.com/analytics.js"
            data-key={ahrefsKey}
            strategy="afterInteractive"
          />
        ) : null}
        {ga4Id ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga4-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');`,
              }}
            />
          </>
        ) : null}
        {ads.nativeContainer && ads.nativeInvoke ? (
          <>
            <div
              id={ads.nativeContainer}
              style={{ maxWidth: "100%", margin: "28px auto", textAlign: "center" }}
            />
            <Script src={ads.nativeInvoke} strategy="afterInteractive" data-cfasync="false" />
          </>
        ) : null}
        {ads.socialBar ? (
          <Script src={ads.socialBar} strategy="afterInteractive" />
        ) : null}
      </body>
    </html>
  );
}
