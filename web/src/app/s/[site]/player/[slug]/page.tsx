import { notFound } from "next/navigation";
import { getSite } from "@/lib/data";
import { Shell } from "@/sites/ninetymins/Chrome";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { players } from "@/sites/ninetymins/engine";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; slug: string }> };
export async function generateMetadata({ params }: P) {
  const { site, slug } = await params;
  const p = site === "ninetymins" ? (await players("path", `/player/${slug}`))[0] : null;
  return { title: p ? `${p.data.name}: player statistics & profile` : "Player not found", alternates: { canonical: `/player/${slug}` }, robots: { index: !!p, follow: true } };
}
export default async function PlayerPage({ params }: P) {
  const { site: sid, slug } = await params, site = getSite(sid);
  if (site?.id !== "ninetymins") notFound();
  const row = (await players("path", `/player/${slug}`))[0]; if (!row) notFound();
  const p = row.data, url = `https://ninetymins.com${row.path}`;
  return <Shell site={site}><main className="nm-wrap nm-engine"><JsonLd data={[{ "@context": "https://schema.org", "@type": "Person", name: p.name, birthDate: p.birthDate, ...(p.nationality ? { nationality: p.nationality } : {}), url }, breadcrumbSchema([{ name: "NinetyMins", url: "https://ninetymins.com/" }, { name: p.name, url }])]} /><h1>{p.name}: profile & statistics</h1><p>{p.name} is a {p.position.toLowerCase()} listed in the {p.team} roster for {p.season || p.league}. The figures below apply to that competition and season.</p>
    <table className="nm-fixtures"><tbody>{[["Born", p.birthDate], ["Nationality", p.nationality], ["Height", p.height], ["Shirt number", p.jersey], ["Position", p.position]].filter(([, v]) => v).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
    <h2>{p.season || p.league} statistics</h2><table className="nm-fixtures"><thead><tr><th>Statistic</th><th>Value</th></tr></thead><tbody>{p.stats.map(s => <tr key={s.key}><th scope="row">{s.label}</th><td>{s.value}</td></tr>)}</tbody></table><p><a href={`/team/${p.teamSlug}`}>{p.team} fixtures</a> · <a href={p.source}>Source: ESPN roster</a>. Data changed {row.lastmod}.</p>
  </main></Shell>;
}
