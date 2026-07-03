import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticles } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, organizationSchema } from "@/lib/seo";
import VisitBangladesh from "@/sites/countly/VisitBangladesh";
import { articlesInCategory } from "@/sites/countly/categories";

export const dynamic = "force-dynamic";

const SUPPORTED = new Set(["countly"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>;
}): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) return {};
  const title = `Visit Bangladesh with Countly — travel guides & trips`;
  const description =
    "Practical Bangladesh travel guides: Cox's Bazar, Sylhet, Bandarban, Kuakata, Rajshahi, Tanguar Haor and more — how to go, best time, places to visit and indicative costs.";
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/visit-bangladesh" },
    openGraph: { title, description, type: "website", url: "/visit-bangladesh" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function VisitBangladeshPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();

  const all = await getArticles(site.id);
  const articles = articlesInCategory(all, "bangladesh-travel");
  const base = siteBaseUrl(site);

  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Visit Bangladesh with Countly",
    url: `${base}/visit-bangladesh`,
    hasPart: articles.map((a) => ({
      "@type": "Article",
      headline: a.title,
      url: `${base}/${a.slug}`,
    })),
  };

  return (
    <>
      <JsonLd data={[organizationSchema(site.name, base, site.tagline), collection]} />
      <VisitBangladesh site={site} articles={articles} />
    </>
  );
}
