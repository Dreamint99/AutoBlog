import { activeSite } from "@/lib/site-context";
import { siteBaseUrl } from "@/lib/sites.config";
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

// Adsterra ads — per-site ad-unit codes (Native Banner + Popunder), keyed by
// SITE_ID so the shared bundle serves the right units per worker. A site with
// no entry gets no ad scripts. Native Banner = invoke.js + a container div;
// Popunder = a single script (at most one per page view).
// Social Bar was dropped: it showed fake "New message" ads and earned ~$0.37 CPM
// against ~$20 for the Native Banner.
type AdsterraUnits = { popunder?: string; nativeInvoke?: string; nativeContainer?: string };
const AD = "https://pl";
const native = (pl: string, hash: string): AdsterraUnits => ({
  nativeInvoke: `${AD}${pl}.profitableratecpmnetwork.com/${hash}/invoke.js`,
  nativeContainer: `container-${hash}`,
});
const ADSTERRA: Record<string, AdsterraUnits> = {
  countly: {
    ...native("30263460", "07db29087a1a24463680898243b16f48"),
    popunder: `${AD}31806315.profitableratecpmnetwork.com/6c/61/43/6c6143c1e092621e9c70d616eba3065d.js`,
  },
  walvi: {
    ...native("31806356", "6e566cfcffc2647ea872900f34e52da7"),
    popunder: `${AD}31806355.profitableratecpmnetwork.com/f5/61/12/f561120d0a4e90d7dcf680bb0a17f5cc.js`,
  },
  infkey: {
    ...native("30263474", "a5e439aeab0d0572eb5b5eaf7647b3d1"),
    popunder: `${AD}31806329.profitableratecpmnetwork.com/ba/4a/5a/ba4a5a09b231a1c9c8990346cb484483.js`,
  },
  gccguide: {
    ...native("31806367", "763fb95224fd997ab27e65c7c588552b"),
    popunder: `${AD}31806366.profitableratecpmnetwork.com/a9/46/ce/a946ce3584f2b1fd39e1e27299a7a98d.js`,
  },
  ninetymins: {
    ...native("31806377", "246da2b154d653a03cf4403294c4f9a1"),
    popunder: `${AD}31806376.profitableratecpmnetwork.com/18/57/f6/1857f6edff93fa184b3f68d819315f3b.js`,
  },
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
  metadataBase: new URL(siteBaseUrl(activeSite())),
  title: { template: "%s", default: "AutoBlog" },
  description: "AutoBlog network",
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  verification,
  // Pages that set no openGraph of their own (about, contact, match centres…) still share with the site card.
  openGraph: process.env.SITE_ID ? { images: [{ url: `/og/${process.env.SITE_ID}.png`, width: 1200, height: 630 }] } : undefined,
  twitter: { card: "summary_large_image" },
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
        {ads.popunder ? (
          <Script src={ads.popunder} strategy="afterInteractive" />
        ) : null}
      </body>
    </html>
  );
}
