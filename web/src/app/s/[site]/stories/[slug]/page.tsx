import { notFound } from "next/navigation";
import { getSite, d1 } from "@/lib/data";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import DataChart from "@/sites/countly/DataChart";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; slug: string }> };
async function load(slug: string) { const db = d1(); if (!db) return null; return (await db.prepare("SELECT title,body,lastmod FROM seo_pages WHERE site_id='ninetymins' AND kind='stories' AND slug=?").bind(slug).all<{ title: string; body: string; lastmod: string }>()).results[0] || null; }
export async function generateMetadata({ params }: P) { const { site, slug } = await params; const r = site === "ninetymins" ? await load(slug) : null; return { title: r?.title || "Data story unavailable", alternates: { canonical: `/stories/${slug}` }, robots: { index: !!r, follow: true }, openGraph: { images: [{ url: "/og/ninetymins.png", width: 1200, height: 630 }] } }; }
export default async function Story({ params }: P) {
  const { site: sid, slug } = await params, site = getSite(sid); if (site?.id !== "ninetymins") notFound();
  const row = await load(slug); if (!row) notFound();
  const d = JSON.parse(row.body) as { analysis: string; rows: { label: string; value: number; matches: number; goals: number; league: string }[]; methodology: string; source: string };
  const url = `https://ninetymins.com/stories/${slug}`;
  return <Shell site={site}><main className="nm-wrap nm-engine"><h1>{row.title}</h1><p>{d.analysis}</p><JsonLd data={[{ "@context": "https://schema.org", "@type": "Dataset", name: row.title, description: d.analysis, creator: { "@type": "Organization", name: "NinetyMins" }, url, dateModified: row.lastmod, isBasedOn: d.source }, breadcrumbSchema([{ name: "NinetyMins", url: "https://ninetymins.com/" }, { name: row.title, url }])]} /><table className="nm-fixtures"><thead><tr><th>Competition</th><th>Recorded matches</th><th>Goals</th><th>Goals per recorded match</th></tr></thead><tbody>{d.rows.map(r => <tr key={r.league}><th><a href={`/league/${r.league}`}>{r.label}</a></th><td>{r.matches}</td><td>{r.goals}</td><td>{r.value.toFixed(2)}</td></tr>)}</tbody></table><DataChart title={row.title} rows={d.rows} format={n => n.toFixed(2)} /><h2>Methodology</h2><p>{d.methodology}</p><p><a href={d.source}>Source: ESPN</a> · Data changed {row.lastmod}. NinetyMins calculated the averages.</p><h2>Embed this chart</h2><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{`<iframe src="https://ninetymins.com/embed/story/${slug}" title="Recorded goals per match" width="100%" height="600" loading="lazy" style="border:0"></iframe>`}</pre></main></Shell>;
}
