import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { defaultOgImages } from "@/lib/og";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import HighlightsList from "@/sites/ninetymins/HighlightsList";
import { listHighlights, countHighlights } from "@/sites/ninetymins/highlights";

export const dynamic = "force-dynamic";
const PER = 48;

type P = { params: Promise<{ site: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") return {};
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const title = `Highlights Today: Football, Cricket, NBA & More — Official Videos | ${site.name}`;
  const description = "Watch today's official highlights — goals, wickets, dunks and full match recaps from league, board and broadcaster channels. Updated within minutes.";
  return {
    title: page > 1 ? `${title} — page ${page}` : title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: page > 1 ? `/highlights?page=${page}` : "/highlights" },
    openGraph: { images: defaultOgImages(), title, description, type: "website", url: "/highlights" },
  };
}

export default async function Page({ params, searchParams }: P) {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [items, total] = await Promise.all([listHighlights("", PER, (page - 1) * PER), countHighlights("")]);
  const base = siteBaseUrl(site);
  return (
    <Shell site={site}>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: `${base}/` }, { name: "Highlights", url: `${base}/highlights` }])} />
      <HighlightsList site={site} sport="" items={items} page={page} pages={Math.max(1, Math.ceil(total / PER))} total={total} />
    </Shell>
  );
}
