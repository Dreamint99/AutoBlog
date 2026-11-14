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
  const shareTop = (top[0][1].pop + top[1][1].pop) / WORLD;
  const big = byArea.slice(0, 6);
  const bigMax = big[0][1].area;
  const [dk, dv] = dense[0];

  return (
    <section className="cd-hero" aria-label="The world in numbers">
      <div className="cx-wrap">
        <div className="cd-head">
          <span className="cd-eyebrow">The world in numbers</span>
          <Link href={d} className="cd-link">All country data →</Link>
        </div>

        <div className="cd-tiles">
          <div className="cd-tile cd-tile-xl">
            <span className="cd-tl">World population</span>
            <b className="cd-big">{compact(WORLD)}</b>
            <span className="cd-sub">{full(WORLD)} people · {rows.length} countries</span>
          </div>
          <Link href={countryHref(top[0][0], d)} className="cd-tile">
            <span className="cd-tl">Most populous</span>
            <b>{NAMES[top[0][0]]}</b>
            <span className="cd-num">{compact(top[0][1].pop)}</span>
          </Link>
          <Link href={countryHref(big[0][0], d)} className="cd-tile">
            <span className="cd-tl">Largest country</span>
            <b>{NAMES[big[0][0]]}</b>
            <span className="cd-num">{compact(big[0][1].area)} km²</span>
          </Link>
          <Link href={countryHref(dk, d)} className="cd-tile">
            <span className="cd-tl">Most crowded big country</span>
            <b>{NAMES[dk]}</b>
            <span className="cd-num">{full(dv)} / km²</span>
          </Link>
          <div className="cd-tile cd-ring-tile">
            <svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true">
              <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="6" />
              <circle cx="24" cy="24" r="19" fill="none" stroke="var(--cd-green)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(2 * Math.PI * 19 * shareTop).toFixed(1)} 200`} transform="rotate(-90 24 24)" />
            </svg>
            <span>
              <b className="cd-num">{Math.round(shareTop * 100)}%</b>
              <span className="cd-tl">live in {NAMES[top[0][0]]} &amp; {NAMES[top[1][0]]}</span>
            </span>
          </div>
        </div>

        <div className="cd-charts">
          <figure className="cd-card">
            <figcaption>
              <b>Most populous countries</b>
              <Link href={`${d}/ranking/population`}>Ranking →</Link>
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
          <Link href={`${s}/crypto`} className="cd-chip-alt">Crypto prices</Link>
          <Link href={`${s}/currency-converter`} className="cd-chip-alt">Currency converter</Link>
        </div>
      </div>
    </section>
  );
}
