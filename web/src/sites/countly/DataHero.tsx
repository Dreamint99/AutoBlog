import Link from "next/link";
import facts from "@/data/world-facts.json";
import countries from "@/data/world-countries.json";
import { artUri } from "./art";

/* Data-first top of the Countly home: stat tiles, a top-10 bar chart, a size ladder and the
   data hub entry points. Everything comes from the bundled world-facts JSON (no D1 query),
   computed once per isolate. Server component, SVG + CSS only. */

type Fact = { pop: number; area: number };
const F = facts as unknown as Record<string, Fact>;
const NAMES: Record<string, string> = Object.fromEntries(
  ((Array.isArray(countries) ? countries : Object.values(countries)) as Array<{ iso2: string; name: string }>).map((c) => [c.iso2, c.name]),
);
// Countly /data slugs (World Bank naming) for countries that can appear in these charts.
const SLUG: Record<string, string> = {
  IN: "india-ind", CN: "china-chn", US: "united-states-usa", ID: "indonesia-idn", PK: "pakistan-pak", NG: "nigeria-nga",
  BR: "brazil-bra", BD: "bangladesh-bgd", RU: "russian-federation-rus", ET: "ethiopia-eth", MX: "mexico-mex", CA: "canada-can",
  AU: "australia-aus", AR: "argentina-arg", KZ: "kazakhstan-kaz", DZ: "algeria-dza", CD: "congo-dem-rep-cod", SA: "saudi-arabia-sau", SD: "sudan-sdn",
};

const rows = Object.entries(F).filter(([k]) => NAMES[k]);
const byPop = [...rows].sort((a, b) => b[1].pop - a[1].pop);
const byArea = [...rows].sort((a, b) => b[1].area - a[1].area);
const dense = rows.filter(([, v]) => v.area > 50000).map(([k, v]) => [k, v.pop / v.area] as const).sort((a, b) => b[1] - a[1]);
const WORLD = rows.reduce((s, [, v]) => s + v.pop, 0);

const compact = (n: number) =>
  n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e8 ? 0 : 1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(Math.round(n));
const full = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));

const RANKINGS = [
  { href: "/data/ranking/population", label: "Population", sub: "by country", art: "Population ranking: largest countries 1.46B people" },
  { href: "/data/ranking/gdp-per-capita", label: "GDP per capita", sub: "by country", art: "GDP per capita trend: richest economies $100K growth" },
  { href: "/data/ranking/gdp-growth", label: "GDP growth", sub: "by country", art: "Real GDP growth 7.5% of fastest economies" },
];
const COMPARE = [
  ["china-chn-vs-united-states-usa", "China vs USA"],
  ["china-chn-vs-india-ind", "China vs India"],
  ["united-kingdom-gbr-vs-united-states-usa", "UK vs USA"],
  ["france-fra-vs-germany-deu", "France vs Germany"],
  ["canada-can-vs-united-states-usa", "Canada vs USA"],
  ["australia-aus-vs-new-zealand-nzl", "Australia vs NZ"],
];

const countryHref = (k: string, base: string) => (SLUG[k] ? `${base}/population/${SLUG[k]}` : `${base}/ranking/population`);

