import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { buildRemitHub } from "@/sites/gccguide/hub/remittance";
import { RemitHubPage } from "@/sites/gccguide/hub/RemitReport";

export const dynamic = "force-dynamic";

const TITLE = "Monthly Gulf Remittance Rates Report — QAR, AED, SAR, KWD, OMR, BHD to INR, PKR, BDT | GCCGuide";
const DESC =
  "Monthly reports on what a Gulf salary is worth back home: month-end rates, monthly and yearly change, highs, lows and the best week to send for 66 corridors.";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") return {};
  return {
    title: TITLE,
    description: DESC,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/reports/remittance" },
    openGraph: { images: defaultOgImages(), title: TITLE, description: DESC, type: "website", url: "/reports/remittance" },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") notFound();
  const hub = await buildRemitHub();
  if (!hub || !hub.items.length) notFound();
  const base = siteBaseUrl(site);
  const url = `${base}/reports/remittance`;
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Exchange rates", url: `${base}/rates` },
            { name: "Remittance reports", url },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Monthly Gulf Remittance Rates Report",
            description: DESC,
            url,
            hasPart: hub.items.map((it) => ({
              "@type": "Article",
              headline: `Gulf Remittance Rates Report — ${it.label}${it.complete ? "" : " (so far)"}`,
              url: `${url}/${it.ym}`,
            })),
          },
        ]}
      />
      <RemitHubPage site={site} items={hub.items} data={hub.data} />
    </>
  );
}
