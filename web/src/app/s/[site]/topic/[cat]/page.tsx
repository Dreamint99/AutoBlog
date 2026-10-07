import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticles } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, organizationSchema, breadcrumbSchema } from "@/lib/seo";
import CountlyCategory from "@/sites/countly/Category";
import { getCategory, articlesInCategory } from "@/sites/countly/categories";
import NinetyminsTopic from "@/sites/ninetymins/Topic";
import { getComp, articlesInComp } from "@/sites/ninetymins/comps";
import SaffHub from "@/sites/ninetymins/SaffHub";
import { SAFF_FAQ, SAFF_FINALS } from "@/sites/ninetymins/saff";

const SAFF_TITLE = "SAFF Championship: Fixtures, Results, Winners List, Teams & How to Watch";
const SAFF_DESC =
  "Everything on the SAFF Championship: live South Asia fixtures and scores, every final since 1993, the full winners list (India 9, Maldives 2, Bangladesh 1), teams, records and where to watch.";

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
  const saff = site.id === "ninetymins" && slug === "saff-championship";
  const title = saff ? `${SAFF_TITLE} | ${site.name}` : `${t.title} — ${site.name}`;
  return {
    title,
    description: saff ? SAFF_DESC : `${t.label}: ${t.blurb}`,
    ...(saff ? { keywords: ["SAFF Championship", "SAFF Championship 2026", "SAFF Cup", "SAFF winners list", "SAFF football", "Bangladesh football", "South Asian football"] } : {}),
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
    if (slug === "saff-championship") {
      return (
        <>
          <JsonLd
            data={[
              organizationSchema(site.name, base, site.tagline),
              breadcrumbSchema([
                { name: site.name, url: `${base}/` },
                { name: "Football", url: `${base}/topic/football` },
                { name: "SAFF Championship", url: `${base}/topic/saff-championship` },
              ]),
              {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: SAFF_FAQ.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              },
              {
                "@context": "https://schema.org",
                "@type": "SportsOrganization",
                name: "SAFF Championship",
                alternateName: ["SAFF Cup", "SAARC Gold Cup"],
                sport: "Soccer",
                foundingDate: "1993",
                url: `${base}/topic/saff-championship`,
                description: `South Asia's national-team football championship. ${SAFF_FINALS[0].year} champions: ${SAFF_FINALS[0].champion}.`,
              },
            ]}
          />
          <SaffHub site={site} comp={comp} articles={articlesInComp(all, slug)} />
        </>
      );
    }
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
