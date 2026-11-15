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
/** Stored titles say "Japan gdp per capita" — the acronym is always "GDP". */
export const fixDataTitle = (t: string) => (t || "").replace(/\bgdp\b/gi, "GDP");
export const getDataPage = cache(async (kind: string, slug: string): Promise<DataPage | null> => {
  const db = d1(); if (!db) return null;
  const r = (await db.prepare("SELECT kind,slug,title,body,lastmod FROM seo_pages WHERE site_id='countly' AND kind=? AND slug=?").bind(kind, slug).all<Omit<DataPage, "data">>()).results[0];
  return r ? { ...r, title: fixDataTitle(r.title), data: JSON.parse(r.body) } : null;
});
export const dataIndex = cache(async () => {
  const db = d1(); if (!db) return [];
  return (await db.prepare("SELECT kind,slug,title,lastmod FROM seo_pages WHERE site_id='countly' ORDER BY kind,title").all<Pick<DataPage, "kind" | "slug" | "title" | "lastmod">>()).results
    .map(r => ({ ...r, title: fixDataTitle(r.title) }));
});
/** Meta description built from the page's own numbers (was empty → the layout's "AutoBlog network"). */
export function dataDescription(page: DataPage): string {
  const d = page.data, fmt = (v: number) => formatNumber(v, d.unit);
  const fit = (s: string) => s.length <= 160 ? s : s.slice(0, 157).replace(/\s+\S*$/, "") + "…";
  if (page.kind === "stories" && d.analysis) return fit(d.analysis);
  if (d.rows?.length) {
    const top = d.rows.slice(0, 3).map(r => `${r.country} (${fmt(r.value)})`).join(", ");
    return fit(`${d.label} by country in ${d.year}: ${top} lead ${d.coverage ?? d.rows.length} economies. Full World Bank ranking.`);
  }
  const [latest, prev] = d.history || [];
  if (d.country && latest) {
    let chg = "";
    if (prev && prev.value) {
      if (d.unit === "%") chg = ` (${prev.year}: ${fmt(prev.value)})`;
      else { const pct = ((latest.value - prev.value) / Math.abs(prev.value)) * 100; chg = `, ${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(1)}% from ${prev.year}`; }
    }
    const first = d.history![d.history!.length - 1];
    return fit(`${d.country}'s ${/^GDP/.test(d.label) ? d.label : d.label.charAt(0).toLowerCase() + d.label.slice(1)} was ${fmt(latest.value)} in ${latest.year}${chg}. World Bank data with the trend since ${first.year}, chart and source.`);
  }
  return fit(d.analysis || d.description || page.title);
}
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
