import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { LegalLayout } from "@/sites/LegalLayout";
import { disclaimerContent } from "@/lib/legalPages";

export const dynamic = "force-dynamic";
const SUPPORTED = new Set(["countly", "walvi", "infkey", "ninetymins", "gccguide"]);

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) return {};
  return {
    title: `Disclaimer | ${site.name}`,
    description: `Disclaimer for ${site.name} — the information here is for general guidance only.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/disclaimer" },
  };
}

export default async function DisclaimerPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();
  return (
    <LegalLayout site={site} kicker="Legal" title="Disclaimer">
      {disclaimerContent(site)}
    </LegalLayout>
  );
}
