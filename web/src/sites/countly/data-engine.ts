import "server-only";
import { cache } from "react";
import { d1 } from "@/lib/data";
export interface Observation { year: number; value: number }
export interface DataRow extends Observation { country: string; countryCode: string; slug: string }
export interface Dataset {
  metric: string; indicator: string; label: string; unit: string; description: string;
  country?: string; countryCode?: string; countrySlug?: string; history?: Observation[];
  year?: number; rows?: DataRow[]; coverage?: number; methodology?: string;
  analysis?: string;
  source: string; apiSource?: string; sourceUpdated: string;
}
export interface DataPage { kind: string; slug: string; title: string; lastmod: string; body: string; data: Dataset }
export const getDataPage = cache(async (kind: string, slug: string): Promise<DataPage | null> => {
  const db = d1(); if (!db) return null;
  const r = (await db.prepare("SELECT kind,slug,title,body,lastmod FROM seo_pages WHERE site_id='countly' AND kind=? AND slug=?").bind(kind, slug).all<Omit<DataPage, "data">>()).results[0];
  return r ? { ...r, data: JSON.parse(r.body) } : null;
});
export const dataIndex = cache(async () => {
  const db = d1(); if (!db) return [];
  return (await db.prepare("SELECT kind,slug,title,lastmod FROM seo_pages WHERE site_id='countly' ORDER BY kind,title").all<Pick<DataPage, "kind" | "slug" | "title" | "lastmod">>()).results;
});
export const metricNames = ["population", "gdp-per-capita", "gdp-growth"];
export const metricLabels: Record<string, string> = { population: "Population", "gdp-per-capita": "GDP per capita", "gdp-growth": "Real GDP growth" };
export async function comparisonLinks() {
  const pages = (await dataIndex()).filter(p => p.kind === "population");
  return [["usa", "chn"], ["ind", "chn"], ["gbr", "usa"], ["deu", "fra"], ["can", "usa"], ["aus", "nzl"]].flatMap(([a, b]) => {
    const pa = pages.find(p => p.slug.endsWith("-" + a)), pb = pages.find(p => p.slug.endsWith("-" + b));
    return pa && pb ? [{ path: `/data/compare/${[pa.slug, pb.slug].sort().join("-vs-")}`, title: `${pa.title.split(" population:")[0]} vs ${pb.title.split(" population:")[0]}` }] : [];
  });
}
export const formatNumber = (value: number, unit: string) => `${unit === "current US$" ? "$" : ""}${new Intl.NumberFormat("en-US", { maximumFractionDigits: unit === "people" ? 0 : 2 }).format(value)}${unit === "%" ? "%" : ""}`;
export const datasetSchema = (page: DataPage) => ({ "@context": "https://schema.org", "@type": "Dataset", name: page.title, description: page.data.description, url: `https://countly.net/data/${page.kind}/${page.slug}`, dateModified: page.lastmod, creator: { "@type": "Organization", name: "World Bank" }, publisher: { "@type": "Organization", name: "Countly", url: "https://countly.net/" }, isBasedOn: page.data.source, ...(page.data.year ? { temporalCoverage: String(page.data.year) } : {}) });
