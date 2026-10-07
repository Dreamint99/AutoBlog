import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/data";
import { getModels } from "@/lib/models";
import { COUNTRIES, JOBS, DATA_VERIFIED } from "@/lib/walvi";
import { CN_CATEGORIES } from "@/sites/countly/categories";
import { NM_COMPS } from "@/sites/ninetymins/comps";
import { getScores, matchPath } from "@/sites/ninetymins/live";
import { activeSite } from "@/lib/site-context";
import { getPassports } from "@/lib/passports";
import { VC, isVcArticle, vcFor } from "@/sites/walvi/visacheck/data";
import { siteBaseUrl } from "@/lib/sites.config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = activeSite();
  const base = siteBaseUrl(site);
  // VisaPoint Visa Check guides redirect to /visa-check/<country> — list that URL instead.
  const articles = (await getArticles(site.id)).filter((a) => !(site.id === "walvi" && isVcArticle(a) && vcFor(a)));

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
    entries.push({ url: `${base}/best-ai-tools`, changeFrequency: "daily", priority: 0.9 });
    entries.push({ url: `${base}/visit-bangladesh`, changeFrequency: "weekly", priority: 0.9 });
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

  // NinetyMins: competition hubs + the legal/info pages.
  if (site.id === "ninetymins") {
    entries.push({ url: `${base}/scores`, changeFrequency: "hourly", priority: 0.9 });
    // Current fixtures' match centres (ESPN's live window) — fresh, rich pages.
    const evs = (await Promise.all(["eng.1", "uefa.champions", "esp.1", "ita.1", "ger.1", "ind.1", "fifa.worldq.afc"].map((l) => getScores(l)))).flat();
    for (const e of evs) {
      if (e.home && e.away) {
        entries.push({ url: `${base}${matchPath(e.league, e.id, e.home.name, e.away.name)}`, changeFrequency: "hourly", priority: 0.6 });
      }
    }
    for (const c of NM_COMPS) {
      entries.push({ url: `${base}/topic/${c.slug}`, changeFrequency: "daily", priority: 0.8 });
    }
    for (const p of ["about", "contact", "privacy", "terms", "disclaimer"]) {
      entries.push({ url: `${base}/${p}`, changeFrequency: "yearly", priority: 0.2 });
    }
  }

  // VisaPoint Passport Index: index, checker and one page per passport.
  if (site.id === "walvi") {
    entries.push(
      { url: `${base}/passport-index`, changeFrequency: "weekly", priority: 1 },
      { url: `${base}/visa-checker`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${base}/visa-check`, changeFrequency: "weekly", priority: 1 },
    );
    for (const e of VC) entries.push({ url: `${base}/visa-check/${e.slug}`, changeFrequency: "weekly", priority: 0.9 });
    for (const p of await getPassports()) {
      entries.push({ url: `${base}/passport/${p.slug}`, changeFrequency: "weekly", priority: 0.7 });
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
