import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { LegalLayout } from "@/sites/LegalLayout";
import { aboutContent } from "@/lib/legalPages";

export const dynamic = "force-dynamic";
const SUPPORTED = new Set(["countly", "walvi", "infkey", "ninetymins"]);

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) return {};
  return {
    title: `About | ${site.name}`,
    description: `About ${site.name} — who we are, what we publish and how we work.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();
  return (
    <LegalLayout site={site} kicker="About" title={`About ${site.name}`}>
      {aboutContent(site)}
    </LegalLayout>
  );
}
