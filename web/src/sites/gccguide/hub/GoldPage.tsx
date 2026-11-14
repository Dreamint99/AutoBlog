import Link from "next/link";
import type { Site } from "@/lib/types";
import { HubPage, Crumbs, PageHead, StatRow, BigStat, TrendChart, DataTable, Faq, SourceLine, Related, Callout, SectionHead } from "./ui";
import type { GoldCityView } from "./gold";
import { GOLD_CITIES, GRAMS_PER_TOLA } from "./config";
import { fmt, dateLong, pct, int } from "./format";

export default function GoldPage({ site, v }: { site: Site; v: GoldCityView }) {
  const b = `/s/${site.id}`;
  const dp = v.currency === "KWD" ? 3 : 2;
  const g24 = v.rows[0];
  const g22 = v.rows[1];

  return (
    <HubPage site={site} active="tools">
      <Crumbs site={site} items={[{ label: "Gold rates", href: `${b}/gold-rate` }, { label: v.city }]} />
      <PageHead
        kicker={`${v.city}, ${v.countryName} · ${dateLong(v.asOf)}`}
        title={
          <>
            Gold rate in {v.city} today: 24K {v.currency} {fmt(g24.gram, dp)}/g, 22K {v.currency} {fmt(g22.gram, dp)}/g
          </>
        }
        dek={
          <>
            Spot-based gold price for {v.city} on {dateLong(v.asOf)}, calculated from {fmt(v.usdPerOz, 2)} US dollars per troy ounce.
            Jewellers add making charges on top — this is the metal, not the finished piece.
          </>
        }
      />

      <StatRow>
        <BigStat label="24K per gram" value={fmt(g24.gram, dp)} unit={v.currency} tone="gold" sub="99.9% fine gold" />
        <BigStat label="22K per gram" value={fmt(g22.gram, dp)} unit={v.currency} tone="gold" sub="91.6% — Gulf jewellery standard" />
        <BigStat label="1 tola 24K" value={fmt(g24.tola, dp)} unit={v.currency} tone="navy" sub={`${fmt(GRAMS_PER_TOLA, 4)} grams`} />
        <BigStat
          label="30-day change"
          value={v.ch30 ? pct(v.ch30.pct) : "—"}
          tone={v.ch30 && v.ch30.pct < 0 ? "navy" : "teal"}
          sub={v.ch30 ? `${v.currency} ${fmt(v.ch30.from, dp)} → ${fmt(v.ch30.to, dp)}` : "history building"}
        />
      </StatRow>

      <SectionHead title={`Gold price by karat and weight in ${v.city}`} dek="Per gram, per 8 g, per 10 g and per tola, in the currency you actually pay." />
      <DataTable
        head={["Karat", `1 gram (${v.currency})`, `8 g (${v.currency})`, `10 g (${v.currency})`, `1 tola (${v.currency})`]}
        rows={v.rows.map((r) => [
          <b key={r.k}>
            {r.label} <span style={{ color: "var(--faint)", fontWeight: 500 }}>{Math.round(r.k === 24 ? 99.9 : r.k === 22 ? 91.6 : r.k === 21 ? 87.5 : 75)}%</span>
          </b>,
          fmt(r.gram, dp),
          fmt(r.eight, dp),
          fmt(r.ten, dp),
          <b key={`t${r.k}`}>{fmt(r.tola, dp)}</b>,
        ])}
        caption={`Gold rate in ${v.city}, ${dateLong(v.asOf)} — spot plus conversion, before making charges`}
        foot={
          <>
            1 troy ounce = 31.1034768 g · 1 tola = 11.6638 g. Calculated from {v.source} ({fmt(v.usdPerOz, 2)} USD/oz) and 1 USD ={" "}
            {v.fxPerUsd ? fmt(v.fxPerUsd, 4) : "—"} {v.currency}.
          </>
        }
      />

      <Callout tone="warn" title="Spot price ≠ shop price">
        <p style={{ margin: 0 }}>
          A jeweller in {v.city} charges this metal value <i>plus</i> a making charge, usually 5–20% of the gold value depending on the design,
          and sometimes a fixed premium per gram. Before you buy, ask for the weight, the karat and the making charge separately, and weigh the
          piece yourself. The rate here is the fair metal value — useful for checking a quote, not a quote itself.
        </p>
      </Callout>

      <SectionHead title={`${v.city} gold price — last 30 days`} />
      {v.series30.length > 1 ? (
        <TrendChart
          points={v.series30}
          dp={dp}
          label={`24K gold per gram in ${v.city} over 30 days`}
          caption={
            <>
              Daily spot-based 24K price per gram in {v.currency}, {dateLong(v.series30[0].d)} to {dateLong(v.series30[v.series30.length - 1].d)}.
              {v.st30 ? ` Range ${fmt(v.st30.min.v, dp)} – ${fmt(v.st30.max.v, dp)}, average ${fmt(v.st30.avg, dp)}.` : ""} Source: {v.source}.
            </>
          }
        />
      ) : (
        <Callout tone="warn" title="Chart history starts today">
          <p style={{ margin: 0 }}>
            Daily gold values have been recorded since {dateLong(v.asOf)}. The 30-day line appears once there are at least two days of data —
            the page never draws a chart it cannot back with stored values.
          </p>
        </Callout>
      )}

      <SectionHead title="The same gold in the other Gulf currencies" dek="Useful if you are buying in one Gulf state for family in another." />
      <DataTable
        head={["Currency", "1 gram 24K", "1 tola 24K"]}
        rows={v.otherCurrencies.map((o) => [<b key={o.code}>{o.code}</b>, fmt(o.gram, o.code === "KWD" ? 3 : 2), fmt(o.tola, o.code === "KWD" ? 3 : 2)])}
        caption={`24K gold, ${dateLong(v.asOf)}`}
        foot={<>Converted at today's mid-market Gulf rates. Source: {v.source} for gold, open.er-api.com for currency.</>}
      />

      <SectionHead title="Gold price in US dollars" dek="The underlying spot price, for anyone comparing with international markets." />
      <DataTable
        head={["Karat", "1 gram (USD)", "1 tola (USD)"]}
        rows={v.usdRows.map((r) => [<b key={r.k}>{r.label}</b>, fmt(r.gram, 2), fmt(r.tola, 2)])}
        caption={`${fmt(v.usdPerOz, 2)} USD per troy ounce, ${dateLong(v.asOf)}`}
      />

      <Faq items={v.faq} />

      <Related
        title="Gold rates in other cities"
        links={[
          ...GOLD_CITIES.filter((c) => c.slug !== v.slug && c.currency === v.currency).map((c) => ({ label: c.city, href: `${b}/gold-rate/${c.slug}` })),
          { label: "All gold rates", href: `${b}/gold-rate` },
        ]}
      />

      <Related
        title="Gold in other Gulf countries"
        links={GOLD_CITIES.filter((c) => c.currency !== v.currency && c.primary).map((c) => ({ label: `${c.city} (${c.currency})`, href: `${b}/gold-rate/${c.slug}` }))}
      />

      <SourceLine
        source={v.source}
        url={v.sourceUrl}
        updated={v.updated}
        note={
          <>
            Spot gold in USD per troy ounce · currency conversion from open.er-api.com. {v.live ? "" : "Showing the last published snapshot while the live feed reconnects. "}
            Spot-based rate: shops add making charges and premiums.
          </>
        }
      />
    </HubPage>
  );
}
