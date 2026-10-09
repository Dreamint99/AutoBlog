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
    openGraph: { title: site.name, description: site.tagline, type: "website", url: "/", images: [{ url: `/og/${site.id}.png`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [`/og/${site.id}.png`] },
  };
  const HOME: Record<string, { title: string; description: string }> = {
    infkey: {
      title: "InfKey — Best AI Tools, Viral Prompts & How to Use AI Free",
      description:
        "Find the best AI for your job, copy viral photo and video prompts, learn to use ChatGPT, Claude and Gemini free, and compare real AI prices — tested, updated daily.",
    },
    ninetymins: {
      title: "NinetyMins — Live Scores, Fixtures & How to Watch Today",
      description:
        "Live football and cricket scores, today's fixtures and kick-off times in your timezone, plus where to watch the Premier League, Champions League, IPL, NBA and F1 legally.",
    },
    countly: {
      title: "Countly — World Statistics, Rankings & Data, by the Numbers",
      description:
        "Up-to-date statistics and rankings: social media users by country, richest people, AI usage, the biggest companies and more — sourced, dated and easy to compare.",
    },
  };
  if (HOME[site.id]) {
    const h = HOME[site.id];
    meta.title = h.title;
    meta.description = h.description;
    meta.openGraph = { ...meta.openGraph, title: h.title, description: h.description, siteName: site.name };
  }
  // VisaPoint: the tagline alone (52 chars) was the whole meta description.
  if (site.id === "walvi") {
    const title = "VisaPoint — Visa Check, Passport Index & Work Permits Worldwide";
    const description =
      "Check if you need a visa, check your visa status online, see how strong your passport is, and follow official work-permit routes with real salaries — free and independent.";
    meta.title = title;
    meta.description = description;
    meta.openGraph = { title, description, type: "website", url: "/", siteName: "VisaPoint", images: [{ url: "/og/walvi.png", width: 1200, height: 630 }] };
    meta.twitter = { card: "summary_large_image", title, description, images: ["/og/walvi.png"] };
  }
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
