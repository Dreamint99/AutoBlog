import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { defaultOgImages } from "@/lib/og";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import LiveTv from "@/sites/ninetymins/LiveTv";
import { loadTvFeed } from "@/sites/ninetymins/tv";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") return {};
  const title = `Live Cricket & Football Streaming Free Today — Official Channels | ${site.name}`;
  const description = "Watch live sport free and legally: official YouTube streams from cricket boards, leagues and broadcasters, plus what's starting next.";
  return { title, description, metadataBase: new URL(siteBaseUrl(site)), alternates: { canonical: "/live-tv" }, openGraph: { images: defaultOgImages(), title, description, url: "/live-tv" } };
}

export default async function Page({ params }: P) {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") notFound();
  const base = siteBaseUrl(site);
  return (
    <Shell site={site}>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: `${base}/` }, { name: "Live TV", url: `${base}/live-tv` }])} />
      <LiveTv initial={await loadTvFeed()} />
    </Shell>
  );
}
