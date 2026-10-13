import { publicPath } from "@/lib/site-context";
import { notFound, permanentRedirect } from "next/navigation";
import { isVcArticle, vcFor } from "@/sites/walvi/visacheck/data";
import type { Metadata } from "next";
import { getSite, getArticle, getArticles, getRedirect } from "@/lib/data";
import { processBody } from "@/lib/article";
import { SITE_COMPONENTS } from "@/sites/registry";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Sister sites that cover the same subjects (see the network-links note below).
const NETWORK: Record<string, string[]> = {
  gccguide: ["walvi"],
  walvi: ["gccguide"],
  countly: ["infkey"],
  infkey: ["countly"],
};

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

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

// Descriptions must read as finished sentences. A word-boundary cut left text
// like "…and FAQs – all", which Google ignores in favour of page text (it was
// quoting the footer disclaimer instead). Prefer ending on the last full
// sentence; otherwise cut on a word and mark it with an ellipsis.
function clampSentence(s: string, max: number): string {
  if (!s) return s;
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (end >= 70) return cut.slice(0, end + 1);
  return clamp(t, max - 1) + "…";
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
  const description = clampSentence(article.meta_description || article.excerpt || "", 158);
  // VisaPoint feature images picked from Wikipedia are often wrong (club crests, a
  // 1941 flag) — never put them in share previews.
  // Fallback: the site's branded 1200×630 card, so every share has a preview image.
  const shareImg =
    (site.id === "walvi" && /wikimedia\.org|wikipedia\.org/i.test(article.image_url || "") ? "" : article.image_url) ||
    `/og/${site.id}.png`;
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
      images: [shareImg],
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
  if (!article) {
    const to = await getRedirect(id, slug);
    if (to) permanentRedirect(publicPath(site.id, `/${to}`));
    notFound();
  }
  // VisaPoint "Visa Check" guides live on their country page (/visa-check/<country>)
  // so each country has ONE ranking URL — the old article URL redirects there.
  if (site.id === "walvi" && isVcArticle(article)) {
    const vc = vcFor(article);
    if (vc) permanentRedirect(publicPath(site.id, `/visa-check/${vc.slug}`));
  }
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

  // Network reading links: up to two clearly related articles from a sister site
  // on the same subject, appended to the article body as editorial "also read"
  // links. Kept small and topic-gated on purpose — blanket cross-linking between
  // sites one owns is a Google link-scheme signal; relevant links help readers.
  const sisters = NETWORK[site.id] || [];
  // Words every visa/data title shares ("complete", "visa", "work"...) say nothing
  // about the subject; a link needs three real topic words in common.
  const GENERIC = new Set(
    "complete essential step steps fast quick tips easy free full check status apply application requirements cost costs fees price prices visa visas work permit how what your know need".split(" ")
  );
  const topic = new Set([...cur].filter((w) => !GENERIC.has(w)));
  const networkLinks: { title: string; url: string; site: string; s: number }[] = [];
  for (const sid of sisters) {
    const sister = getSite(sid);
    if (!sister) continue;
    for (const a of await getArticles(sid)) {
      const t = toks(a);
      let s = 0;
      t.forEach((w) => {
        if (topic.has(w)) s += 1;
      });
      if (s >= 3) networkLinks.push({ title: a.title, url: `https://${sister.domain}/${a.slug}`, site: sister.name, s });
    }
  }
  networkLinks.sort((x, y) => y.s - x.s);
  const netHtml = networkLinks.length
    ? `<aside class="net-read" style="margin:28px 0 8px;padding:14px 16px;border-left:3px solid currentColor;opacity:.95"><strong>Also worth reading</strong><ul style="margin:8px 0 0;padding-left:18px">` +
      networkLinks
        .slice(0, 2)
        .map((l) => `<li><a href="${esc(l.url)}">${esc(l.title)}</a> <small>(${esc(l.site)})</small></li>`)
        .join("") +
      `</ul></aside>`
    : "";

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
      <Article site={site} article={article} related={related} bodyHtml={html + netHtml} toc={toc} popular={popular} />
    </>
  );
}
