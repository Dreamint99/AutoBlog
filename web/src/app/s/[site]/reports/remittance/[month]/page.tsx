import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { buildMonthReport, buildRemitHub, LICENSE_URL, RECEIVING, GULF } from "@/sites/gccguide/hub/remittance";
import { RemitMonthPage } from "@/sites/gccguide/hub/RemitReport";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ site: string; month: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: id, month } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") return {};
  const r = await buildMonthReport(month);
  if (!r) return { title: "Report not found", robots: { index: false } };
  const path = `/reports/remittance/${r.ym}`;
  return {
    title: r.title,
    description: r.description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: path },
    openGraph: { images: defaultOgImages(), title: r.title, description: r.description, type: "article", url: path },
    twitter: { card: "summary_large_image", title: r.title, description: r.description },
  };
}

export default async function Page({ params }: Props) {
  const { site: id, month } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") notFound();
  const [r, hub] = await Promise.all([buildMonthReport(month), buildRemitHub()]);
  if (!r || !hub) notFound();

  const base = siteBaseUrl(site);
  const url = `${base}/reports/remittance/${r.ym}`;
  const org = { "@type": "Organization", name: site.name, url: base, logo: `${base}/icon` };
  const headline = `Gulf Remittance Rates Report — ${r.label}${r.complete ? "" : " (so far)"}`;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Exchange rates", url: `${base}/rates` },
            { name: "Remittance reports", url: `${base}/reports/remittance` },
            { name: r.label, url },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline,
            description: r.description,
            url,
            mainEntityOfPage: url,
            datePublished: r.published,
            dateModified: r.lastDate,
            author: org,
            publisher: org,
            image: `${base}/og/gccguide.png`,
          },
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: `Gulf remittance exchange rates — ${r.label}`,
            description: `Month-end mid-market exchange rates, monthly and 12-month change, monthly high and low, and best week to send for ${GULF.join(", ")} against ${RECEIVING.join(", ")}, ${r.label}. ${r.description}`,
            url,
            temporalCoverage: `${r.coverageStart}/${r.coverageEnd}`,
            dateModified: r.lastDate,
            license: LICENSE_URL,
            isAccessibleForFree: true,
            creator: org,
            publisher: org,
            keywords: ["remittance", "exchange rate", "Gulf", ...GULF, ...RECEIVING],
            variableMeasured: ["month-end exchange rate", "month-over-month change (%)", "year-over-year change (%)", "monthly high", "monthly low", "best week to send"],
            isBasedOn: r.sourcesUsed.filter((s) => s.url).map((s) => s.url),
          },
        ]}
      />
      <RemitMonthPage site={site} r={r} data={hub.data} />
    </>
  );
}
