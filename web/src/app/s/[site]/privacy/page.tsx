import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { LegalLayout } from "@/sites/LegalLayout";
import { privacyContent } from "@/lib/legalPages";

export const dynamic = "force-dynamic";
const SUPPORTED = new Set(["countly", "walvi", "infkey", "ninetymins"]);

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) return {};
  return {
    title: `Privacy Policy | ${site.name}`,
    description: `How ${site.name} collects and uses data, including advertising and Google AdSense cookies.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/privacy" },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();
  return (
    <LegalLayout site={site} kicker="Legal" title="Privacy Policy">
      {privacyContent(site)}
    </LegalLayout>
  );
}
