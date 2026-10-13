import { getArticles } from "@/lib/data";
import { activeSite } from "@/lib/site-context";
import { siteBaseUrl } from "@/lib/sites.config";

export const dynamic = "force-dynamic";

// llms.txt (llmstxt.org): a plain map of the site for AI answer engines.
export async function GET() {
  const site = activeSite();
  const base = siteBaseUrl(site);
  const articles = await getArticles(site.id);
  const line = (a: (typeof articles)[number]) =>
    `- [${a.title}](${base}/${a.slug})${a.meta_description || a.excerpt ? `: ${(a.meta_description || a.excerpt).replace(/\s+/g, " ").trim()}` : ""}`;
  const body = `# ${site.name}

> ${site.tagline}. ${site.niche}. Audience: ${site.audience}.

## Articles
${articles.map(line).join("\n")}

## Optional
- [Sitemap](${base}/sitemap.xml)
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
