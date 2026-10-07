import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticles } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import VisaCheckHub, { VC_FAQ } from "@/sites/walvi/visacheck/Hub";
import { VC, isVcArticle } from "@/sites/walvi/visacheck/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};
  const year = new Date().getFullYear();
  const title = `Visa Check ${year}: How to Check Qatar, Saudi, UAE, Kuwait & Malaysia Visa Online`;
  const description =
    "Check your visa status online on the official government portal — Qatar, Saudi Arabia, UAE, Kuwait, Oman, Bahrain, Malaysia, Singapore, Romania and more. What you need, step by step, and how to spot a fake visa.";
  return {
    title,
    description,
    keywords: ["visa check", "visa status check", "qatar visa check", "saudi visa check", "uae visa check", "kuwait visa check", "malaysia visa check", "check visa online"],
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/visa-check" },
    openGraph: { title, description, type: "website", url: "/visa-check", siteName: "VisaPoint" },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();
  const base = siteBaseUrl(site);
  const guides = (await getArticles(site.id)).filter(isVcArticle);
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "VisaPoint", url: base },
            { name: "Visa status check", url: `${base}/visa-check` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to check your visa status online",
            step: [
              { "@type": "HowToStep", name: "Open the official government visa portal of the destination country" },
              { "@type": "HowToStep", name: "Enter your visa or application number, passport number and nationality" },
              { "@type": "HowToStep", name: "Check that your name, passport number, visa type and validity match" },
              { "@type": "HowToStep", name: "Download or print the result and carry it with your passport" },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: VC_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Official visa check portals",
            itemListElement: VC.map((e, i) => ({ "@type": "ListItem", position: i + 1, name: `${e.country} visa check`, url: `${base}/visa-check#${e.slug}` })),
          },
        ]}
      />
      <VisaCheckHub site={site} guides={guides} />
    </>
  );
}
