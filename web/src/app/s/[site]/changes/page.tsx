import "@/sites/infkey/theme.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getChangeDays } from "@/lib/models";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import ChangesView from "@/sites/infkey/Changes";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { infMeta } from "@/sites/infkey/meta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const site = getSite((await params).site);
  if (!site || site.id !== "infkey") return {};
  return infMeta(site, "AI API price changes today — price drops, increases & new models", "Which AI models got cheaper or more expensive today, and which new models were added. Updated daily from public API prices for 400+ models.", "/changes");
}

export default async function ChangesToday({ params }: { params: Promise<{ site: string }> }) {
  const site = getSite((await params).site);
  if (!site || site.id !== "infkey") notFound();
  const day = (await getChangeDays())[0];
  if (!day) notFound();
  const base = siteBaseUrl(site);
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: base }, { name: "AI price changes", url: `${base}/changes` }])} />
      <InfShell site={site}>
        <ChangesView site={site} day={day} />
      </InfShell>
    </>
  );
}
