import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { LegalLayout } from "@/sites/LegalLayout";
import { termsContent } from "@/lib/legalPages";

export const dynamic = "force-dynamic";
const SUPPORTED = new Set(["countly", "walvi", "infkey"]);

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) return {};
  return {
    title: `Terms of Service | ${site.name}`,
    description: `The terms that govern your use of ${site.name}.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();
  return (
    <LegalLayout site={site} kicker="Legal" title="Terms of Service">
      {termsContent(site)}
    </LegalLayout>
  );
}
