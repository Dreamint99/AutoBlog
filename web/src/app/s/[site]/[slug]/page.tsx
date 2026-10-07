import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticle, getArticles } from "@/lib/data";
import { processBody } from "@/lib/article";
import { SITE_COMPONENTS } from "@/sites/registry";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Keep the <title> and meta description within the lengths search engines
// display (≈60 / ≈158 chars) so Ahrefs/Google don't flag or truncate them.
// Cuts on a word boundary and trims trailing punctuation.
function clamp(s: string, max: number): string {
  if (!s) return s;
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s.,;:–—-]+$/, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}): Promise<Metadata> {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const article = await getArticle(id, slug);
  if (!site || !article) return {};
  const title = clamp(article.meta_title || article.title, 60);
  const description = clamp(article.meta_description || article.excerpt || "", 158);
  // VisaPoint feature images picked from Wikipedia are often wrong (club crests, a
  // 1941 flag) — never put them in share previews.
  const shareImg =
    site.id === "walvi" && /wikimedia\.org|wikipedia\.org/i.test(article.image_url || "") ? "" : article.image_url;
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/${slug}` },
    keywords: article.tags,
    openGraph: {
      title: clamp(article.title, 60),
      description,
      type: "article",
      siteName: site.name,
      url: `/${slug}`,
      images: shareImg ? [shareImg] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: clamp(article.title, 60),
      description,
      images: shareImg ? [shareImg] : [],
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

  // Relevance-ranked related (shared topic words) → more pages/session, lower bounce.
  const all = (await getArticles(id)).filter((a) => a.slug !== slug);
  const STOP = new Set(
    "best top ten list lists 2024 2025 2026 data statistics report rankings ranking world worldwide by country countries most largest update updated guide".split(" ")
  );
  const toks = (a: typeof article) =>
    new Set(
      (`${a.title} ${a.keyword} ${(a.tags || []).join(" ")}`.toLowerCase().match(/[a-z]{4,}/g) || []).filter(
        (w) => !STOP.has(w)
      )
    );
  const cur = toks(article);
  const related = all
    .map((a) => {
      const t = toks(a);
      let s = 0;
      t.forEach((w) => {
        if (cur.has(w)) s += 1;
      });
      return { a, s };
    })
    .sort((x, y) => y.s - x.s)
    .slice(0, 6)
    .map((x) => x.a);

  // Evergreen high-value pages (Countly) to keep visitors exploring.
  const POP = [
    "richest people in the world",
    "cryptocurrencies by market cap",
    "us dollar exchange rates",
    "countries by gdp",
    "countries by population",
  ];
  const popular = POP.map((p) => all.find((a) => a.title.toLowerCase().includes(p)))
    .filter((a): a is typeof article => Boolean(a))
    .slice(0, 5);

  const { Article } = components;
  const base = siteBaseUrl(site);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(article.schema ?? {}, (k, v) =>
            // same rule as the share image: no Wikipedia-picked images in VisaPoint structured data
            site.id === "walvi" && k === "image" && /wikimedia\.org|wikipedia\.org/i.test(JSON.stringify(v)) ? undefined : v,
          ),
        }}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: site.name, url: base },
          { name: article.title, url: `${base}/${slug}` },
        ])}
      />
      <Article site={site} article={article} related={related} bodyHtml={html} toc={toc} popular={popular} />
    </>
  );
}
