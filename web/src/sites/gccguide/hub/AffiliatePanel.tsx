import type { Site } from "@/lib/types";
import { AFFILIATE } from "./affiliate";
import { Callout, SectionHead, DataTable } from "./ui";

/* Template for the Phase 5 comparison pages — NOT mounted on any route.
 *
 * It renders an honest "not available yet" state listing exactly which partner
 * is missing, instead of a table of invented prices. When a partner is enabled,
 * replace the placeholder body with its live offers; the page shell, table and
 * affiliate disclosure below are already the right shape.
 *
 * Mount it at /flights and /remittance only after affiliate.ts says enabled.
 */

export type OfferRow = {
  provider: string;
  /** what the reader pays / receives — must come from the partner API */
  amount: string;
  fee: string;
  /** deeplink carrying the affiliate marker */
  url: string;
};

export default function AffiliatePanel({
  site,
  kind,
  offers,
}: {
  site: Site;
  kind: "flights" | "remittance";
  offers?: OfferRow[];
}) {
  const partners = kind === "flights" ? [AFFILIATE.travelpayouts] : [AFFILIATE.wise, AFFILIATE.remitly];
  const enabled = partners.filter((p) => p.enabled);

  return (
    <section>
      <SectionHead
        title={kind === "flights" ? "Cheapest flights from the Gulf" : "Compare sending money home"}
        dek={kind === "flights" ? "Live fares for a Gulf city pair, with the affiliate disclosure shown." : "Live transfer fees and rates for a Gulf → home-country corridor."}
      />

      {enabled.length === 0 || !offers?.length ? (
        <Callout tone="warn" title="This comparison is not live yet">
          <p style={{ margin: 0 }}>
            {kind === "flights"
              ? "Airfares need a licensed feed (Travelpayouts)."
              : "Transfer fees need a licensed feed (Wise / Remitly)."}{" "}
            Until that account is connected, this page shows no prices rather than estimates. The partner configuration lives in{" "}
            <code>web/src/sites/gccguide/hub/affiliate.ts</code>; the missing values are{" "}
            {partners.map((p) => p.envVar).join(" and ")}.
          </p>
        </Callout>
      ) : (
        <DataTable
          head={["Provider", kind === "flights" ? "Fare" : "Recipient gets", "Fee", ""]}
          rows={offers.map((o) => [
            <b key={o.provider}>{o.provider}</b>,
            o.amount,
            o.fee,
            <a key={`${o.provider}-go`} href={o.url} target="_blank" rel="noopener sponsored nofollow">
              Open ↗
            </a>,
          ])}
          caption="Live partner prices"
          foot={<>Affiliate links: GCCGuide may earn a commission at no extra cost to you. The price shown is the partner&apos;s own, not ours.</>}
        />
      )}

      <Callout tone="info" title="How this will be built">
        <p style={{ margin: 0 }}>
          Route pages are created only for city pairs and corridors that the partner API actually returns prices for — one page per corridor with live
          data, not a mass-generated grid of empty pages. Exchange houses and airline sites are never scraped.
        </p>
      </Callout>
    </section>
  );
}

void AFFILIATE;
