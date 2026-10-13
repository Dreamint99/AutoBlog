import type { MetadataRoute } from "next";
import { activeSite } from "@/lib/site-context";
import { siteBaseUrl } from "@/lib/sites.config";

export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl(activeSite());
  return {
    rules: [
      // Search + AI-answer crawlers explicitly welcomed (OAI-SearchBot = ChatGPT search).
      { userAgent: "*", allow: "/" },
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: ["GPTBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "YandexBot", "DuckDuckBot"], allow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
