export const METRICS = {
  population: { indicator: "SP.POP.TOTL", label: "Population", unit: "people", description: "Total resident population, World Bank World Development Indicators." },
  "gdp-per-capita": { indicator: "NY.GDP.PCAP.CD", label: "GDP per capita", unit: "current US$", description: "Gross domestic product divided by midyear population, in current US dollars; not a measure of individual income." },
  "gdp-growth": { indicator: "NY.GDP.MKTP.KD.ZG", label: "Real GDP growth", unit: "%", description: "Annual percentage growth of GDP at market prices based on constant local currency." },
};
export const slugify = s => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value))))].map(x => x.toString(16).padStart(2, "0")).join("");
}
export function buildPages(countries, series) {
  const real = new Map(countries.filter(c => c.region?.id !== "NA" && c.region?.value !== "Aggregates" && c.id?.length === 3).map(c => [c.id, c]));
  const pages = [];
  for (const [metric, def] of Object.entries(METRICS)) {
    const response = series[metric]; if (!response?.[1]?.length) throw new Error(`No ${metric} observations`);
    const grouped = new Map();
    for (const r of response[1]) {
      if (!real.has(r.countryiso3code) || typeof r.value !== "number" || !Number.isFinite(r.value) || !/^\d{4}$/.test(r.date)) continue;
      if (metric !== "gdp-growth" && r.value < 0) continue;
      const entries = grouped.get(r.countryiso3code) || [];
      entries.push({ year: Number(r.date), value: r.value }); grouped.set(r.countryiso3code, entries);
    }
    const latest = [];
    for (const [code, records] of grouped) {
      const history = [...new Map(records.map(r => [r.year, r])).values()].sort((a, b) => b.year - a.year).slice(0, 6);
      // A number on its own is too thin for a generated country page.
      if (history.length < 3) continue;
      const c = real.get(code), slug = `${slugify(c.name)}-${code.toLowerCase()}`;
      const body = { metric, ...def, country: c.name, countryCode: code, countrySlug: slug, history, source: `https://data.worldbank.org/indicator/${def.indicator}`, apiSource: `https://api.worldbank.org/v2/country/${code}/indicator/${def.indicator}?format=json&mrnev=6`, sourceUpdated: response[0].lastupdated };
      pages.push({ kind: metric, slug, title: `${c.name} ${def.label.toLowerCase()}: ${history[0].year} data & trend`, body });
      latest.push({ country: c.name, countryCode: code, slug, history });
    }
    const years = [...new Set(latest.flatMap(c => c.history.map(h => h.year)))].sort((a, b) => b - a);
    // Rankings use the same observation year for every economy; no mixed-year league tables.
    const year = years.find(y => latest.filter(c => c.history.some(h => h.year === y)).length >= 50);
    if (!year) continue;
    const rows = latest.flatMap(c => { const h = c.history.find(h => h.year === year); return h ? [{ country: c.country, countryCode: c.countryCode, slug: c.slug, year, value: h.value }] : []; }).sort((a, b) => b.value - a.value || a.country.localeCompare(b.country));
    pages.push({ kind: "ranking", slug: metric, title: `${def.label} by country: ${year} ranking`, body: { metric, ...def, year, rows, coverage: rows.length, source: `https://data.worldbank.org/indicator/${def.indicator}`, sourceUpdated: response[0].lastupdated, methodology: `Countries and economies with available ${year} observations; World Bank regional/income aggregates excluded. Missing observations are omitted, never estimated.` } });
  }
  return pages;
}
