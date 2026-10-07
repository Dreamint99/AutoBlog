import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticles } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, organizationSchema } from "@/lib/seo";
import CountlyCategory from "@/sites/countly/Category";
import { getCategory, articlesInCategory } from "@/sites/countly/categories";
import NinetyminsTopic from "@/sites/ninetymins/Topic";
import { getComp, articlesInComp } from "@/sites/ninetymins/comps";

export const dynamic = "force-dynamic";

// Topic landing pages: Countly data categories and NinetyMins competition hubs.
const SUPPORTED = new Set(["countly", "ninetymins"]);

function resolve(siteId: string, slug: string) {
  if (siteId === "ninetymins") {
    const c = getComp(slug);
    return c && { label: c.label, blurb: c.blurb, title: `${c.label}: fixtures, kick-off times & how to watch` };
  }
  const c = getCategory(slug);
  return c && { label: c.label, blurb: c.blurb, title: `${c.label} statistics & rankings` };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; cat: string }>;
}): Promise<Metadata> {
  const { site: id, cat: slug } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) return {};
  const t = resolve(site.id, slug);
  if (!t) return {};
  const title = `${t.title} — ${site.name}`;
  return {
    title,
    description: `${t.label}: ${t.blurb}`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/topic/${slug}` },
    openGraph: { title, description: t.blurb, type: "website", url: `/topic/${slug}` },
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
  const base = siteBaseUrl(site);
  const all = await getArticles(site.id);

  if (site.id === "ninetymins") {
    const comp = getComp(slug);
    if (!comp) notFound();
    return (
      <>
        <JsonLd data={[organizationSchema(site.name, base, site.tagline)]} />
        <NinetyminsTopic site={site} comp={comp} articles={articlesInComp(all, slug)} />
      </>
    );
  }

  const category = getCategory(slug);
  if (!category) notFound();
  return (
    <>
      <JsonLd data={[organizationSchema(site.name, base, site.tagline)]} />
      <CountlyCategory site={site} category={category} articles={articlesInCategory(all, slug)} />
    </>
  );
}
