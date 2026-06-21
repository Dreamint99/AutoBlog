import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticle, getArticles } from "@/lib/data";
import { processBody } from "@/lib/article";
import { SITE_COMPONENTS } from "@/sites/registry";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}): Promise<Metadata> {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const article = await getArticle(id, slug);
  if (!site || !article) return {};
  return {
    title: article.meta_title || article.title,
    description: article.meta_description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/${slug}` },
    keywords: article.tags,
    openGraph: {
      title: article.title,
      description: article.meta_description,
      type: "article",
      url: `/${slug}`,
      images: article.image_url ? [article.image_url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.meta_description,
      images: article.image_url ? [article.image_url] : [],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}) {
  const { site: id, slug } = await params;
  const site = getSite(id);
  if (!site) notFound();
  const article = await getArticle(id, slug);
  if (!article) notFound();
  const components = SITE_COMPONENTS[site.id];
  if (!components) notFound();

  const { html, toc } = processBody(article.body_html);
  const related = (await getArticles(id)).filter((a) => a.slug !== slug).slice(0, 6);
  const { Article } = components;
  const base = siteBaseUrl(site);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article.schema ?? {}) }}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: site.name, url: base },
          { name: article.title, url: `${base}/${slug}` },
        ])}
      />
      <Article site={site} article={article} related={related} bodyHtml={html} toc={toc} />
    </>
  );
}
