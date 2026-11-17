import { d1 } from "@/lib/data";
import { JsonLd } from "@/lib/seo";
interface Driver { pos: number; driver: string; country: string }
export interface Race { name: string; date: string; circuit?: string; sessions?: { name: string; date: string; state: string; results: Driver[] }[]; results?: Driver[]; source: string }
export async function races(slug?: string) {
  const db = d1(); if (!db) return [];
  return (await db.prepare(`SELECT slug,title,body,lastmod FROM seo_pages WHERE site_id='ninetymins' AND kind='race'${slug ? " AND slug=?" : ""} ORDER BY slug DESC LIMIT 100`).bind(...(slug ? [slug] : [])).all<{ slug: string; title: string; body: string; lastmod: string }>()).results.map(r => ({ ...r, data: JSON.parse(r.body) as Race }));
}
export default async function F1Hub() {
  const rows = await races();
  return <main className="nm-wrap nm-engine"><h1>Formula 1: race sessions & results</h1><p>{rows.length} Grands Prix with confirmed session or result data from ESPN. Race pages appear when specific data is available.</p><ul>{rows.map(r => <li key={r.slug}><a href={`/race/${r.slug}`}>{r.title}</a> — {r.data.date.slice(0, 10)}</li>)}</ul><JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", itemListElement: rows.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.title, url: `https://ninetymins.com/race/${r.slug}` })) }} /><p><a href="/today">Today's sports</a></p></main>;
}
