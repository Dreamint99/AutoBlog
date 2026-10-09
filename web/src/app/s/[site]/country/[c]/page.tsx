import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticles } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { BY_SLUG, countryOf } from "@/sites/gccguide/data";
import CountryPage from "@/sites/gccguide/CountryPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string; c: string }> }): Promise<Metadata> {
  const { site: id, c: slug } = await params;
  const site = getSite(id);
  const c = BY_SLUG.get(slug);
  if (!site || site.id !== "gccguide" || !c) return {};
  const title = `${c.name} Guide: Visa, Jobs, Driving Licence, Laws & Cost of Living`;
  const description = `Everything about living and working in ${c.name}: visas and residency, jobs and salaries, driving licence, laws for expats, cost of living, prayer times, ${c.currency} and the official portals.`;
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/country/${c.slug}` },
    openGraph: { title, description, type: "website", url: `/country/${c.slug}`, siteName: "GCCGuide", images: [{ url: "/og/gccguide.png", width: 1200, height: 630 }] },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string; c: string }> }) {
  const { site: id, c: slug } = await params;
  const site = getSite(id);
  const c = BY_SLUG.get(slug);
  if (!site || site.id !== "gccguide" || !c) notFound();
  const articles = (await getArticles(site.id)).filter((a) => countryOf(a)?.slug === c.slug);
  const base = siteBaseUrl(site);
  return (
    <>
      <JsonLd data={[breadcrumbSchema([{ name: "GCCGuide", url: base }, { name: c.name, url: `${base}/country/${c.slug}` }])]} />
      <CountryPage site={site} c={c} articles={articles} />
    </>
  );
}
