import "@/sites/infkey/theme.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getModels } from "@/lib/models";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { PageHead, ModelTable } from "@/sites/infkey/data-ui";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { infMeta } from "@/sites/infkey/meta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const site = getSite((await params).site);
  if (!site || site.id !== "infkey") return {};
  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return infMeta(site, `New AI models released this month (${month}) — prices & specs`, "Every new AI model added in the last 30 days, with API price per million tokens, context window and capabilities. Updated daily.", "/new");
}

export default async function NewModelsPage({ params }: { params: Promise<{ site: string }> }) {
  const site = getSite((await params).site);
  if (!site || site.id !== "infkey") notFound();
  const cutoff = Date.now() / 1000 - 30 * 86400;
  const models = (await getModels()).filter((m) => (m.created ?? 0) >= cutoff).sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  const base = siteBaseUrl(site);
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: base }, { name: "New AI models", url: `${base}/new` }])} />
      <InfShell site={site}>
        <PageHead kicker="New this month" title="New AI models (last 30 days)" dek={`${models.length} models were added in the last 30 days. Newest first, with today's API price per 1M tokens.`} />
        <ModelTable site={site} models={models} />
        <p className="src-note">Release dates are the date each model was first listed by public API providers. Updated daily.</p>
      </InfShell>
    </>
  );
}
