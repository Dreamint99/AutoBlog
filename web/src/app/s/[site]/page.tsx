import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticles } from "@/lib/data";
import { SITE_COMPONENTS } from "@/sites/registry";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, organizationSchema, websiteSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>;
}): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site) return {};
  const meta: Metadata = {
    title: `${site.name} — ${site.tagline}`,
    description: site.tagline,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/" },
    openGraph: { title: site.name, description: site.tagline, type: "website", url: "/" },
  };
  // Search-engine ownership verification (home-page meta tags).
  if (site.id === "infkey") {
    meta.verification = {
      google: "-8KJCF5N-VT095e7Di-4oyQhnnMEyUW2E7S7h10imbM",
      yandex: "b55bc7a4b327f2b1",
    };
  }
  // Countly: Google verified via DNS (domain property); Bing + Yandex via meta tag.
  if (site.id === "countly") {
    meta.verification = {
      yandex: "d98b701bc2457bd8",
      other: { "msvalidate.01": "E7D0AADC1BF5C8F0A380539539FD8AB0" },
    };
  }
  return meta;
}

export default async function SiteHomePage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site) notFound();
  const components = SITE_COMPONENTS[site.id];
  if (!components) notFound();
  const articles = await getArticles(site.id);
  const { Home } = components;
  const base = siteBaseUrl(site);
  return (
    <>
      <JsonLd
        data={[
          organizationSchema(site.name, base, site.tagline),
          websiteSchema(site.name, base),
        ]}
      />
      <Home site={site} articles={articles} />
    </>
  );
}
