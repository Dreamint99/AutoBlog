import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import { sitePrefix } from "@/lib/public-path";
import { HUBS } from "@/sites/ninetymins/events/catalog";

export const dynamic = "force-static";

type P = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") return {};
  const title = `Upcoming competitions — schedules that are actually confirmed`;
  const description = "IPL 2027, ILT20, the 2027 ODI World Cup, BBL, SA20, PSL and the Champions League knockout dates. Only organizer-published facts, with live scores from the existing board.";
  return {
    title: `${title} | ${site.name}`,
    description,
    alternates: { canonical: "/event" },
    robots: { index: true, follow: true },
    openGraph: { title, description, url: "/event", images: [{ url: "/og/ninetymins.png", width: 1200, height: 630 }] },
  };
}

export default async function EventIndex({ params }: P) {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") notFound();
  const base = siteBaseUrl(site).replace(/\/$/, "");
  const s = sitePrefix(site.id);
  return (
    <Shell site={site}>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: `${base}/` }, { name: "Events", url: `${base}/event` }])} />
      <div className="nm-wrap nv-pagehead">
        <h1>Upcoming competitions</h1>
        <p>A short set of hubs. Each one keeps a confirmed date, a gap, and a number we calculated. Nothing here is a match-by-country page.</p>
      </div>
      <ul className="nm-wrap nv-tiles nv-ev-index">
        {HUBS.map((h) => (
          <li key={h.slug}>
            <Link href={`${s}/event/${h.slug}`}>
              <b>{h.h1}</b>
              <small>{h.window}</small>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
