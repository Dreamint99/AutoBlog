import { defaultOgImages } from "@/lib/og";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import Today, { TODAY_API, type TodayFeed } from "@/sites/ninetymins/Today";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") return {};
  const title = `Today's Matches: Live Scores, Kick-off Times & Where to Watch | ${site.name}`;
  const description =
    "Every match today in football, cricket, basketball, tennis, UFC, NFL and more — kick-off times in your time zone, live scores, venues and where to watch free and legally.";
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/today" },
    openGraph: { images: defaultOgImages(), title, description, type: "website", url: "/today" },
  };
}

async function feed(): Promise<TodayFeed | null> {
  try {
    const r = await fetch(TODAY_API, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as TodayFeed;
    return Array.isArray(j?.items) ? j : null;
  } catch {
    return null;
  }
}

export default async function TodayPage({ params }: P) {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") notFound();
  const base = siteBaseUrl(site);
  const initial = await feed();
  const live = initial?.items.filter((e) => e.state === "in").length || 0;

  return (
    <Shell site={site}>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: `${base}/` }, { name: "Today's matches", url: `${base}/today` }])} />
      <section className="nm-hub nm-hub-today">
        <div className="nm-wrap">
          <span className="nm-hub-sport">
            <i className="nm-dot" /> {live ? `${live} live now` : "Every sport · today"}
          </span>
          <h1>Today’s Matches</h1>
          <p>Every match in every sport today, in your own time — live scores, venues and where to watch. Updates by itself.</p>
        </div>
      </section>
      <div className="nm-wrap nm-td-wrap">
        <Today initial={initial} />
      </div>
    </Shell>
  );
}
