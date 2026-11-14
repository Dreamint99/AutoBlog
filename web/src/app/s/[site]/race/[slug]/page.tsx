import { notFound } from "next/navigation";
import { getSite } from "@/lib/data";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import { races } from "@/sites/ninetymins/F1Hub";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; slug: string }> };
export async function generateMetadata({ params }: P) { const { site, slug } = await params; const row = site === "ninetymins" ? (await races(slug))[0] : null; return { title: row ? `${row.title}: F1 sessions & results` : "Race not found", alternates: { canonical: `/race/${slug}` }, robots: { index: !!row, follow: true }, openGraph: { images: [{ url: "/og/ninetymins.png", width: 1200, height: 630 }] } }; }
export default async function RacePage({ params }: P) {
  const { site: sid, slug } = await params, site = getSite(sid);
  if (site?.id !== "ninetymins") notFound();
  const row = (await races(slug))[0]; if (!row) notFound();
  const e = row.data, url = `https://ninetymins.com/race/${slug}`;
  const sessions = e.sessions || [{ name: "Race result", date: e.date, state: "post", results: e.results || [] }];
  return <Shell site={site}><main className="nm-wrap nm-engine"><h1>{e.name}: Formula 1 sessions & results</h1><p>{e.name} starts {new Date(e.date).toUTCString()}{e.circuit ? ` at ${e.circuit}` : ""}. Confirmed session times and recorded finishing positions follow.</p>
    <JsonLd data={[{ "@context": "https://schema.org", "@type": "SportsEvent", name: e.name, startDate: e.date, sport: "Formula 1", url, eventStatus: "https://schema.org/EventScheduled", ...(e.circuit ? { location: { "@type": "Place", name: e.circuit } } : {}) }, breadcrumbSchema([{ name: "NinetyMins", url: "https://ninetymins.com/" }, { name: "Formula 1", url: "https://ninetymins.com/league/f1" }, { name: e.name, url }])]} />
    {sessions.map((s, i) => <section key={i}><h2>{s.name}</h2><p>{new Date(s.date).toUTCString()} · {s.state === "post" ? "Finished" : s.state === "in" ? "Live" : "Scheduled"}</p>{s.results.length > 0 && <table className="nm-fixtures"><thead><tr><th>Position</th><th>Driver</th><th>Country</th></tr></thead><tbody>{s.results.map((d, i) => <tr key={i}><td>{d.pos}</td><td>{d.driver}</td><td>{d.country}</td></tr>)}</tbody></table>}</section>)}
    <p><a href={e.source}>Source: ESPN</a> · Data changed {row.lastmod} · <a href="/league/f1">F1 hub</a></p>
  </main></Shell>;
}
