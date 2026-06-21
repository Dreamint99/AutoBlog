import { getSites } from "./data";
import type { Site } from "./types";

/** The site this deployment is pinned to (SITE_ID env), or null for multi-site/local. */
export function activeSiteId(): string | null {
  return process.env.SITE_ID || null;
}

/** Resolve the active site for root-level routes (sitemap, robots). Falls back to the first site. */
export function activeSite(): Site {
  const sites = getSites();
  const id = activeSiteId();
  return (id ? sites.find((s) => s.id === id) : undefined) ?? sites[0];
}
