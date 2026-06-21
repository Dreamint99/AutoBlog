import "@/sites/infkey/theme.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getModels, latestVerified } from "@/lib/models";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { PageHead, ModelTable } from "@/sites/infkey/data-ui";
import { JsonLd, datasetSchema, breadcrumbSchema } from "@/lib/seo";

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
    title: "AI Model Pricing Database — InfKey",
    description:
      "Verified input/output pricing, context windows and capabilities for every major LLM API, with official sources and last-verified dates.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/models" },
    openGraph: {
      title: "AI Model Pricing Database — InfKey",
      description: "Verified API pricing, context windows and capabilities for every major LLM.",
      type: "website",
      url: "/models",
    },
    twitter: { card: "summary_large_image", title: "AI Model Pricing Database — InfKey" },
  };
}

export default async function ModelsPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "infkey") notFound();

  const models = await getModels();
  const verified = latestVerified(models);
  const base = siteBaseUrl(site);

  return (
    <>
      <JsonLd
        data={[
          datasetSchema({
            name: "InfKey AI Model Pricing Database",
            url: `${base}/models`,
            description:
              "Verified input/output pricing, context windows and capabilities for major LLM APIs, with official sources and last-verified dates.",
            creator: site.name,
            modified: verified,
          }),
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Models", url: `${base}/models` },
          ]),
        ]}
      />
      <InfShell site={site}>
      <PageHead
        kicker="Model database"
        title="AI model pricing database"
        dek="Every model's verified price per million tokens, context window and capabilities — sorted cheapest first, each linking to its official pricing source."
        verified={verified}
      />

      {models.length === 0 ? (
        <div className="empty">
          <div className="empty-mark" aria-hidden="true">
            ▦
          </div>
          <h2>No models loaded</h2>
          <p>The pricing database returned no rows. Check the Supabase connection for this deployment.</p>
        </div>
      ) : (
        <>
          <ModelTable site={site} models={models} />
          <p className="src-note">
            {models.length} models tracked. Prices are USD per 1M tokens, collected from each
            provider&apos;s public pricing page. They exclude taxes, prompt-caching discounts and
            failed-generation retries — confirm with the provider before relying on a figure.
          </p>
        </>
      )}
      </InfShell>
    </>
  );
}
