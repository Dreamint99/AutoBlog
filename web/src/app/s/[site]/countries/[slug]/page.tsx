import "@/sites/walvi/theme.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { WalviShell } from "@/sites/walvi/Chrome";
import { PageBanner, DataBand, Crumbs, FactGrid, SalaryByJobTable, SourceNote, Disclaimer } from "@/sites/walvi/data-ui";
import { getCountry, salariesForCountry, DATA_VERIFIED, eur } from "@/lib/walvi";
import { JsonLd, breadcrumbSchema, datasetSchema } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}): Promise<Metadata> {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const country = getCountry(slug);
  if (!site || site.id !== "walvi" || !country) return {};
  return {
    title: `Working in ${country.name} — salary, cost of living, savings & work permit | Walvi`,
    description: `Indicative monthly salary and net pay by occupation in ${country.name}, plus living cost, realistic savings and the work-permit route — with an official source.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/countries/${country.slug}` },
    openGraph: {
      title: `Working in ${country.name} | Walvi`,
      description: `Salary, cost of living, savings and work-permit route for ${country.name}.`,
      type: "article",
      url: `/countries/${country.slug}`,
    },
  };
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}) {
  const { site: id, slug } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();
  const country = getCountry(slug);
  if (!country) notFound();

  const rows = salariesForCountry(country);
  const base = siteBaseUrl(site);

  return (
    <>
      <JsonLd
        data={[
          datasetSchema({
            name: `Walvi — ${country.name} salary, cost of living & work permit`,
            url: `${base}/countries/${country.slug}`,
            description: `Indicative monthly salary by occupation, living cost, savings and work-permit route for foreign workers in ${country.name}.`,
            creator: site.name,
            modified: DATA_VERIFIED,
          }),
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Countries", url: `${base}/countries` },
            { name: country.name, url: `${base}/countries/${country.slug}` },
          ]),
        ]}
      />
      <WalviShell site={site}>
        <Crumbs
          items={[
            { name: site.name, href: `/s/${site.id}` },
            { name: "Countries", href: `/s/${site.id}/countries` },
            { name: country.name },
          ]}
        />
        <PageBanner
          flag={country.flag}
          kicker={country.inEU ? "EU member · Schengen" : "Non-EU country"}
          title={`Working in ${country.name}`}
          dek={country.blurb}
          chips={[
            country.currency,
            country.permitType,
            `Visa ${country.visaWeeks[0]}–${country.visaWeeks[1]} wks`,
            `Net ≈ ${Math.round(country.netRatio * 100)}% of gross`,
          ]}
        />
        <DataBand verified={DATA_VERIFIED} />

        <FactGrid country={country} />

        <div className="section-head">
          <h2>Salary &amp; savings by occupation</h2>
          <span className="rule" />
          <span className="count">{rows.length} jobs</span>
        </div>
        <SalaryByJobTable site={site} rows={rows} />
        <p className="prose" style={{ fontSize: "0.92rem", marginBottom: "20px" }}>
          &ldquo;Housed&rdquo; savings assume the employer provides accommodation; &ldquo;self-paid&rdquo;
          deducts typical shared rent of {eur(country.accommodationEUR)}/mo. Net pay uses {country.name}&apos;s
          typical take-home rate of about {Math.round(country.netRatio * 100)}% of gross.
        </p>

        <div className="section-head">
          <h2>Work permit &amp; visa</h2>
          <span className="rule" />
        </div>
        <p className="prose">
          <b>{country.permitType}.</b> {country.permitNote} Typical processing runs about{" "}
          {country.visaWeeks[0]}–{country.visaWeeks[1]} weeks once the employer-side steps are done.
          {country.ieltsRequired
            ? " An English test such as IELTS may be requested for some roles."
            : " A formal English test such as IELTS is usually not required for these trades."}
        </p>
        <SourceNote country={country} />

        <Disclaimer />
      </WalviShell>
    </>
  );
}
