import "server-only";

/* ── Affiliate / partner configuration ───────────────────────────────────────
 *
 * Phase 5 (flight search and remittance comparison) needs partner credentials
 * that this repository does not have, so the pages are NOT built or published.
 * Publishing a comparison page without a live price feed would mean inventing
 * prices — the one thing this site does not do.
 *
 * What exists instead: the config below, and the page template in
 * AffiliatePanel.tsx, so the reviewer can light this up in one edit once the
 * accounts exist. Nothing here is a secret and nothing is read at build time.
 *
 * To enable, set the values in the Worker (wrangler secret / var), flip
 * ENABLED to true, add the routes, and make the partner client return typed
 * offers. Until then /flights and /remittance must stay 404.
 */

export type PartnerStatus = {
  /** Flip to true only when the credential below is present AND the API returns live prices. */
  enabled: boolean;
  /** Public marker/affiliate id — NOT a secret. Empty string = not configured. */
  marker: string;
  /** Name of the environment variable that holds the credential, for the reviewer. */
  envVar: string;
  note: string;
};

export const AFFILIATE: Record<"travelpayouts" | "wise" | "remitly", PartnerStatus> = {
  travelpayouts: {
    enabled: false,
    marker: "",
    envVar: "TRAVELPAYOUTS_MARKER",
    note: "Flight search prices come from the Travelpayouts Aviasales data API. Needs an affiliate marker and a token; neither is in this repo. No airline or OTA site may be scraped instead.",
  },
  wise: {
    enabled: false,
    marker: "",
    envVar: "WISE_AFFILIATE_ID",
    note: "Wise publishes a comparison widget and an affiliate id. The fee/rate data must come from their API, not from a screenshot of their calculator.",
  },
  remitly: {
    enabled: false,
    marker: "",
    envVar: "REMITLY_AFFILIATE_ID",
    note: "Remitly's affiliate programme is application-based. Without it there is no licensed source for a 'cheapest remittance' claim.",
  },
};

export const ANY_PARTNER_ENABLED = Object.values(AFFILIATE).some((p) => p.enabled);

/** Placeholder used by the template so the reviewer sees exactly where the feed
 *  plugs in. Throws if called before a partner is enabled, so a page can never
 *  ship with a fabricated price. */
export function requirePartner(key: keyof typeof AFFILIATE): PartnerStatus {
  const p = AFFILIATE[key];
  if (!p.enabled || !p.marker) {
    throw new Error(`${key} is not configured: set ${p.envVar} and enable it in hub/affiliate.ts`);
  }
  return p;
}
