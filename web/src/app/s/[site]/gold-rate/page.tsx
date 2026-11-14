import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { getGold, getFxSnapshot, usdPer } from "@/lib/gcc";
import { GOLD_CITIES, GRAMS_PER_OZ, GRAMS_PER_TOLA, KARATS } from "@/sites/gccguide/hub/config";
import { HubPage, Crumbs, PageHead, StatRow, BigStat, DataTable, Faq, SourceLine, SectionHead, Callout } from "@/sites/gccguide/hub/ui";
import { fmt, dateLong } from "@/sites/gccguide/hub/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") return {};
  return {
    title: "Gold rate in the Gulf today — Dubai, Riyadh, Doha, Kuwait, Muscat, Manama",
    description:
      "Today's gold rate per gram in 14 Gulf cities: 24K, 22K, 21K and 18K, per gram, 8 g, 10 g and tola. Spot-based, sourced and dated.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/gold-rate" },
    openGraph: { images: defaultOgImages(), title: "Gold rate in the Gulf today", description: "24K and 22K gold per gram in 14 Gulf cities.", type: "website", url: "/gold-rate" },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const [gold, snap] = await Promise.all([getGold(), getFxSnapshot()]);

  const rows = GOLD_CITIES.map((c) => {
    const fx = usdPer(snap, c.currency);
    const gram24 = fx ? (gold.usdPerOz / GRAMS_PER_OZ) * fx : null;
    const gram22 = gram24 == null ? null : gram24 * 0.916;
    const tola24 = gram24 == null ? null : gram24 * GRAMS_PER_TOLA;
    return { ...c, gram24, gram22, tola24 };
  });

  const faq = [
    {
      q: "Why is the gold rate the same in Dubai, Abu Dhabi and Sharjah?",
      a: "Because the price of gold is quoted in US dollars and the dirham is pegged at 3.6725 to the dollar. Every emirate converts the same spot price at the same fixed rate, so the metal value is identical — only the making charge and the shop's own premium differ.",
    },
    {
      q: "Which Gulf city has the cheapest gold?",
      a: "The metal costs the same across a country; what changes between countries is the currency conversion. A kilo of gold costs the same everywhere once you convert, so compare making charges and VAT, not the headline rate.",
    },
    {
      q: "Is the gold rate on this page a shop price?",
      a: "No. It is the spot value of the metal. Jewellers add a making charge of roughly 5–20% plus any VAT, so the price you pay at a counter is always above these figures.",
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Gold rates", url: `${base}/gold-rate` },
          ]),
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ]}
      />
      <HubPage site={site} active="tools">
        <Crumbs site={site} items={[{ label: "Gold rates" }]} />
        <PageHead
          kicker={`Spot gold ${fmt(gold.usdPerOz, 2)} USD/oz · ${dateLong(gold.asOf)}`}
          title="Gold rate in the Gulf today"
          dek="24K, 22K, 21K and 18K per gram in 14 Gulf cities, calculated from the live spot price and the local currency rate. Sourced, dated, and honest about making charges."
        />

        <StatRow>
          <BigStat label="Spot gold" value={fmt(gold.usdPerOz, 2)} unit="USD/oz" tone="gold" sub={`${dateLong(gold.asOf)}`} />
          {KARATS.slice(0, 3).map((k, i) => {
            const city = rows[0];
            const gram = city.gram24 == null ? null : city.gram24 * k.purity;
            return <BigStat key={k.k} label={`${k.label} · ${city.city}`} value={gram == null ? "—" : fmt(gram, 2)} unit={city.currency} tone={i === 0 ? "teal" : "navy"} sub={k.note} />;
          })}
        </StatRow>

        <SectionHead title="Gold per gram, city by city" dek="24K and 22K per gram, plus the tola price, on today's spot." />
        <DataTable
          head={["City", "Country", "24K /g", "22K /g", "1 tola 24K", "Currency"]}
          rows={rows.map((r) => [
            <Link key={r.slug} href={`${b}/gold-rate/${r.slug}`}>
              <b>{r.city}</b>
            </Link>,
            r.countryName,
            r.gram24 == null ? "—" : fmt(r.gram24, r.currency === "KWD" ? 3 : 2),
            r.gram22 == null ? "—" : fmt(r.gram22, r.currency === "KWD" ? 3 : 2),
            r.tola24 == null ? "—" : fmt(r.tola24, r.currency === "KWD" ? 3 : 2),
            r.currency,
          ])}
          caption={`Spot-based gold rates, ${dateLong(gold.asOf)}`}
          foot={<>1 troy ounce = 31.1034768 g · 1 tola = 11.6638 g. Currency conversion: open.er-api.com. Shops add making charges.</>}
        />

        <Callout tone="warn" title="Same gold, different shop prices">
          <p style={{ margin: 0 }}>
            Gold is a commodity: the metal is worth the same in Dubai and Riyadh once you convert. What varies is the making charge, the
            shop&apos;s premium and VAT. Ask for weight and karat, then compare the total — not just the &quot;rate&quot; on the board.
          </p>
        </Callout>

        <div className="gh-grid cols4">
          {rows.map((r) => (
            <Link key={r.slug} className="gh-card" href={`${b}/gold-rate/${r.slug}`}>
              <b>{r.city}</b>
              <span className="gh-card-v">{r.gram22 == null ? "—" : `${fmt(r.gram22, 2)} ${r.currency}`}</span>
            </Link>
          ))}
        </div>

        <Faq items={faq} />

        <SourceLine source={gold.source} url={gold.sourceUrl} updated={gold.updated} note={<>Spot gold, refreshed hourly. Currency conversion three times a day. {gold.live ? "" : "Showing the last published snapshot."}</>} />
      </HubPage>
    </>
  );
}
