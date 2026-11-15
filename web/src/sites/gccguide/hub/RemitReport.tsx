import Link from "next/link";
import type { Site } from "@/lib/types";
import { siteBaseUrl } from "@/lib/sites.config";
import { HubPage, Crumbs, PageHead, StatRow, BigStat, TrendChart, DataTable, SectionHead, Callout, Delta, Related } from "./ui";
import { fmt, dateLong, dateShort, pct } from "./format";
import { toPath } from "./series";
import { monthLabel, monthEnds12, type Pt } from "./remittance-math";
import { pairOf, LICENSE_URL, type MonthReport, type HubItem, type FxData } from "./remittance";

/* Monthly Remittance Report pages: /reports/remittance and /reports/remittance/<yyyy-mm>.
 * Server-rendered with the hub's own components; the only new pieces are the
 * sparkline grid and the "Use this data" box. */

function weekLabel(start: string, end: string): string {
  return start === end ? dateShort(start) : `${dateShort(start).split(" ")[0]}–${dateShort(end)}`;
}

function Spark({ points }: { points: Pt[] }) {
  const p = toPath(points, 120, 36, 3);
  if (!p) return null;
  const up = points[points.length - 1].v >= points[0].v;
  return (
    <svg viewBox="0 0 120 36" className={`gr-spark ${up ? "up" : "down"}`} aria-hidden="true">
      <path d={p.line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function UseThisData({ site, ym, label, pair }: { site: Site; ym: string | null; label: string; pair: [string, string] }) {
  const base = siteBaseUrl(site);
  const slug = `${pair[0].toLowerCase()}-to-${pair[1].toLowerCase()}`;
  const src = `${base}/embed/remittance/${slug}${ym ? `?m=${ym}` : ""}`;
  const page = `${base}/reports/remittance${ym ? `/${ym}` : ""}`;
  const embed = `<iframe src="${src}" width="100%" height="320" style="border:0;max-width:600px" loading="lazy" title="${pair[0]} to ${pair[1]} remittance rate — GCCGuide"></iframe>`;
  const year = (ym ?? new Date().toISOString()).slice(0, 4);
  return (
    <section className="gr-use" aria-labelledby="gr-use-h">
      <h2 id="gr-use-h">Use this data</h2>
      <p>
        Journalists, researchers and bloggers may republish these figures and charts with attribution under{" "}
        <a href={LICENSE_URL} target="_blank" rel="noopener">
          CC BY 4.0
        </a>
        .
      </p>
      <b className="gr-use-k">Embed the {pair[0]} → {pair[1]} chart</b>
      <pre className="gr-code">
        <code>{embed}</code>
      </pre>
      <p className="gr-use-note">
        Swap <code>{slug}</code> for any corridor, e.g. <code>qar-to-bdt</code>, <code>sar-to-pkr</code>, <code>kwd-to-inr</code>.
      </p>
      <b className="gr-use-k">Cite as</b>
      <p className="gr-cite">
        GCCGuide ({year}). “Gulf Remittance Rates Report — {label}.” {page}
      </p>
    </section>
  );
}

/* ── Hub ──────────────────────────────────────────────────────────────────── */

export function RemitHubPage({ site, items, data }: { site: Site; items: HubItem[]; data: FxData }) {
  const b = `/s/${site.id}`;
  const latest = items[0];
  const lead = latest?.lead;
  const aedInr = pairOf(data, "AED", "INR");
  return (
    <HubPage site={site} active="tools">
      <Crumbs site={site} items={[{ label: "Exchange rates", href: `${b}/rates` }, { label: "Remittance reports" }]} />
      <PageHead
        kicker={latest ? `Latest data ${dateLong(latest.lastDate)}` : undefined}
        title="Monthly Gulf Remittance Rates Report"
        dek="What a Gulf salary was worth back home each month: month-end rates, monthly and yearly change, highs, lows and the best week to send, for six Gulf currencies against eleven home currencies. Generated from the stored rate history, no estimates."
      />

      {lead && latest ? (
        <StatRow>
          <BigStat label={`AED → INR, ${latest.complete ? "end of " : ""}${latest.label}`} value={fmt(lead.end.v, 4)} unit="INR" tone="teal" sub={latest.complete ? "month-end" : "so far this month"} />
          <BigStat label="vs previous month" value={lead.chPrev != null ? pct(lead.chPrev) : "—"} tone="navy" sub={lead.prev ? `from ${fmt(lead.prev.v, 4)}` : "no earlier month"} />
          <BigStat label="Reports" value={String(items.length)} tone="gold" sub="one per month" />
        </StatRow>
      ) : null}

      <SectionHead title="All reports" dek="Newest first. The current month updates daily until it closes." />
      <div className="gh-grid cols3">
        {items.map((it) => (
          <Link key={it.ym} className="gh-card gr-month" href={`${b}/reports/remittance/${it.ym}`}>
            <b>
              {it.label}
              {it.complete ? "" : " · so far"}
            </b>
            <span>
              {it.lead ? (
                <>
                  AED→INR <span className="gh-card-v">{fmt(it.lead.end.v, 4)}</span> <Delta n={it.lead.chPrev} />
                </>
              ) : (
                "—"
              )}
            </span>
          </Link>
        ))}
      </div>

      {latest ? (
        <>
          <SectionHead title="AED → INR month-end rate" dek="One point per month: the last stored rate of each month." />
          <TrendChart
            points={monthEnds12(aedInr, latest.ym)}
            dp={4}
            label="AED to INR month-end rate"
            caption={<>Month-end mid-market rate for the last 12 months. The five pegged Gulf currencies follow the same shape.</>}
          />
        </>
      ) : null}

      <UseThisData site={site} ym={null} label="latest month" pair={["AED", "INR"]} />

      <Related
        title="Daily rates"
        links={[
          { label: "All Gulf exchange rates today", href: `${b}/rates` },
          { label: "QAR to BDT", href: `${b}/rates/qar-to-bdt` },
          { label: "AED to INR", href: `${b}/rates/aed-to-inr` },
          { label: "SAR to PKR", href: `${b}/rates/sar-to-pkr` },
          { label: "AED to PHP", href: `${b}/rates/aed-to-php` },
          { label: "KWD to INR", href: `${b}/rates/kwd-to-inr` },
        ]}
      />
      <MethodNote sources={data.sources.map((s) => ({ key: s.key, from: s.from, to: s.to }))} />
    </HubPage>
  );
}

/* ── One month ────────────────────────────────────────────────────────────── */

function MethodNote({ sources, sampling }: { sources: { key?: string; name?: string; url?: string; from: string; to: string }[]; sampling?: string }) {
  return (
    <section className="gr-method" aria-labelledby="gr-method-h" data-nosnippet>
      <h2 id="gr-method-h">Method and source</h2>
      <ul>
        <li>
          Rates are <b>mid-market reference rates</b>, not bank or exchange-house rates. Providers add a margin (typically 0.5–2% on Gulf–Asia
          corridors) and sometimes a fee, so the amount received is lower.
        </li>
        <li>
          Every rate is stored against the US dollar and crossed: 1 Gulf unit = (home currency per USD) ÷ (Gulf currency per USD).
          {sampling ? ` This month is built from ${sampling} samples.` : ""} History was sampled weekly until 15 Oct 2026 and daily since.
        </li>
        <li>
          <b>Month-end</b> is the last stored rate in the month; <b>change</b> compares month-ends; <b>best week</b> is the Monday–Sunday week
          with the highest average rate, i.e. the most home currency per Gulf unit.
        </li>
        <li>
          Upstream source{sources.length > 1 ? "s" : ""}:{" "}
          {sources.map((s, i) => (
            <span key={i}>
              {i ? "; " : ""}
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener nofollow">
                  {s.name}
                </a>
              ) : (
                s.name ?? s.key
              )}{" "}
              ({dateLong(s.from)} – {dateLong(s.to)})
            </span>
          ))}
          .
        </li>
      </ul>
    </section>
  );
}

export function RemitMonthPage({ site, r, data }: { site: Site; r: MonthReport; data: FxData }) {
  const b = `/s/${site.id}`;
  const lead = r.blocks.find((x) => x.code === "AED")?.rows.find((x) => x.to === "INR")?.pm;
  const qarBdt = r.blocks.find((x) => x.code === "QAR")?.rows.find((x) => x.to === "BDT")?.pm;
  const sparkFrom = "AED";
  const prevShort = r.prevLabel.slice(0, 3);
  const yearShort = r.yearLabel.replace(/^(\w{3})\w*/, "$1");

  return (
    <HubPage site={site} active="tools">
      <Crumbs
        site={site}
        items={[
          { label: "Exchange rates", href: `${b}/rates` },
          { label: "Remittance reports", href: `${b}/reports/remittance` },
          { label: r.label },
        ]}
      />
      <PageHead
        kicker={r.complete ? `Monthly report · ${r.label}` : `Month to date · data to ${dateLong(r.lastDate)}`}
        title={
          <>
            Gulf Remittance Rates Report — {r.label}
            {r.complete ? "" : " (so far)"}
          </>
        }
      />

      <div className="gr-summary">
        {r.summary.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <StatRow>
        {lead ? (
          <BigStat label={`AED → INR ${r.complete ? "month-end" : "latest"}`} value={fmt(lead.end.v, 4)} unit="INR" tone="teal" sub={<Delta n={lead.chPrev}> vs {r.prevLabel}</Delta>} />
        ) : null}
        {qarBdt ? (
          <BigStat label={`QAR → BDT ${r.complete ? "month-end" : "latest"}`} value={fmt(qarBdt.end.v, 4)} unit="BDT" tone="navy" sub={<Delta n={qarBdt.chPrev}> vs {r.prevLabel}</Delta>} />
        ) : null}
        {lead?.best ? (
          <BigStat label="Best week to send" value={weekLabel(lead.best.start, lead.best.end)} tone="gold" sub={`AED→INR averaged ${fmt(lead.best.avg, 4)}`} />
        ) : null}
      </StatRow>

      {r.chart.points.length > 1 ? (
        <>
          <SectionHead title={`${r.chart.from} → ${r.chart.to}, 12 months to ${r.label}`} />
          <TrendChart
            points={r.chart.points}
            dp={r.chart.dp}
            label={`${r.chart.from} to ${r.chart.to}, 12 months`}
            caption={
              <>
                Mid-market rate from {dateLong(r.chart.points[0].d)} to {dateLong(r.chart.points[r.chart.points.length - 1].d)}.
              </>
            }
          />
        </>
      ) : null}

      <SectionHead title="Every home currency, 12 months" dek={`Per 1 ${sparkFrom}. SAR, QAR, OMR and BHD follow the same shape (USD pegs).`} />
      <div className="gh-grid cols3">
        {(r.blocks.find((x) => x.code === sparkFrom)?.rows ?? []).map((row) => {
          const pts = monthEnds12(pairOf(data, sparkFrom, row.to), r.ym);
          return (
            <Link key={row.to} className="gh-card gr-sparkcard" href={`${b}/rates/${sparkFrom.toLowerCase()}-to-${row.to.toLowerCase()}`}>
              <span className="gr-sc-t">
                <b>
                  {sparkFrom} → {row.to}
                </b>
                <span>
                  {fmt(row.pm.end.v, row.dp)} <Delta n={row.pm.chYear ?? row.pm.chPrev} />
                </span>
              </span>
              <Spark points={pts} />
            </Link>
          );
        })}
      </div>

      {r.blocks.map((blk) => (
        <div key={blk.code} id={blk.code.toLowerCase()}>
          <SectionHead title={`${blk.code} — ${blk.name}`} dek={`What 1 ${blk.code} bought in each home currency, ${r.label}${r.complete ? "" : " so far"}.`} />
          <DataTable
            head={["Home currency", r.complete ? "Month-end" : "Latest", `vs ${prevShort}`, `vs ${yearShort}`, "Low – high", "Best week"]}
            rows={blk.rows.map((row) => [
              <Link key="c" href={`${b}/rates/${blk.code.toLowerCase()}-to-${row.to.toLowerCase()}`}>
                <b>{row.to}</b> <span style={{ color: "var(--faint)" }}>{row.country}</span>
              </Link>,
              <b key="e">{fmt(row.pm.end.v, row.dp)}</b>,
              <Delta key="p" n={row.pm.chPrev} />,
              <Delta key="y" n={row.pm.chYear} />,
              <span key="r" style={{ whiteSpace: "nowrap" }}>
                {fmt(row.pm.low.v, row.dp)} – {fmt(row.pm.high.v, row.dp)}
              </span>,
              <span key="w" style={{ whiteSpace: "nowrap" }}>
                {row.pm.best ? weekLabel(row.pm.best.start, row.pm.best.end) : "—"}
              </span>,
            ])}
            caption={`1 ${blk.code} = … home currency, mid-market`}
          />
        </div>
      ))}

      <Callout tone="warn" title="Reference rates, not what you will receive">
        <p style={{ margin: 0 }}>
          These are mid-market rates. Exchange houses and banks in the Gulf pay out less: compare the amount received, not the headline rate.
        </p>
      </Callout>

      <UseThisData site={site} ym={r.ym} label={r.label + (r.complete ? "" : " (so far)")} pair={["QAR", "BDT"]} />

      <nav className="gr-pager" aria-label="Other months">
        {r.older ? <Link href={`${b}/reports/remittance/${r.older}`}>← {monthLabel(r.older)}</Link> : <span />}
        <Link href={`${b}/reports/remittance`}>All reports</Link>
        {r.newer ? <Link href={`${b}/reports/remittance/${r.newer}`}>{monthLabel(r.newer)} →</Link> : <span />}
      </nav>

      <MethodNote sources={r.sourcesUsed} sampling={r.sampling} />
    </HubPage>
  );
}
