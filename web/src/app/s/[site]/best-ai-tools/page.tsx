import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getAiTools } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, organizationSchema } from "@/lib/seo";
import AiTools, { AI_FAQS } from "@/sites/countly/AiTools";

export const dynamic = "force-dynamic";

const SUPPORTED = new Set(["countly"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>;
}): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) return {};
  const year = new Date().getFullYear();
  const title = `Best AI Tools (${year}) — 140+ ranked by category & live usage | ${site.name}`;
  const description =
    "The best AI tools of 2026, ranked by category: coding, chat, video editing, image generation, writing, agents and more. Live GitHub star counts, daily growth, pricing and links — updated every day.";
  return {
    title,
    description,
    keywords: [
      "best ai tools",
      "ai tools",
      "best ai tools for coding",
      "best ai video editing tools",
      "best ai chatbot",
      "best ai image generator",
      "best ai writing tools",
      "best free ai tools",
      "best ai agents",
      "ai tools directory",
    ],
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/best-ai-tools" },
    openGraph: {
      title,
      description,
      type: "website",
      url: "/best-ai-tools",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BestAiToolsPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();

  const tools = (await getAiTools()).filter((t) => t.url_ok);
  const base = siteBaseUrl(site);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Best AI Tools",
    numberOfItems: tools.length,
    itemListElement: tools.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: t.url,
      name: t.name,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: AI_FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      { "@type": "ListItem", position: 2, name: "Best AI Tools", item: `${base}/best-ai-tools` },
    ],
  };

  return (
    <>
      <JsonLd
        data={[
          organizationSchema(site.name, base, site.tagline),
          itemList,
          faqSchema,
          breadcrumb,
        ]}
      />
      <AiTools site={site} tools={tools} />
    </>
  );
}
