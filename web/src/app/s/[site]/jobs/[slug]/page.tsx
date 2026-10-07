import "@/sites/walvi/theme.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { WalviShell } from "@/sites/walvi/Chrome";
import { PageBanner, DataBand, Crumbs, SalaryByCountryTable, Disclaimer } from "@/sites/walvi/data-ui";
import { getJob, salariesForJob, DATA_VERIFIED, eur } from "@/lib/walvi";
import { JsonLd, breadcrumbSchema, datasetSchema } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}): Promise<Metadata> {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const job = getJob(slug);
  if (!site || site.id !== "walvi" || !job) return {};
  return {
    title: `${job.name} jobs in Europe — salary by country & savings | VisaPoint`,
    description: `Indicative monthly salary and realistic savings for ${job.name.toLowerCase()} jobs across European countries, plus certificates and demand.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/jobs/${job.slug}` },
    openGraph: {
      title: `${job.name} jobs in Europe | VisaPoint`,
      description: `Salary by country and savings for ${job.name.toLowerCase()} jobs in Europe.`,
      type: "article",
      url: `/jobs/${job.slug}`,
    },
  };
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}) {
  const { site: id, slug } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();
  const job = getJob(slug);
  if (!job) notFound();

  const rows = salariesForJob(job);
  const best = rows[0];
  const base = siteBaseUrl(site);

  return (
    <>
      <JsonLd
        data={[
          datasetSchema({
            name: `VisaPoint — ${job.name} salary by European country`,
            url: `${base}/jobs/${job.slug}`,
            description: `Indicative monthly salary and savings for ${job.name} jobs across European countries.`,
            creator: site.name,
            modified: DATA_VERIFIED,
          }),
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Jobs", url: `${base}/jobs` },
            { name: job.name, url: `${base}/jobs/${job.slug}` },
          ]),
        ]}
      />
      <WalviShell site={site}>
        <Crumbs
          items={[
            { name: site.name, href: `/s/${site.id}` },
            { name: "Jobs", href: `/s/${site.id}/jobs` },
            { name: job.name },
          ]}
        />
        <PageBanner
          flag={job.icon}
          kicker={`${job.skillLevel} · ${job.demand} demand`}
          title={`${job.name} jobs in Europe`}
          dek={job.summary}
          chips={[
            `Best: ${best.country.flag} ${best.country.name}`,
            `${eur(best.savingsHousedEUR)}/mo top saving`,
            `${rows.length} countries`,
          ]}
        />
        <DataBand verified={DATA_VERIFIED} />

        <div className="facts">
          <div className="fact">
            <div className="fk">Best savings</div>
            <div className="fv">
              {best.country.flag} {best.country.name} · {eur(best.savingsHousedEUR)}/mo
            </div>
          </div>
          <div className="fact">
            <div className="fk">Demand</div>
            <div className="fv">{job.demand}</div>
          </div>
          <div className="fact">
            <div className="fk">Certificates</div>
            <div className="fv" style={{ fontSize: "0.86rem", fontWeight: 600 }}>
              {job.certNote}
            </div>
          </div>
          <div className="fact">
            <div className="fk">Language</div>
            <div className="fv" style={{ fontSize: "0.86rem", fontWeight: 600 }}>
              {job.langNote}
            </div>
          </div>
        </div>

        <div className="section-head">
          <h2>Salary &amp; savings by country</h2>
          <span className="rule" />
          <span className="count">{rows.length} countries</span>
        </div>
        <SalaryByCountryTable site={site} rows={rows} />
        <p className="prose" style={{ fontSize: "0.92rem", marginBottom: "20px" }}>
          Ranked by realistic monthly savings assuming employer-provided accommodation. &ldquo;Living
          cost&rdquo; here is food + transport only. A {job.name.toLowerCase()} who pays their own rent
          should subtract local accommodation from each row.
        </p>

        <Disclaimer />
      </WalviShell>
    </>
  );
}
