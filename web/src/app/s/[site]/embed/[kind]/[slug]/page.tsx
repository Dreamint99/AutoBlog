import { d1 } from "@/lib/data";
import DataChart from "@/sites/countly/DataChart";
import { notFound } from "next/navigation";
import { fixtureById, leagueFixtures } from "@/sites/ninetymins/engine";
import FixtureList from "@/sites/ninetymins/FixtureList";
export const dynamic = "force-dynamic";
// An iframe is a duplicate view. Attribution is optional and marked nofollow
// so syndicated widget placements are not presented as earned editorial links.
export const metadata = { title: "NinetyMins live score widget", robots: { index: false, follow: true } };
export default async function Embed({ params }: { params: Promise<{ site: string; kind: string; slug: string }> }) {
  const { site, kind, slug } = await params;
  if (site !== "ninetymins" || !["match", "league", "story"].includes(kind)) notFound();
  if (kind === "story") {
    const db = d1(); if (!db) notFound();
    const row = (await db.prepare("SELECT title,body FROM seo_pages WHERE site_id='ninetymins' AND kind='stories' AND slug=?").bind(slug).all<{ title: string; body: string }>()).results[0]; if (!row) notFound();
    const data = JSON.parse(row.body) as { rows: { label: string; value: number }[] };
    return <main style={{ padding: 12 }}><DataChart title={row.title} rows={data.rows} format={n => n.toFixed(2)} /><p><a href={`https://ninetymins.com/stories/${slug}`} rel="nofollow noopener" target="_blank">Data by NinetyMins</a> · Partial catalogue sample, source: ESPN</p></main>;
  }
  let fs;
  if (kind === "match") {
    const sep = slug.lastIndexOf("_");
    if (sep < 0) notFound();
    const f = await fixtureById(slug.slice(0, sep), slug.slice(sep + 1));
    fs = f ? [f] : [];
  } else fs = (await leagueFixtures(slug)).filter(f => Date.parse(f.starts) > Date.now() - 2 * 86400000).slice(0, 20);
  if (!fs.length) notFound();
  return <><meta httpEquiv="refresh" content="30" /><main className="nm-engine nm-embed" style={{ padding: 12 }}><h1 style={{ fontSize: 18 }}>Live scores</h1><FixtureList fixtures={fs} compact /><p><a href="https://ninetymins.com/" target="_blank" rel="nofollow noopener">Live scores by NinetyMins</a> · <a href="/widgets" target="_blank" rel="noopener">Get this widget</a></p><p style={{ fontSize: 12 }}>Refreshes every 30 seconds · Source: ESPN · UTC times</p></main></>;
}
