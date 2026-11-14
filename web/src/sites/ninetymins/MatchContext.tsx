import { d1 } from "@/lib/data";
import type { Fixture } from "./engine";
interface Insight { kind: string; title: string; home?: number; draw?: number; away?: number; labels?: string[]; items?: string[] }
async function json<T>(url: string): Promise<T | null> { try { const r = await fetch(url, { signal: AbortSignal.timeout(3500), next: { revalidate: 300 } }); return r.ok ? await r.json() as T : null; } catch { return null; } }
export default async function MatchContext({ fixture }: { fixture: Fixture }) {
  const e = fixture.ev;
  const [today, preview] = await Promise.all([
    json<{ items: { id: string; sport: string; watch: { tv: string[]; stream?: { id: string; kind: string; url?: string; channel: string } } }[] }>("https://feed.ninetymins.com/v1/today.json"),
    // Never call the post-match AI summary path. This pre-match endpoint uses
    // the existing deterministic form-based probability model and no LLM.
    e.state === "pre" && e.sport === "football" ? json<{ items: Insight[] }>(`https://api.ninetymins.com/v1/insights/football/${e.league}/${e.id}`) : null,
  ]);
  const watch = today?.items.find(x => x.id === e.id && x.sport === e.sport)?.watch;
  const db = d1();
  const record = db ? (await db.prepare("SELECT body FROM seo_match_details WHERE key=?").bind(fixture.key).all<{ body: string }>()).results[0] : null;
  const h2h: { date: string; score: string; result: string }[] = record ? JSON.parse(record.body).h2h || [] : [];
  const stream = watch?.stream;
  const streamUrl = stream?.kind === "youtube" && /^[\w-]{11}$/.test(stream.id) ? `https://www.youtube.com/watch?v=${stream.id}` : stream?.url?.startsWith("https://") ? stream.url : null;
  return <section className="nm-wrap nm-engine">
    {(watch?.tv.length || streamUrl) ? <><h2>Where to watch legally</h2>{watch?.tv.length ? <p>Source-listed broadcasters: {watch.tv.join(", ")}. Rights and availability vary by territory; check the broadcaster's schedule.</p> : null}{streamUrl && <p><a href={streamUrl} rel="noopener" target="_blank">Official stream: {stream?.channel}</a> (regional availability may apply).</p>}</> : null}
    {preview?.items.map((item, i) => <section key={i}><h2>{item.title}</h2>{item.kind === "facts" && <ul>{item.items?.map((s, i) => <li key={i}>{s}</li>)}</ul>}{item.kind === "prob" && <><p>Form-based Poisson estimate from the last five games. These are model estimates, not facts about the outcome.</p><table className="nm-fixtures"><thead><tr>{item.labels?.map(l => <th key={l}>{l}</th>)}</tr></thead><tbody><tr>{[item.home, item.draw, item.away].map((p, i) => <td key={i}>{p == null ? "Unavailable" : `${(p * 100).toFixed(1)}%`}</td>)}</tr></tbody></table></>}</section>)}
    {h2h.length > 0 && <><h2>Recorded head-to-head meetings</h2><table className="nm-fixtures"><thead><tr><th>Date</th><th>Score</th><th>Source result</th></tr></thead><tbody>{h2h.map((h, i) => <tr key={i}><td>{h.date}</td><td>{h.score}</td><td>{h.result}</td></tr>)}</tbody></table></>}
    <p>Line-ups appear when officially reported by the data source. Missing data is left out.</p>
  </section>;
}
