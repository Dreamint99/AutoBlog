import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticles } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, organizationSchema } from "@/lib/seo";
import CountlyCategory from "@/sites/countly/Category";
import { getCategory, articlesInCategory } from "@/sites/countly/categories";

export const dynamic = "force-dynamic";

// Topic / category landing pages currently exist for the Countly site only.
const SUPPORTED = new Set(["countly"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; cat: string }>;
}): Promise<Metadata> {
  const { site: id, cat: slug } = await params;
  const site = getSite(id);
  const category = getCategory(slug);
  if (!site || !category || !SUPPORTED.has(site.id)) return {};
  const title = `${category.label} statistics & rankings — ${site.name}`;
  return {
    title,
    description: `${category.label}: ${category.blurb} Sourced, dated data reports from ${site.name}.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/topic/${category.slug}` },
    openGraph: { title, description: category.blurb, type: "website", url: `/topic/${category.slug}` },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ site: string; cat: string }>;
}) {
  const { site: id, cat: slug } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();
  const category = getCategory(slug);
  if (!category) notFound();

  const all = await getArticles(site.id);
  const articles = articlesInCategory(all, slug);
  const base = siteBaseUrl(site);

  return (
    <>
      <JsonLd data={[organizationSchema(site.name, base, site.tagline)]} />
      <CountlyCategory site={site} category={category} articles={articles} />
    </>
  );
}
