import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { buildFuelView, fuelCountry } from "@/sites/gccguide/hub/fuel";
import { getFxSnapshot, usdPer } from "@/lib/gcc";
import { FUEL_COUNTRIES } from "@/sites/gccguide/hub/config";
import { HubPage, Crumbs, PageHead, StatRow, BigStat, DataTable, Faq, SourceLine, Related, SectionHead, Callout, NoData } from "@/sites/gccguide/hub/ui";
import { fmt } from "@/sites/gccguide/hub/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ site: string; country: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: id, country } = await params;
  const site = getSite(id);
  const c = fuelCountry(country);
  if (!site || site.id !== "gccguide" || !c) return {};
  const v = buildFuelView(country);
  if (!v) return {};
  return {
    title: v.title,
    description: v.description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/fuel-price/${c.slug}` },
    robots: v.rows.length ? { index: true, follow: true, "max-image-preview": "large" } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: v.title, description: v.description, type: "website", url: `/fuel-price/${c.slug}` },
  };
}

export default async function Page({ params }: Props) {
  const { site: id, country } = await params;
  const site = getSite(id);
  const c = fuelCountry(country);
  if (!site || site.id !== "gccguide" || !c) notFound();
  const v = buildFuelView(country);
  if (!v) notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);

  // Cross-Gulf comparison in USD — the only honest way to compare six currencies.
  const snap = await getFxSnapshot();
  const perLitreUsd = FUEL_COUNTRIES.map((fc) => {
    const vv = buildFuelView(fc.slug);
    const r95 = vv?.rows.find((r) => /95/.test(r.grade)) ?? vv?.rows[0];
    const fx = r95 ? usdPer(snap, r95.currency) : null;
    return { country: fc, r95, usd: r95 && fx ? r95.price / fx : null };
  }).filter((x) => x.r95);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Fuel prices", url: `${base}/fuel-price` },
            { name: c.name, url: `${base}/fuel-price/${c.slug}` },
          ]),
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: v.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ]}
      />
      <HubPage site={site} active="tools">
        <Crumbs site={site} items={[{ label: "Fuel prices", href: `${b}/fuel-price` }, { label: c.name }]} />
        <PageHead
          kicker={`${v.monthLabel} · official announcement`}
          title={
            v.rows.length ? (
              <>
                Petrol price in {c.name} — {v.monthLabel}: 95-octane {v.rows.find((r) => /95/.test(r.grade))?.currency ?? ""}{" "}
                {fmt(v.rows.find((r) => /95/.test(r.grade))?.price ?? v.rows[0].price, 3)} per litre
              </>
            ) : (
              <>Petrol price in {c.name} — {v.monthLabel}</>
            )
          }
          dek={
            <>
              Official retail fuel prices for {v.monthLabel}. {v.sourceType === "official" ? "Read from the national retailer or ministry page." : "The official monthly statement was only published through a newspaper — labelled as such."}{" "}
              Checked {v.checked}.
            </>
          }
        />

        {v.rows.length ? (
          <>
            <StatRow>
              <BigStat label="95-octane" value={fmt(v.rows.find((r) => /95/.test(r.grade))?.price ?? 0, 3)} unit={v.rows[0].currency} tone="navy" sub="per litre" />
              <BigStat label="Diesel" value={v.rows.find((r) => /diesel/i.test(r.grade)) ? fmt(v.rows.find((r) => /diesel/i.test(r.grade))!.price, 3) : "—"} unit={v.rows[0].currency} tone="teal" sub="per litre" />
              <BigStat label="Price range" value={`${fmt(v.cheapest!.price, 3)} – ${fmt(v.dearest!.price, 3)}`} unit={v.rows[0].currency} tone="gold" sub={`${v.cheapest!.grade} → ${v.dearest!.grade}`} />
              <BigStat label="Effective" value={v.rows[0].effective_from || v.monthLabel} tone="navy" sub="monthly review" />
            </StatRow>

            <SectionHead title={`Fuel prices in ${c.name}, ${v.monthLabel}`} dek="Per litre, and what a typical fill costs." />
            <DataTable
              head={["Grade", `Price / litre (${v.rows[0].currency})`, "10 litres", "Full 60 L tank"]}
              rows={v.rows.map((r) => [
                <b key={r.grade}>{r.grade}</b>,
                fmt(r.price, 3),
                fmt(r.price * 10, 2),
                fmt(r.price * 60, 2),
              ])}
              caption={`${c.name} retail fuel prices, ${v.monthLabel}`}
              foot={
                <>
                  Source:{" "}
                  {v.sourceUrl ? (
                    <a href={v.sourceUrl} target="_blank" rel="noopener nofollow">
                      {v.sourceType === "official" ? "official price page" : "official statement (via newspaper)"}
                    </a>
                  ) : null}{" "}
                  · checked {v.checked}. Prices are set monthly.
                </>
              }
            />
          </>
        ) : (
          <NoData what={`The ${v.monthLabel} fuel price`} />
        )}

        {v.notes ? <Callout tone="warn" title="What is not verified">{v.notes}</Callout> : null}

        <SectionHead title="How Gulf petrol prices compare" dek="Per litre in US dollars, so six currencies become comparable." />
        <DataTable
          head={["Country", "Grade", "Local price", "USD / litre"]}
          rows={perLitreUsd.map((x) => [
            <Link key={x.country.slug} href={`${b}/fuel-price/${x.country.slug}`}>
              <b>{x.country.name}</b>
            </Link>,
            x.r95!.grade,
            `${x.r95!.currency} ${fmt(x.r95!.price, 3)}`,
            x.usd == null ? "—" : `$${fmt(x.usd, 3)}`,
          ])}
          caption="Same month, converted at the day's mid-market rate"
          foot={<>Currency conversion: open.er-api.com. Grades differ slightly between countries — compare the USD column, not the grade label.</>}
        />

        <Faq items={v.faq} />

        <Related
          title="Fuel prices in other Gulf states"
          links={FUEL_COUNTRIES.filter((fc) => fc.slug !== c.slug).map((fc) => ({ label: fc.name, href: `${b}/fuel-price/${fc.slug}` }))}
        />

        <SourceLine source={v.sourceType === "official" ? "Official price announcement" : "Official announcement (via newspaper)"} url={v.sourceUrl || base} updated={v.updated || v.checked} note={<>Monthly retail prices, checked by hand each month. Grades and effective dates are printed above.</>} />
      </HubPage>
    </>
  );
}
