import Link from "next/link";
import type { Site } from "@/lib/types";
import { HubPage, Crumbs, PageHead, StatRow, BigStat, TrendChart, AmountTable, DataTable, Faq, SourceLine, Related, Callout, SectionHead } from "./ui";
import type { RateView } from "./rates";
import { QUOTE_CURRENCIES, GULF_CURRENCIES } from "./config";
import { fmt, money, dateLong, pct, int } from "./format";
import { dpFor } from "./series";

const AMOUNTS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000];
const INVERSE = [100, 500, 1000, 5000, 10000, 50000];

export default function RatePage({ site, v }: { site: Site; v: RateView }) {
  const b = `/s/${site.id}`;
  const r = v.rate!;
  const amountRows: [string, string][] = AMOUNTS.map((a) => [`${int(a)} ${v.from}`, money(a * r, v.to, dpFor(a * r))]);
  const invRows: [string, string][] = INVERSE.map((a) => [`${int(a)} ${v.to}`, money(a / r, v.from, dpFor(a / r))]);
  const quotes6 = QUOTE_CURRENCIES.slice(0, 6);

  return (
    <HubPage site={site} active="tools">
      <Crumbs site={site} items={[{ label: "Exchange rates", href: `${b}/rates` }, { label: `${v.from} to ${v.to}` }]} />
      <PageHead
        kicker={`${v.from} → ${v.to} · ${dateLong(v.asOf)}`}
        title={
          <>
            {v.from} to {v.to} today: 1 {v.from} = {fmt(r, v.dp)} {v.to}
          </>
        }
        dek={
          <>
            {v.headline} at the mid-market rate on {dateLong(v.asOf)}.
            {v.reverse ? " This is the reverse direction; the main page is " : ""}
            {v.reverse ? <Link href={`${b}${v.canonical}`}>{v.canonical.replace("/rates/", "").toUpperCase()}</Link> : null}
            {v.reverse ? "." : ""}
          </>
        }
      />

      <StatRow>
        <BigStat label={`1 ${v.from} buys`} value={fmt(r, v.dp)} unit={v.to} tone="navy" sub={`${v.fromName} → ${v.toName}`} />
        <BigStat
          label="30-day change"
          value={v.ch30 ? pct(v.ch30.pct) : "—"}
          tone={v.ch30 && v.ch30.pct < 0 ? "gold" : "teal"}
          sub={v.ch30 ? `from ${fmt(v.ch30.from.v, v.dp)} on ${dateLong(v.ch30.from.d)}` : "history building"}
        />
        <BigStat
          label="1-year change"
          value={v.ch365 ? pct(v.ch365.pct) : "—"}
          tone="gold"
          sub={v.ch365 ? `from ${fmt(v.ch365.from.v, v.dp)} on ${dateLong(v.ch365.from.d)}` : "history building"}
        />
        <BigStat
          label="30-day range"
          value={v.st30 ? `${fmt(v.st30.min.v, v.dp)} – ${fmt(v.st30.max.v, v.dp)}` : "—"}
          tone="navy"
          sub={v.st30 ? `average ${fmt(v.st30.avg, v.dp)}` : "needs 2+ days"}
        />
      </StatRow>

      <Callout tone={v.peg ? "law" : "info"} title={v.peg ? `The ${v.fromName} is pegged` : "How to read this rate"}>
        <p style={{ margin: 0 }}>{v.intro}</p>
      </Callout>

      <SectionHead title={`${v.from}/${v.to} — last 30 days`} />
      {v.series30.length > 1 ? (
        <TrendChart
          points={v.series30}
          dp={v.dp}
          label={`${v.from} to ${v.to} over 30 days`}
          caption={
            <>
              Daily mid-market rate from {dateLong(v.series30[0].d)} to {dateLong(v.series30[v.series30.length - 1].d)}. Source: {v.source}.
            </>
          }
        />
      ) : (
        <Callout tone="warn" title="Chart history starts today">
          <p style={{ margin: 0 }}>
            Tracking for this pair began on {dateLong(v.asOf)}. The 30-day and 1-year charts appear here automatically once a few days of
            daily values exist — the site never draws a line it does not have data for.
          </p>
        </Callout>
      )}

      <SectionHead title={`Convert ${v.from} to ${v.to}`} />
      <AmountTable head={[v.from, v.to]} rows={amountRows} caption={`${v.from} → ${v.to} at ${fmt(r, v.dp)} per 1 ${v.from}, ${dateLong(v.asOf)}`} />

      <SectionHead title={`Convert ${v.to} to ${v.from}`} />
      <AmountTable head={[v.to, v.from]} rows={invRows} caption={`The same rate inverted: 1 ${v.to} = ${money(1 / r, v.from)}`} />

      <SectionHead title="What is moving this pair" />
      <p className="gh-dek">{v.moveSentence}</p>

      {v.series365.length > 1 ? (
        <>
          <SectionHead title={`${v.from}/${v.to} — last 12 months`} />
          <TrendChart
            points={v.series365}
            dp={v.dp}
            label={`${v.from} to ${v.to} over one year`}
            caption={
              <>
                One year of daily reference rates
                {v.ch365 ? `, from ${fmt(v.ch365.from.v, v.dp)} to ${fmt(v.ch365.to.v, v.dp)} (${pct(v.ch365.pct)})` : ""}. Source: {v.source}.
              </>
            }
          />
        </>
      ) : null}

      <SectionHead
        title="All six Gulf currencies against the quote currencies"
        dek="Same snapshot, same day — useful if you are comparing what your salary sends home from each Gulf state."
      />
      <DataTable
        head={["Currency", ...quotes6.map((q) => q.code)]}
        rows={v.matrix.map((row) => [
          <b key={row.code}>
            {row.code} <span style={{ color: "var(--faint)", fontWeight: 500 }}>{row.name}</span>
          </b>,
          ...row.values.map((val, i) =>
            row.code === v.from && quotes6[i].code === v.to ? (
              <b key={quotes6[i].code}>{fmt(r, v.dp)}</b>
            ) : (
              <Link key={quotes6[i].code} href={`${b}/rates/${row.code.toLowerCase()}-to-${quotes6[i].code.toLowerCase()}`}>
                {val == null ? "—" : fmt(val, dpFor(val))}
              </Link>
            ),
          ),
        ])}
        caption={`Mid-market rates per 1 unit of the Gulf currency, ${dateLong(v.asOf)}`}
        foot={<>Tap any figure to open that pair. Source: {v.source}, updated {dateLong(v.updated)}.</>}
      />

      <Faq items={v.faq} />

      <Related
        title={`Other ${v.from} rates`}
        links={[
          ...QUOTE_CURRENCIES.filter((q) => q.code !== v.to)
            .slice(0, 8)
            .map((q) => ({ label: `${v.from} to ${q.code}`, href: `${b}/rates/${v.from.toLowerCase()}-to-${q.code.toLowerCase()}` })),
          { label: "All exchange rates", href: `${b}/rates` },
        ]}
      />

      <Related
        title={`Other Gulf currencies to ${v.to}`}
        links={GULF_CURRENCIES.filter((g) => g.code !== v.from).map((g) => ({
          label: `${g.code} to ${v.to}`,
          href: `${b}/rates/${g.code.toLowerCase()}-to-${v.to.toLowerCase()}`,
        }))}
      />

      <SourceLine
        source={v.source}
        url={v.sourceUrl}
        updated={v.updated}
        note={
          <>
            Mid-market reference rate, stored three times a day. {v.live ? "" : "Showing the last published snapshot while the live feed reconnects. "}
            Banks and exchange houses add a margin — the amount you actually receive will be lower.
          </>
        }
      />
    </HubPage>
  );
}