export default function DataHero({ s }: { s: string }) {
  const d = `${s}/data`;
  const top = byPop.slice(0, 10);
  const max = top[0][1].pop;
  const big = byArea.slice(0, 6);
  const bigMax = big[0][1].area;
  const LAND = rows.reduce((t, [, v]) => t + v.area, 0);
  const worldDensity = WORLD / LAND;
  const [dk, dv] = dense[0];
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <section className="cv-sec cd-hero" aria-label="The world in numbers">
      <div className="cv-wrap">
        <div className="cv-sechead">
          <h2>The world in numbers</h2>
          <Link href={d} className="cv-seeall">All country data →</Link>
        </div>

        <div className="cv-kpis">
          <div className="cv-kpi">
            <span className="cv-kpi-l">World population</span>
            <b className="cv-kpi-v">{compact(WORLD)}</b>
            <span className="cv-kpi-s">{full(WORLD)} people · {rows.length} countries</span>
            <span className="cv-kpi-bars" aria-hidden="true">
              {top.slice(0, 8).map(([k, v]) => <i key={k} style={{ height: `${Math.max(12, (v.pop / max) * 100).toFixed(0)}%` }} />)}
            </span>
          </div>
          <Link href={countryHref(top[0][0], d)} className="cv-kpi">
            <span className="cv-kpi-l">Most populous</span>
            <b className="cv-kpi-v">{compact(top[0][1].pop)}</b>
            <span className="cv-kpi-s">{NAMES[top[0][0]]} · {pct(top[0][1].pop / WORLD)} of the world</span>
            <span className="cv-kpi-meter" aria-hidden="true"><i style={{ width: pct(top[0][1].pop / WORLD) }} /></span>
          </Link>
          <Link href={countryHref(big[0][0], d)} className="cv-kpi">
            <span className="cv-kpi-l">Largest country</span>
            <b className="cv-kpi-v">{compact(big[0][1].area)} km²</b>
            <span className="cv-kpi-s">{NAMES[big[0][0]]} · {pct(big[0][1].area / LAND)} of land</span>
            <span className="cv-kpi-meter" aria-hidden="true"><i style={{ width: pct(big[0][1].area / LAND) }} /></span>
          </Link>
          <Link href={countryHref(dk, d)} className="cv-kpi">
            <span className="cv-kpi-l">Most crowded big country</span>
            <b className="cv-kpi-v">{full(dv)}<small>/km²</small></b>
            <span className="cv-kpi-s">{NAMES[dk]} · {Math.round(dv / worldDensity)}× world average</span>
            <span className="cv-kpi-meter" aria-hidden="true"><i style={{ width: `${Math.min(100, (worldDensity / dv) * 100).toFixed(1)}%` }} /></span>
          </Link>
        </div>

        <div className="cd-charts">
          <figure className="cd-card">
            <figcaption>
              <b>Most populous countries</b>
              <Link href={`${d}/ranking/population`}>Full ranking →</Link>
            </figcaption>
            <ol className="cd-bars">
              {top.map(([k, v], i) => (
                <li key={k}>
                  <Link href={countryHref(k, d)}>
                    <span className="cd-rk">{i + 1}</span>
                    <span className="cd-nm">{NAMES[k]}</span>
                    <span className="cd-track"><i style={{ width: `${((v.pop / max) * 100).toFixed(1)}%` }} /></span>
                    <span className="cd-v">{compact(v.pop)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </figure>

          <figure className="cd-card">
            <figcaption>
              <b>Largest by area</b>
              <span className="cd-unit">km²</span>
            </figcaption>
            <div className="cd-ladder">
              {big.map(([k, v]) => (
                <Link href={countryHref(k, d)} key={k} style={{ ["--h" as string]: `${Math.max(14, (v.area / bigMax) * 100).toFixed(0)}%` }}>
                  <span className="cd-col"><i /></span>
                  <span className="cd-v">{compact(v.area)}</span>
                  <span className="cd-nm">{NAMES[k]}</span>
                </Link>
              ))}
            </div>
          </figure>
        </div>

        <div className="cd-explore">
          {RANKINGS.map((r) => (
            <Link href={`${s}${r.href}`} className="cd-rank" key={r.href}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artUri(r.art, { label: false })} alt="" width={120} height={63} loading="lazy" decoding="async" />
              <span>
                <b>{r.label}</b>
                <small>{r.sub} · World Bank</small>
              </span>
            </Link>
          ))}
        </div>

        <div className="cd-compare">
          <span className="cd-tl">Compare</span>
          {COMPARE.map(([p, l]) => (
            <Link href={`${d}/compare/${p}`} key={p}>{l}</Link>
          ))}
        </div>
      </div>
    </section>
  );
}
