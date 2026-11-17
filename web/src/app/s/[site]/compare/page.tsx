import { defaultOgImages } from "@/lib/og";
import "@/sites/infkey/v2.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getModels, latestVerified } from "@/lib/models";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { PageHead, ModelTable, headliners, pairsOf } from "@/sites/infkey/data-ui";
import TableTools from "@/sites/infkey/TableTools";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { sitePrefix } from "@/lib/public-path";

export const dynamic = "force-dynamic";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>;
}): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "infkey") return {};
  return {
    title: "Compare AI Model API Pricing — InfKey",
    description:
      "Side-by-side AI model comparisons on price, context window and capabilities. Verified pricing, official sources.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/compare" },
    openGraph: { images: defaultOgImages(),
      title: "Compare AI Model API Pricing — InfKey",
      description: "Side-by-side AI model comparisons on price, context and capabilities.",
      type: "website",
      url: "/compare",
    },
    twitter: { card: "summary_large_image", title: "Compare AI Model API Pricing — InfKey" },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "infkey") notFound();

  const models = await getModels();
  const verified = latestVerified(models);
  const b = sitePrefix(site.id);

  // popular head-to-heads: the headline model of each big lab
  const pairs = pairsOf(headliners(models, 6), 15);
  const base = siteBaseUrl(site);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: site.name, url: base },
          { name: "Compare", url: `${base}/compare` },
        ])}
      />
      <InfShell site={site}>
      <PageHead
        kicker="Compare"
        title="Compare AI model API pricing"
        dek="Pick any two models for a side-by-side on price, context and capabilities — or scan the full matrix below."
        verified={verified}
      />

      {pairs.length > 0 ? (
        <>
          <div className="section-head">
            <h2>Popular comparisons</h2>
            <span className="rule" />
          </div>
          <div className="vs-links">
            {pairs.map(([slug, a, c]) => (
              <Link className="vs-link" href={`${b}/compare/${slug}`} key={slug}>
                {a.name} <span className="vs">vs</span> {c.name}
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <div className="section-head">
        <h2>Full pricing matrix</h2>
        <span className="rule" />
      </div>
      <TableTools target="ik-matrix" />
      <ModelTable site={site} models={models} id="ik-matrix" sortable />
      <p className="src-note">
        Tip: open any model to see full specs, or build a direct two-way comparison at{" "}
        <code>/compare/&lt;model-a&gt;-vs-&lt;model-b&gt;</code>.
      </p>
      </InfShell>
    </>
  );
}
