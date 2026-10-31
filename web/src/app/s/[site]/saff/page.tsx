import { defaultOgImages } from "@/lib/og";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import SaffCentre, { SAFF_API, type SaffFeed } from "@/sites/ninetymins/SaffCentre";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") return {};
  const title = `SAFF Championship 2026 Live Score, Fixtures, Table & Squads | ${site.name}`;
  const description =
    "SAFF Championship 2026 live scores from Dhaka, plus fixtures, results, group tables, top scorers and squads for every SAFF tournament — men, women and youth — and Bangladesh football news.";
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/saff" },
    openGraph: { images: defaultOgImages(), title, description, type: "website", url: "/saff" },
  };
}

async function feed(): Promise<SaffFeed | null> {
  try {
    const r = await fetch(SAFF_API, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as SaffFeed;
    return j?.comps ? j : null;
  } catch {
    return null;
  }
}

export default async function SaffPage({ params }: P) {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") notFound();
  const base = siteBaseUrl(site);
  const initial = await feed();
  const live = initial?.live.length || 0;

  return (
    <Shell site={site}>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: `${base}/` }, { name: "SAFF live centre", url: `${base}/saff` }])} />
      <section className="nm-hub nm-hub-saff">
        <div className="nm-wrap">
          <span className="nm-hub-sport">
            <i className="nm-dot" /> {live ? `${live} SAFF match${live > 1 ? "es" : ""} live now` : "SAFF live centre"}
          </span>
          <h1>SAFF Live</h1>
          <p>
            Live scores, fixtures, tables, scorers and squads for every SAFF tournament — updated automatically. History and winners list:{" "}
            <Link href={`/s/${site.id}/topic/saff-championship`}>SAFF Championship hub</Link>.
          </p>
        </div>
      </section>
      <div className="nm-wrap nm-sf-wrap">
        <SaffCentre initial={initial} />
      </div>
    </Shell>
  );
}
