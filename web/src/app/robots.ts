import type { MetadataRoute } from "next";
import { activeSite } from "@/lib/site-context";
import { siteBaseUrl } from "@/lib/sites.config";

export default function robots(): MetadataRoute.Robots {
  const site = activeSite();
  const base = siteBaseUrl(site);
  return {
    rules: [
      // Search + AI-answer crawlers explicitly welcomed (OAI-SearchBot = ChatGPT search).
      { userAgent: "*", allow: "/" },
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: ["GPTBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "YandexBot", "DuckDuckBot"], allow: "/" },
    ],
    // gccguide publishes an index of seven per-type sitemaps; every other site
    // keeps its single article sitemap.
    sitemap: site.id === "gccguide" ? [`${base}/sitemap-index.xml`] : `${base}/sitemap.xml`,
    host: base,
  };
}
