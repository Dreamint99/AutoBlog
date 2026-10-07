import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticles, getArticle } from "@/lib/data";
import { processBody } from "@/lib/article";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { VC, isVcArticle, vcFor, flagFor } from "@/sites/walvi/visacheck/data";
import VisaCheckCountry, { vcFaq, vcName, vcTitle } from "@/sites/walvi/visacheck/CountryPage";

export const dynamic = "force-dynamic";

const entry = (slug: string) => VC.find((e) => e.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ site: string; country: string }> }): Promise<Metadata> {
  const { site: id, country } = await params;
  const site = getSite(id);
  const e = entry(country);
  if (!site || site.id !== "walvi" || !e) return {};
  const n = vcName(e);
  const host = e.url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  // ≤ ~60 chars, leading with the query people type ("qatar visa check").
  const title = `${e.slug === "schengen-vfs" ? "Schengen" : n} Visa Check Online ${new Date().getFullYear()}: How to Check Status`;
  const description = `Check your ${n} visa online on the official portal (${host}) — what you need, step-by-step instructions, what each status means and how to tell if a ${n} visa is fake.`;
  return {
    title,
    description,
    keywords: [`${n.toLowerCase()} visa check`, `check ${n.toLowerCase()} visa`, `${n.toLowerCase()} visa status`, `${n.toLowerCase()} visa check online`, `${n.toLowerCase()} visa check by passport number`],
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/visa-check/${e.slug}` },
    openGraph: { title, description, type: "article", url: `/visa-check/${e.slug}`, siteName: "VisaPoint", images: [flagFor(e, 640)] },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string; country: string }> }) {
  const { site: id, country } = await params;
  const site = getSite(id);
  const e = entry(country);
  if (!site || site.id !== "walvi" || !e) notFound();
  const base = siteBaseUrl(site);
  const listed = (await getArticles(site.id)).filter((a) => isVcArticle(a) && vcFor(a)?.slug === e.slug);
  const guide = listed[0] ? await getArticle(site.id, listed[0].slug) : undefined;
  const processed = guide ? processBody(guide.body_html) : null;
  const others = VC.filter((o) => o.slug !== e.slug && (o.region === e.region || ["qatar", "saudi-arabia", "uae", "malaysia", "serbia", "romania"].includes(o.slug))).slice(0, 10);
  const n = vcName(e);
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "VisaPoint", url: base },
            { name: "Visa check", url: `${base}/visa-check` },
            { name: `${n} visa check`, url: `${base}/visa-check/${e.slug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: vcTitle(e),
            totalTime: "PT5M",
            estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
            supply: e.need.map((x) => ({ "@type": "HowToSupply", name: x })),
            step: [
              { "@type": "HowToStep", name: "Open the official portal", text: `Go to ${e.url} (${e.portal}).`, url: e.url },
              { "@type": "HowToStep", name: "Enter your details", text: e.need.join(", ") },
              { "@type": "HowToStep", name: "Check every detail", text: "Name, passport number, visa type, sponsor and validity must match." },
              { "@type": "HowToStep", name: "Save the result", text: "Download or print the result and carry it with your passport." },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: vcFaq(e).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />
      <VisaCheckCountry site={site} e={e} guide={guide} bodyHtml={processed?.html.replace(/<figure\b[^>]*>(?:(?!<\/figure>)[\s\S])*?wiki(?:media|pedia)\.org(?:(?!<\/figure>)[\s\S])*?<\/figure>/gi, "").replace(/<img\b[^>]*wiki(?:media|pedia)\.org[^>]*>/gi, "")} toc={processed?.toc} others={others} />
    </>
  );
}
