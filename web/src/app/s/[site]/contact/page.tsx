import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { LegalLayout } from "@/sites/LegalLayout";
import { contactContent } from "@/lib/legalPages";
import ContactForm from "@/sites/countly/ContactForm";

export const dynamic = "force-dynamic";
const SUPPORTED = new Set(["countly", "walvi", "infkey", "ninetymins"]);

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) return {};
  return {
    title: `Contact | ${site.name}`,
    description: `Get in touch with the ${site.name} team — questions, corrections or feedback.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();
  return (
    <LegalLayout site={site} kicker="Contact" title="Get in touch">
      {contactContent(site)}
      {site.id === "countly" ? <ContactForm /> : null}
    </LegalLayout>
  );
}
