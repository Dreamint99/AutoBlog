import "@/sites/walvi/theme.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { WalviShell } from "@/sites/walvi/Chrome";
import { PageHead, DataBand, Crumbs, JobCard, Disclaimer } from "@/sites/walvi/data-ui";
import { JOBS, DATA_VERIFIED, salariesForJob, eur } from "@/lib/walvi";
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
    title: "In-demand jobs in Europe — salary by occupation | VisaPoint",
    description:
      "Electrician, welder, truck driver, cook and more: indicative salary, demand and realistic savings for skilled-trade jobs across Europe.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/jobs" },
    openGraph: {
      title: "In-demand jobs in Europe | VisaPoint",
      description: "Salary and savings by occupation across Europe.",
      type: "website",
      url: "/jobs",
    },
  };
}

export default async function JobsPage({
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
            name: "VisaPoint — in-demand European jobs & salary by occupation",
            url: `${base}/jobs`,
            description:
              "Indicative salary, demand level and realistic savings for skilled-trade occupations across European countries.",
            creator: site.name,
            modified: DATA_VERIFIED,
          }),
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Jobs", url: `${base}/jobs` },
          ]),
        ]}
      />
      <WalviShell site={site}>
        <Crumbs items={[{ name: site.name, href: `/s/${site.id}` }, { name: "Jobs" }]} />
        <PageHead
          kicker="Jobs & salaries"
          title="In-demand jobs in Europe"
          dek="The skilled and semi-skilled trades European employers recruit for — open one for indicative salary and savings ranked across every country we cover."
        />
        <DataBand verified={DATA_VERIFIED} />
        <div className="tile-grid">
          {JOBS.map((j) => {
            const best = salariesForJob(j)[0];
            return <JobCard key={j.id} site={site} job={j} headline={`${eur(best.savingsHousedEUR)}/mo`} />;
          })}
        </div>
        <Disclaimer />
      </WalviShell>
    </>
  );
}
