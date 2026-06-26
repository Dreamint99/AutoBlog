import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticles } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, organizationSchema } from "@/lib/seo";
import CountlyTop10 from "@/sites/countly/Top10";
import { top10Articles } from "@/sites/countly/categories";

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
  const title = `Top 10 Lists — worldwide rankings | ${site.name}`;
  const description =
    "Top 10 rankings from around the world — banks, universities, companies, hotels, travel agencies and more, sourced and dated.";
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/top10" },
    openGraph: { title, description, type: "website", url: "/top10" },
  };
}

export default async function Top10Page({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();

  const all = await getArticles(site.id);
  const articles = top10Articles(all);
  const base = siteBaseUrl(site);

  return (
    <>
      <JsonLd data={[organizationSchema(site.name, base, site.tagline)]} />
      <CountlyTop10 site={site} articles={articles} />
    </>
  );
}
