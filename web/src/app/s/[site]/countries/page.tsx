import "@/sites/walvi/theme.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { WalviShell } from "@/sites/walvi/Chrome";
import { PageHead, DataBand, Crumbs, CountryCard, Disclaimer } from "@/sites/walvi/data-ui";
import { COUNTRIES, JOBS, DATA_VERIFIED, estimate, eur } from "@/lib/walvi";
import { JsonLd, breadcrumbSchema, datasetSchema } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>;
}): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};
  return {
    title: "Work in Europe by country — salary, cost of living & permits | VisaPoint",
    description:
      "Compare European countries for foreign workers: indicative monthly salary, net pay, living cost, realistic savings and work-permit routes — with official sources.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/countries" },
    openGraph: {
      title: "Work in Europe by country | VisaPoint",
      description: "Salary, cost of living, savings and work-permit routes by European country.",
      type: "website",
      url: "/countries",
    },
  };
}

export default async function CountriesPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();
  const base = siteBaseUrl(site);

  return (
    <>
      <JsonLd
        data={[
          datasetSchema({
            name: "VisaPoint — Europe work, salary & cost-of-living by country",
            url: `${base}/countries`,
            description:
              "Indicative monthly salary, net pay, living cost, savings and work-permit routes for foreign workers across European countries.",
            creator: site.name,
            modified: DATA_VERIFIED,
          }),
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Countries", url: `${base}/countries` },
          ]),
        ]}
      />
      <WalviShell site={site}>
        <Crumbs items={[{ name: site.name, href: `/s/${site.id}` }, { name: "Countries" }]} />
        <PageHead
          kicker="Countries"
          title="Work in Europe, by country"
          dek="Pick a country for indicative salary, net pay, living cost, realistic monthly savings and the work-permit route — each with an official source to verify against."
        />
        <DataBand verified={DATA_VERIFIED} />
        <div className="tile-grid">
          {COUNTRIES.map((c) => {
            const minGross = Math.min(...JOBS.map((j) => estimate(c, j).grossEUR));
            return <CountryCard key={c.id} site={site} country={c} headline={`${eur(minGross)}/mo`} />;
          })}
        </div>
        <Disclaimer />
      </WalviShell>
    </>
  );
}
