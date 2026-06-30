import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/data";
import { getModels } from "@/lib/models";
import { COUNTRIES, JOBS, DATA_VERIFIED } from "@/lib/walvi";
import { CN_CATEGORIES } from "@/sites/countly/categories";
import { activeSite } from "@/lib/site-context";
import { siteBaseUrl } from "@/lib/sites.config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = activeSite();
  const base = siteBaseUrl(site);
  const articles = await getArticles(site.id);

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    ...articles.map((a) => ({
      url: `${base}/${a.slug}`,
      lastModified: a.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  // InfKey data-product routes: calculators, model database, comparisons.
  if (site.id === "infkey") {
    entries.push(
      { url: `${base}/calculators`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${base}/models`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${base}/compare`, changeFrequency: "weekly", priority: 0.8 },
    );
    const models = await getModels();
    for (const m of models) {
      entries.push({
        url: `${base}/models/${m.id}`,
        lastModified: m.last_verified ?? undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  // Countly: Top 10 hub + topic/category landing pages + free tools.
  if (site.id === "countly") {
    entries.push({ url: `${base}/top10`, changeFrequency: "daily", priority: 0.9 });
    entries.push({ url: `${base}/currency-converter`, changeFrequency: "daily", priority: 0.9 });
    entries.push({ url: `${base}/crypto`, changeFrequency: "hourly", priority: 0.9 });
    entries.push({ url: `${base}/contact`, changeFrequency: "yearly", priority: 0.3 });
    entries.push({ url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 });
    entries.push({ url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 });
    for (const c of CN_CATEGORIES) {
      entries.push({ url: `${base}/topic/${c.slug}`, changeFrequency: "weekly", priority: 0.8 });
    }
  }

  // Walvi data-product routes: country/job register, tools, guides index.
  if (site.id === "walvi") {
    entries.push(
      { url: `${base}/countries`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${base}/jobs`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${base}/tools`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${base}/guides`, changeFrequency: "daily", priority: 0.8 },
    );
    for (const c of COUNTRIES) {
      entries.push({
        url: `${base}/countries/${c.slug}`,
        lastModified: DATA_VERIFIED,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
    for (const j of JOBS) {
      entries.push({
        url: `${base}/jobs/${j.slug}`,
        lastModified: DATA_VERIFIED,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
