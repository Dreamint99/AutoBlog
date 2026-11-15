import { d1 } from "@/lib/data";
import type { Fixture } from "./engine";
import Insights, { type Insight } from "./Insights";
import { YouTube } from "./Video";
import WatchBox from "./Watch";
import { HlGrid } from "./HighlightsList";
import { highlightsForMatch } from "./highlights";
import { getSite } from "@/lib/data";

async function json<T>(url: string): Promise<T | null> { try { const r = await fetch(url, { signal: AbortSignal.timeout(3500), next: { revalidate: 300 } }); return r.ok ? await r.json() as T : null; } catch { return null; } }

export default async function MatchContext({ fixture }: { fixture: Fixture }) {
  const e = fixture.ev;
  const site = getSite("ninetymins")!;
  // insights.ts keys leagues the ESPN way (eng.1); seo_matches stores the URL form (eng-1) — the key has the original.
  const league = fixture.key.split(":")[1] || e.league;
  // Pre-match model only (deterministic, no LLM). The R2 copy is readable from here; api.ninetymins.com is not (same zone).
  const wantInsights = e.state === "pre" && e.sport === "football";
  const [cached, highlights] = await Promise.all([
    wantInsights ? json<{ items: Insight[] }>(`https://feed.ninetymins.com/v1/insights/football/${league}/${e.id}.json`) : null,
    highlightsForMatch(e.sport, league, e.id),
  ]);
  const db = d1();
  const record = db ? (await db.prepare("SELECT body FROM seo_match_details WHERE key=?").bind(fixture.key).all<{ body: string }>()).results[0] : null;
  const h2h: { date: string; score: string; result: string }[] = record ? JSON.parse(record.body).h2h || [] : [];
  return <div className="nm-wrap mx-wrap">
    {highlights.length ? <section className="mx-box mx-wide"><h2 className="mx-h">Highlights</h2><YouTube id={highlights[0].id} title={highlights[0].title} thumb={highlights[0].thumb} />{highlights.length > 1 ? <HlGrid site={site} items={highlights.slice(1)} /> : null}</section> : null}
    <WatchBox sport={e.sport} id={e.id} title={`${e.home.name} vs ${e.away.name}`} state={e.state} />
    {wantInsights ? <Insights url={`https://api.ninetymins.com/v1/insights/football/${league}/${e.id}`} initial={cached?.items || null} /> : null}
    {h2h.length > 0 && <section className="mx-box"><h2 className="mx-h">Head to head</h2><table className="mx-table"><thead><tr><th>Date</th><th>Score</th><th>Result</th></tr></thead><tbody>{h2h.map((h, i) => <tr key={i}><td>{h.date}</td><td>{h.score}</td><td>{h.result}</td></tr>)}</tbody></table></section>}
  </div>;
}
