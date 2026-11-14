import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { buildFuelView, monthName, fuelMonth } from "@/sites/gccguide/hub/fuel";
import { FUEL_COUNTRIES } from "@/sites/gccguide/hub/config";
import { HubPage, Crumbs, PageHead, DataTable, Faq, SourceLine, SectionHead, Callout } from "@/sites/gccguide/hub/ui";
import { fmt } from "@/sites/gccguide/hub/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") return {};
  return {
    title: `Petrol prices in the Gulf — ${monthName(fuelMonth())} (UAE, Saudi, Qatar, Kuwait, Oman, Bahrain)`,
    description: `Official petrol and diesel prices per litre for all six Gulf states, ${monthName(fuelMonth())}. Sourced from each government's monthly announcement.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/fuel-price" },
    openGraph: { images: defaultOgImages(), title: "Gulf petrol prices this month", description: "Official monthly fuel prices for the six Gulf states.", type: "website", url: "/fuel-price" },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const month = fuelMonth();

  const views = FUEL_COUNTRIES.map((c) => buildFuelView(c.slug)).filter((v): v is NonNullable<typeof v> => v != null);

  const faq = [
    {
      q: "Which Gulf country has the cheapest petrol?",
      a: "In US-dollar terms Kuwait and Saudi Arabia are consistently the cheapest, and the UAE the most expensive of the six, because the UAE applies a higher retail price including VAT. The comparison table on each country page converts every price to dollars so the six are comparable.",
    },
    {
      q: "How often do petrol prices change in the Gulf?",
      a: "Once a month. Every Gulf state reviews retail fuel prices on a monthly cycle and publishes the next month's figures in the last days of the current one. This page is rebuilt after each announcement.",
    },
    {
      q: "Are these prices official?",
      a: "Yes. Each country page links the government or national-oil-company source the price was read from and prints the date it was checked. Where the official statement was only readable through a newspaper, the page says so explicitly.",
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Fuel prices", url: `${base}/fuel-price` },
          ]),
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ]}
      />
      <HubPage site={site} active="tools">
        <Crumbs site={site} items={[{ label: "Fuel prices" }]} />
        <PageHead
          kicker={monthName(month)}
          title={`Petrol prices in the Gulf — ${monthName(month)}`}
          dek="Official retail fuel prices for the six Gulf states, per litre, with the source each figure came from. Prices are set monthly."
        />

        <DataTable
          head={["Country", "95-octane", "Diesel", "Currency"]}
          rows={views.map((v) => {
            const p95 = v.rows.find((r) => /95/.test(r.grade)) ?? v.rows[0];
            const diesel = v.rows.find((r) => /diesel/i.test(r.grade));
            return [
              <Link key={v.country} href={`${b}/fuel-price/${v.country}`}>
                <b>{v.name}</b>
              </Link>,
              p95 ? fmt(p95.price, 3) : "—",
              diesel ? fmt(diesel.price, 3) : "—",
              v.rows[0]?.currency ?? "—",
            ];
          })}
          caption={`Retail fuel prices, ${monthName(month)}`}
          foot={<>Per litre. Each country page lists every grade, the effective date and the official source.</>}
        />

        <div className="gh-grid cols3">
          {views.map((v) => {
            const p95 = v.rows.find((r) => /95/.test(r.grade)) ?? v.rows[0];
            return (
              <Link key={v.country} className="gh-card" href={`${b}/fuel-price/${v.country}`}>
                <b>{v.name}</b>
                <span className="gh-card-v">{p95 ? `${p95.currency} ${fmt(p95.price, 3)}` : "—"}</span>
              </Link>
            );
          })}
        </div>

        <Callout tone="info" title="Why prices differ so much">
          <p style={{ margin: 0 }}>
            Each state sets its own retail price. Subsidised markets (Kuwait, Saudi Arabia) keep petrol far below the international product
            price, while the UAE prices closer to market and adds VAT. Comparing the headline number across currencies is misleading — that is
            why every country page also converts the price to US dollars.
          </p>
        </Callout>

        <Faq items={faq} />

        <SectionHead title="How this page is updated" />
        <p className="gh-dek">
          Fuel prices are not scraped. Each month the official announcement is recorded in <code>hub/data/fuel.json</code> with its source URL
          and the date it was checked, and the page is rebuilt from that file. If a month&apos;s price cannot be verified from an official source,
          the page shows no number rather than an estimate.
        </p>

        <SourceLine
          source="Official monthly price announcements"
          url="https://www.moei.gov.ae/en"
          updated={views[0]?.checked ?? month}
          note={<>One entry per country, each with its own source link and check date.</>}
        />
      </HubPage>
    </>
  );
}
