import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { visaItems, visaCountries, countryName } from "@/sites/gccguide/hub/directory";
import { GULF_CURRENCIES, INDEX } from "@/sites/gccguide/hub/config";
import { HubPage, Crumbs, PageHead, DataTable, Faq, SectionHead, SourceLine, Related, Callout } from "@/sites/gccguide/hub/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") return {};
  const total = visaItems().length;
  return {
    title: "Visa, residence permit and ID fees in the Gulf — official figures",
    description: `Official visa, iqama, QID, CPR and Emirates ID fees for the six Gulf states: ${total} items, each with its source portal and the date it was checked.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/visa-fees" },
    robots: INDEX.visaFees ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: "Visa and residence fees in the Gulf", description: "Official fees per country, with source links.", type: "website", url: "/visa-fees" },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const countries = visaCountries();

  const faq = [
    {
      q: "Why do some fees have no number?",
      a: "Because the official portal does not publish one. Several Gulf e-services charge the fee only inside the application flow, and the schedule page is either script-driven or unreachable. A visa agency's number is not a substitute for the government's.",
    },
    {
      q: "Are these fees per year or one-off?",
      a: "Both exist. Residence permits are usually charged per year of residence, ID cards per validity period, and some services carry a one-off application fee on top. The 'Basis' column states what the figure covers.",
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Visa fees", url: `${base}/visa-fees` },
          ]),
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ]}
      />
      <HubPage site={site} active="countries">
        <Crumbs site={site} items={[{ label: "Visa & residence fees" }]} />
        <PageHead
          kicker={`${visaItems().length} items · ${countries.length} countries`}
          title="Visa, residence and ID fees in the Gulf"
          dek="What the government charges for visas, residence permits, iqama renewal, QID, CPR and ID cards — read from official portals, with the basis and the source page for every figure."
        />

        <DataTable
          head={["Country", "Items listed", "Verified with a figure", "Currency"]}
          rows={GULF_CURRENCIES.map((g) => {
            const items = visaItems(g.country);
            return [
              <Link key={g.country} href={`${b}/visa-fees/${g.country}`}>
                <b>{g.short}</b>
              </Link>,
              `${items.length}`,
              `${items.filter((i) => i.fee != null).length}`,
              g.code,
            ];
          })}
          caption="Coverage by country"
          foot={<>Open a country for the items, the steps and the official portal for each fee.</>}
        />

        <Callout tone="warn" title="What is not included">
          <p style={{ margin: 0 }}>
            Medical fitness tests, health insurance, typing-centre charges, attestation and courier fees are quoted separately by their providers and
            are not government fees. They vary by city and employer, so this page does not guess at them.
          </p>
        </Callout>

        <SectionHead title="Country by country" />
        <div className="gh-grid cols3">
          {GULF_CURRENCIES.map((g) => {
            const items = visaItems(g.country);
            return (
              <Link key={g.country} className="gh-card" href={`${b}/visa-fees/${g.country}`}>
                <b>{g.short}</b>
                <span>{items.filter((i) => i.fee != null).length}/{items.length} verified</span>
              </Link>
            );
          })}
        </div>

        <Faq items={faq} />

        <Related
          title="Related"
          links={[
            { label: "Embassies & consulates", href: `${b}/embassy` },
            { label: "Public holidays", href: `${b}/public-holidays` },
            { label: "Gratuity calculators", href: `${b}/calculators` },
          ]}
        />

        <SourceLine source="Official government portals" url={visaItems()[0]?.source_url || base} updated={visaItems()[0]?.checked ?? "2026-11-14"} note={<>One portal link per item. Fees change by decree; confirm before paying.</>} />
      </HubPage>
    </>
  );
}

void countryName;
