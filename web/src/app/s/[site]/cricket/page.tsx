import { defaultOgImages } from "@/lib/og";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import Link from "next/link";
import { Shell } from "@/sites/ninetymins/Chrome";
import { Livescore, type LsEvent } from "@/sites/ninetymins/Livescore";
import { getScores } from "@/sites/ninetymins/live";
import { HUBS } from "@/sites/ninetymins/events/catalog";
import { sitePrefix } from "@/lib/public-path";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") return {};
  const title = `Live Cricket Scores Today — Tests, ODIs, T20s & Leagues | ${site.name}`;
  const description = "Live cricket scores and today's matches: internationals, T20 leagues and domestic cricket, updated automatically, with match pages for every game.";
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/cricket" },
    openGraph: { images: defaultOgImages(), title, description, type: "website", url: "/cricket" },
  };
}

export default async function CricketPage({ params }: P) {
  const site = getSite((await params).site);
  if (!site || site.id !== "ninetymins") notFound();
  const base = siteBaseUrl(site);
  const s = sitePrefix(site.id);
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let initial: LsEvent[] = [];
  try {
    initial = (await getScores("cricket")) as LsEvent[];
  } catch {}

  return (
    <Shell site={site}>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: `${base}/` }, { name: "Live cricket", url: `${base}/cricket` }])} />
      <div className="lv-page">
        <div className="nm-wrap lv-top">
          <h1>
            Live cricket <span>· today&apos;s matches, updated live</span>
          </h1>
        </div>
        <div className="nm-wrap">
          <Livescore initial={initial} day={day} sport="cricket" />
        </div>
        <section className="nm-wrap nv-sec" aria-labelledby="nv-cr-ev">
          <div className="nv-sec-head">
            <h2 id="nv-cr-ev">Competitions ahead</h2>
            <Link href={`${s}/event`}>All hubs</Link>
          </div>
          <ul className="nv-tiles">
            {HUBS.filter((h) => h.sport === "cricket").map((h) => (
              <li key={h.slug}>
                <Link href={`${s}/event/${h.slug}`}>
                  <b>{h.h1}</b>
                  <small>{h.window}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
