import "@/sites/infkey/theme.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getModels, latestVerified } from "@/lib/models";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { PageHead } from "@/sites/infkey/data-ui";
import CostCalculator, { type CalcModel } from "@/sites/infkey/CostCalculator";
import { JsonLd, webAppSchema, breadcrumbSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

const COMING: ReadonlyArray<{ ico: string; h: string; p: string }> = [
  { ico: "▶", h: "AI video cost calculator", p: "Veo, Kling, Sora — cost per second, audio and retries." },
  { ico: "✉", h: "AI chatbot monthly cost", p: "Tokens per message × volume → monthly support-bot bill." },
  { ico: "◈", h: "RAG & embedding cost", p: "Chunking, embeddings and retrieval calls priced end to end." },
  { ico: "♪", h: "Voice / TTS cost", p: "ElevenLabs, PlayHT and others by characters or audio minutes." },
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
    title: "AI API Cost Calculators — InfKey",
    description:
      "Free interactive calculators for AI API cost: LLM tokens, video, chatbots, RAG and voice. Verified pricing, the math shown.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/calculators" },
    openGraph: {
      title: "AI API Cost Calculators — InfKey",
      description: "Real-workload calculators for LLM, video, chatbot and RAG API cost.",
      type: "website",
      url: "/calculators",
    },
    twitter: { card: "summary_large_image", title: "AI API Cost Calculators — InfKey" },
  };
}

export default async function CalculatorsPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "infkey") notFound();

  const models = await getModels("llm");
  const calcModels: CalcModel[] = models
    .filter((m) => m.input_per_m !== null && m.output_per_m !== null)
    .map((m) => ({
      id: m.id,
      name: m.name,
      vendor: m.provider,
      inPerM: m.input_per_m as number,
      outPerM: m.output_per_m as number,
    }));
  const verified = latestVerified(models);
  const verifiedLabel = verified
    ? new Date(verified).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : undefined;
  const base = siteBaseUrl(site);

  return (
    <>
      <JsonLd
        data={[
          webAppSchema({
            name: "InfKey AI API Cost Calculator",
            url: `${base}/calculators`,
            description:
              "Interactive calculator for AI/LLM API cost from a real workload, with a cheapest-to-priciest model ranking.",
          }),
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Calculators", url: `${base}/calculators` },
          ]),
        ]}
      />
      <InfShell site={site}>
      <PageHead
        kicker="Calculators"
        title="AI API cost calculators"
        dek="Put in a real workload, get a real cost. Every calculator shows the formula and the cheapest suitable model — no black boxes."
        verified={verified}
      />

      <div style={{ margin: "8px 0 36px" }}>
        <CostCalculator models={calcModels} verifiedOn={verifiedLabel} />
      </div>

      <div className="section-head">
        <h2>More calculators</h2>
        <span className="rule" />
        <span className="count">shipping next</span>
      </div>
      <div className="coverage">
        {COMING.map((c) => (
          <div className="cov is-soon" key={c.h}>
            <div className="ico" aria-hidden="true">
              {c.ico}
            </div>
            <h3>{c.h}</h3>
            <p>{c.p}</p>
            <span className="soon-pill">Coming soon</span>
          </div>
        ))}
      </div>
      </InfShell>
    </>
  );
}
