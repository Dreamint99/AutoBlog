import type { Site } from "./types";

/** Custom domain → site id. Fill in as you connect real domains on Vercel. */
export const DOMAIN_TO_SITE: Record<string, string> = {
  "visaexpert.com": "visaexpert",
  "www.visaexpert.com": "visaexpert",
  "ainews.com": "ainews",
  "www.ainews.com": "ainews",
  "bangladeshexpert.com": "bangladeshexpert",
  "www.bangladeshexpert.com": "bangladeshexpert",
  "qatarexperts.com": "qatarexperts",
  "www.qatarexperts.com": "qatarexperts",
  "infkey.com": "infkey",
  "www.infkey.com": "infkey",
  "countly.net": "countly",
  "www.countly.net": "countly",
  "walvi.io": "walvi",
  "www.walvi.io": "walvi",
};

/**
 * Public base URL for canonical tags, Open Graph, and the sitemap.
 * Priority: explicit SITE_URL env → Vercel's production URL → the site's configured domain.
 */
export function siteBaseUrl(site: Site): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return `https://${site.domain}`;
}
