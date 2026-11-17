import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import InfoPage from "@/sites/countly/InfoPage";
import DataChart from "@/sites/countly/DataChart";
import { dataIndex, getDataPage, comparisonLinks, metricNames, metricLabels, formatNumber, datasetSchema } from "@/sites/countly/data-engine";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; path?: string[] }>; searchParams: Promise<{ a?: string; b?: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { site, path = [] } = await params;
  if (site !== "countly") return {};
  const [kind, slug] = path;
  const page = kind && slug && kind !== "compare" && kind !== "embed" ? await getDataPage(kind, slug) : null;
  return { title: page?.title || (kind === "compare" ? "Compare country statistics" : "Country data, rankings & charts"), alternates: { canonical: `/data${path.length ? "/" + path.join("/") : ""}` }, robots: { index: kind !== "embed" && !(kind === "compare" && !slug), follow: true, "max-image-preview": "large" }, openGraph: { images: [{ url: "/og/countly.png", width: 1200, height: 630 }] } };
}
export default async function DataRoute({ params, searchParams }: P) {
  const { site: sid, path = [] } = await params, site = getSite(sid);
  if (site?.id !== "countly" || path.length > 2) notFound();
  const [kind, slug] = path;
  if (kind === "compare") {
    const query = await searchParams;
    if (!slug && query.a && query.b && query.a !== query.b && [query.a, query.b].every(s => /^[a-z0-9-]+$/.test(s))) permanentRedirect(`/data/compare/${[query.a, query.b].sort().join("-vs-")}`);
    if (slug) {
      const [a, b, extra] = slug.split("-vs-"); if (!a || !b || a === b || extra) notFound();
      if (a > b) permanentRedirect(`/data/compare/${b}-vs-${a}`);
      const comparisons = await Promise.all(metricNames.map(async m => {
        const [pa, pb] = await Promise.all([getDataPage(m, a), getDataPage(m, b)]);
        if (!pa?.data.history || !pb?.data.history) return null;
        const h = pa.data.history.find(h => pb.data.history!.some(x => x.year === h.year));
        if (!h) return null;
        return { metric: m, a: pa, b: pb, year: h.year, av: h.value, bv: pb.data.history.find(x => x.year === h.year)!.value };
      }));
      const rows = comparisons.filter((r): r is NonNullable<typeof r> => !!r); if (rows.length < 2) notFound();
      const nameA = rows[0].a.data.country!, nameB = rows[0].b.data.country!;
      return <InfoPage site={site} kicker="Country comparison" title={`${nameA} vs ${nameB}: population & economy`}><p>This comparison uses the latest common observation year for each indicator. No estimates are substituted for missing figures.</p><table><thead><tr><th>Indicator</th><th>Year</th><th>{nameA}</th><th>{nameB}</th></tr></thead><tbody>{rows.map(r => <tr key={r.metric}><th>{metricLabels[r.metric]}</th><td>{r.year}</td><td><a href={`/data/${r.metric}/${a}`}>{formatNumber(r.av, r.a.data.unit)}</a></td><td><a href={`/data/${r.metric}/${b}`}>{formatNumber(r.bv, r.b.data.unit)}</a></td></tr>)}</tbody></table>{rows.map(r => <section key={r.metric}><DataChart title={`${metricLabels[r.metric]} (${r.year})`} rows={[{ label: nameA, value: r.av }, { label: nameB, value: r.bv }]} format={n => formatNumber(n, r.a.data.unit)} /><p><a href={r.a.data.source}>World Bank source</a>. Source updated {r.a.data.sourceUpdated}.</p></section>)}<p><a href="/data">Explore all countries</a></p></InfoPage>;
    }
  }
  if (!kind || kind === "compare" && !slug) {
    const pages = await dataIndex(), countries = pages.filter(p => p.kind === "population");
    const comparisons = await comparisonLinks();
    return <InfoPage site={site} kicker="World Bank data" title="Country statistics, rankings & comparisons"><p>Population, GDP per capita and real GDP growth, with actual observation years, six-year histories, tables, charts and original source links. Countries and economies with sufficient published observations are included; unavailable values are omitted.</p><h2>Original data stories</h2><ul>{pages.filter(p => p.kind === "stories").map(p => <li key={p.slug}><a href={`/data/stories/${p.slug}`}>{p.title}</a></li>)}</ul><h2>Rankings</h2><ul>{pages.filter(p => p.kind === "ranking").map(p => <li key={p.slug}><a href={`/data/ranking/${p.slug}`}>{p.title}</a></li>)}</ul><h2>Compare countries</h2><form action="/data/compare" method="get"><label>First country <select name="a" required>{countries.map(p => <option key={p.slug} value={p.slug}>{p.title.split(" population:")[0]}</option>)}</select></label> <label>Second country <select name="b" required>{countries.map(p => <option key={p.slug} value={p.slug}>{p.title.split(" population:")[0]}</option>)}</select></label> <button type="submit">Compare</button></form><ul>{comparisons.map(c => <li key={c.path}><a href={c.path}>{c.title}</a></li>)}</ul><h2>Countries & economies</h2><ul>{countries.map(p => <li key={p.slug}><a href={`/data/population/${p.slug}`}>{p.title}</a></li>)}</ul></InfoPage>;
  }
  const page = await getDataPage(kind === "embed" ? (/^\d{4}-\d{2}$/.test(slug || "") ? "stories" : "ranking") : kind, slug || ""); if (!page || !slug) notFound();
  const d = page.data, ranking = !!page.data.rows;
  const chartRows = ranking ? (d.rows || []).slice(0, 15).map(r => ({ label: r.country, value: r.value })) : [...(d.history || [])].reverse().map(r => ({ label: String(r.year), value: r.value }));
  if (kind === "embed") return <main style={{ padding: 16, fontFamily: "system-ui" }}><DataChart title={page.title} rows={chartRows} format={n => formatNumber(n, d.unit)} /><p><a href={`https://countly.net/data/${page.kind}/${slug}`} target="_blank" rel="nofollow noopener">Chart by Countly</a> · <a href={d.source}>World Bank source</a></p></main>;
  const latest = d.history?.[0], previous = d.history?.[1];
  const related = ranking ? [] : (await Promise.all(metricNames.filter(m => m !== kind).map(m => getDataPage(m, slug)))).filter((p): p is NonNullable<typeof p> => !!p);
  return <InfoPage site={site} kicker="Sourced country data" title={page.title}>
    <JsonLd data={[datasetSchema(page), breadcrumbSchema([{ name: "Countly", url: "https://countly.net/" }, { name: "Country data", url: "https://countly.net/data" }, { name: page.title, url: `https://countly.net/data/${kind}/${slug}` }])]} />
    <p>{d.analysis || (ranking ? `${d.rows?.[0]?.country} leads the ${d.year} ${d.label.toLowerCase()} ranking with ${formatNumber(d.rows?.[0]?.value || 0, d.unit)}, among ${d.coverage} countries and economies with observations for the same year.` : `${d.country}'s ${d.label.toLowerCase()} was ${formatNumber(latest!.value, d.unit)} in ${latest!.year}, according to the World Bank.`)}</p>
    {ranking ? <table><caption>{d.label} · {d.year} · {d.unit}</caption><thead><tr><th>Rank</th><th>Country / economy</th><th>Value</th><th>Year</th></tr></thead><tbody>{d.rows?.map((r, i) => <tr key={r.countryCode}><td>{i + 1}</td><td><a href={`/data/${d.metric}/${r.slug}`}>{r.country}</a></td><td>{formatNumber(r.value, d.unit)}</td><td>{r.year}</td></tr>)}</tbody></table> : <table><caption>{d.country} · {d.label} · {d.unit}</caption><thead><tr><th>Observation year</th><th>Value</th></tr></thead><tbody>{d.history?.map(h => <tr key={h.year}><td>{h.year}</td><td>{formatNumber(h.value, d.unit)}</td></tr>)}</tbody></table>}
    <DataChart title={page.title} rows={chartRows} format={n => formatNumber(n, d.unit)} />
    <h2>Source & methodology</h2><p>{d.description} {d.methodology || "Latest six available non-null annual observations; figures can be revised by the source. Observation year and retrieval/update dates are different."}</p><p><a href={d.source}>Source: World Bank — {d.indicator}</a>{d.apiSource && <> · <a href={d.apiSource}>Download source observations</a></>}. Source updated {d.sourceUpdated}; this page's data changed {page.lastmod}. No 2026 observation is implied when the latest published year is earlier.</p>
    <h2>Questions answered by the data</h2><h3>What period do these figures describe?</h3><p>{ranking ? `All ranked values describe ${d.year}.` : `The latest observation is for ${latest!.year}; earlier years are shown in the table.`}</p><h3>{ranking ? "Which countries are included?" : `How has ${d.country}'s ${d.label.toLowerCase()} changed?`}</h3><p>{ranking ? d.methodology : previous ? `The value changed from ${formatNumber(previous.value, d.unit)} in ${previous.year} to ${formatNumber(latest!.value, d.unit)} in ${latest!.year}, a difference of ${formatNumber(latest!.value - previous.value, d.unit)}.` : "No earlier observation is available."}</p><h3>Is GDP per capita a salary estimate?</h3><p>No. GDP per capita measures economic output per resident; it is not household income or a salary figure.</p>
    {ranking ? <><h2>Embed this chart</h2><p>Free iframe. Attribution is optional and uses nofollow.</p><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{`<iframe src="https://countly.net/data/embed/${slug}" title="${d.label} ranking" width="100%" height="700" loading="lazy" style="border:0"></iframe>`}</pre><p><a href={`/data/embed/${slug}`}>Preview embed</a> · Cite this data: <a href={`https://countly.net/data/${page.kind}/${slug}`}>{page.title}, Countly</a>, based on World Bank observations.</p></> : <><h2>More data for {d.country}</h2><ul>{related.map(p => <li key={p.kind}><a href={`/data/${p.kind}/${slug}`}>{metricLabels[p.kind]}</a></li>)}</ul><p><a href={`/data/ranking/${kind}`}>Compare the country ranking</a></p></>}
    <p><a href="/data">All country data & comparisons</a></p>
  </InfoPage>;
}
