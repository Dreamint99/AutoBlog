import "@/sites/infkey/theme.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getModels, latestVerified } from "@/lib/models";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { PageHead, ModelTable } from "@/sites/infkey/data-ui";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

const POPULAR: ReadonlyArray<[string, string]> = [
  ["gpt-4o", "claude-3-5-sonnet"],
  ["gemini-1-5-pro", "gpt-4o"],
  ["deepseek-v3", "gpt-4o-mini"],
  ["claude-3-5-sonnet", "gemini-1-5-pro"],
  ["gpt-4o-mini", "gemini-1-5-flash"],
  ["claude-3-5-haiku", "gpt-4o-mini"],
];

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
    openGraph: {
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
  const byId = new Map(models.map((m) => [m.id, m]));
  const verified = latestVerified(models);
  const b = `/s/${site.id}`;

  const pairs = POPULAR.filter(([a, c]) => byId.has(a) && byId.has(c));
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
            {pairs.map(([a, c]) => (
              <Link className="vs-link" href={`${b}/compare/${a}-vs-${c}`} key={`${a}-${c}`}>
                {byId.get(a)!.name} <span className="vs">vs</span> {byId.get(c)!.name}
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <div className="section-head">
        <h2>Full pricing matrix</h2>
        <span className="rule" />
        <span className="count">{String(models.length).padStart(2, "0")} models</span>
      </div>
      <ModelTable site={site} models={models} />
      <p className="src-note">
        Tip: open any model to see full specs, or build a direct two-way comparison at{" "}
        <code>/compare/&lt;model-a&gt;-vs-&lt;model-b&gt;</code>.
      </p>
      </InfShell>
    </>
  );
}
