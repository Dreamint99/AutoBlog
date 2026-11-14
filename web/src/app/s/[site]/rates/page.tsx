import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { buildRateHub } from "@/sites/gccguide/hub/rates";
import { GULF_CURRENCIES, QUOTE_CURRENCIES } from "@/sites/gccguide/hub/config";
import { HubPage, Crumbs, PageHead, StatRow, BigStat, DataTable, Faq, SourceLine, SectionHead, Callout } from "@/sites/gccguide/hub/ui";
import { fmt, dateLong } from "@/sites/gccguide/hub/format";
import { dpFor } from "@/sites/gccguide/hub/series";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") return {};
  return {
    title: "Gulf currency exchange rates today — AED, SAR, QAR, KWD, OMR, BHD",
    description:
      "Today's mid-market exchange rates for all six Gulf currencies against the Indian rupee, Pakistani rupee, taka, Philippine peso and 10 more. Source-dated, refreshed three times a day.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/rates" },
    openGraph: { images: defaultOgImages(), title: "Gulf currency exchange rates today", description: "AED, SAR, QAR, KWD, OMR and BHD against 14 quote currencies.", type: "website", url: "/rates" },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const hub = await buildRateHub();

  const faq = [
    {
      q: "Which currencies are pegged to the US dollar?",
      a: "Five of the six: the UAE dirham (3.6725), Saudi riyal (3.75), Qatari riyal (3.64), Omani rial (0.3845) and Bahraini dinar (0.376). The Kuwaiti dinar is the only Gulf currency that floats, which is why KWD rates move a little every day.",
    },
    {
      q: "Why do these rates differ from what my exchange house gives me?",
      a: "These are mid-market reference rates. Banks and exchange houses add a margin, usually 0.5–2% on the Gulf–South Asia corridor, and some add a flat fee. Compare the 'amount received' rather than the headline rate.",
    },
    {
      q: "How often are the rates updated?",
      a: "The data job stores a new snapshot at 02:00, 10:00 and 18:00 UTC, and records one daily value per currency for the charts. Every page prints the source and the time it was stored.",
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Exchange rates", url: `${base}/rates` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />
      <HubPage site={site} active="tools">
        <Crumbs site={site} items={[{ label: "Exchange rates" }]} />
        <PageHead
          kicker={`Updated ${dateLong(hub.asOf)}`}
          title="Gulf exchange rates today"
          dek="Mid-market rates for the six Gulf currencies against the rupee, taka, peso and the majors — the rates expats check before sending money home. Every figure is sourced and dated."
        />

        <StatRow>
          {hub.featured.map((f) => (
            <BigStat key={f.label} label={f.label} value={f.value} tone="teal" sub={<Link href={`${b}${f.href}`}>{f.sub} →</Link>} />
          ))}
        </StatRow>

        <SectionHead title="One Gulf currency, six sending corridors" dek="Per 1 unit of the Gulf currency, at the same snapshot." />
        <DataTable
          head={["Gulf currency", "INR", "PKR", "BDT", "PHP", "USD"]}
          rows={hub.rows.map((r) => [
            <b key={r.code}>{r.code}</b>,
            ...([r.toInr, r.toPkr, r.toBdt, r.toPhp, r.usd] as (number | null)[]).map((v, i) =>
              v == null ? (
                <span key={i}>—</span>
              ) : (
                <Link key={i} href={`${b}/rates/${r.code.toLowerCase()}-to-${["inr", "pkr", "bdt", "php", "usd"][i]}`}>
                  {fmt(v, dpFor(v))}
                </Link>
              ),
            ),
          ])}
          caption={`Mid-market rates, ${dateLong(hub.asOf)}`}
          foot={<>Source: {hub.source} · refreshed three times a day. 1 USD = {hub.rows[0]?.usd ? fmt(hub.rows[0].usd, 4) : "—"} AED.</>}
        />

        <Callout tone="warn" title="This is not a cash rate">
          <p style={{ margin: 0 }}>
            Exchange houses and banks quote their own buy/sell prices, usually 0.5–2% away from the mid-market rate shown here. Use these
            pages to know the fair value, then compare what a provider actually pays out before you send.
          </p>
        </Callout>

        {GULF_CURRENCIES.map((g) => (
          <div key={g.code}>
            <SectionHead title={`${g.code} — ${g.name}`} dek={`${g.short}: all ${QUOTE_CURRENCIES.length} quote currencies`} />
            <div className="gh-grid cols4">
              {QUOTE_CURRENCIES.map((q) => (
                <Link key={q.code} className="gh-card" href={`${b}/rates/${g.code.toLowerCase()}-to-${q.code.toLowerCase()}`}>
                  <b>
                    {g.code} → {q.code}
                  </b>
                  <span>{q.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <Faq items={faq} />

        <SourceLine
          source={hub.source}
          url="https://open.er-api.com/v6/latest/USD"
          updated={hub.updated}
          note={<>{hub.live ? "" : "Showing the last published snapshot while the live feed reconnects. "}Mid-market reference rates; banks and exchange houses add a margin.</>}
        />
      </HubPage>
    </>
  );
}
