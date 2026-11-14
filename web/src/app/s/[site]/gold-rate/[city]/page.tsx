import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { buildGoldView, findCity, isGoldIndexed } from "@/sites/gccguide/hub/gold";
import GoldPage from "@/sites/gccguide/hub/GoldPage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ site: string; city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: id, city } = await params;
  const site = getSite(id);
  const c = findCity(city);
  if (!site || site.id !== "gccguide" || !c) return {};
  const v = await buildGoldView(city);
  if (!v) return { title: "Gold rate unavailable" };
  return {
    title: v.title,
    description: v.description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/gold-rate/${c.slug}` },
    robots: isGoldIndexed(c) ? { index: true, follow: true, "max-image-preview": "large" } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: v.title, description: v.description, type: "website", url: `/gold-rate/${c.slug}` },
    twitter: { card: "summary_large_image", title: v.title, description: v.description },
  };
}

export default async function Page({ params }: Props) {
  const { site: id, city } = await params;
  const site = getSite(id);
  const c = findCity(city);
  if (!site || site.id !== "gccguide" || !c) notFound();
  const v = await buildGoldView(city);
  if (!v) notFound();
  const base = siteBaseUrl(site);
  const url = `${base}/gold-rate/${c.slug}`;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Gold rates", url: `${base}/gold-rate` },
            { name: v.city, url },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: v.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />
      <GoldPage site={site} v={v} />
    </>
  );
}
