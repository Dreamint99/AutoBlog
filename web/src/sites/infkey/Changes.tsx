import Link from "next/link";
import type { Site, InfModel } from "@/lib/types";
import { getDayChanges, getModels, getChangeDays, type PriceChange } from "@/lib/models";
import { PageHead, ModelTable, fmtUsd, fmtDate, ChangeChip } from "./data-ui";

/* "AI price changes" for one day, built only from the daily price snapshots (no AI writing). */

export async function changeSummary(day: string) {
  const c = await getDayChanges(day);
  const n = c.up.length + c.down.length + c.added.length;
  return { ...c, n };
}

const pct = (c: PriceChange) => {
  const a = (c.oldIn ?? 0) + (c.oldOut ?? 0);
  const b = (c.newIn ?? 0) + (c.newOut ?? 0);
  return a ? Math.round(((b - a) / a) * 100) : 0;
};

function cheapest(models: InfModel[]) {
  const paid = models.filter((m) => m.category === "llm" && (m.input_per_m ?? 0) + (m.output_per_m ?? 0) > 0);
  const by = (xs: InfModel[]) => [...xs].sort((a, b) => (a.input_per_m ?? 0) + (a.output_per_m ?? 0) - ((b.input_per_m ?? 0) + (b.output_per_m ?? 0)))[0];
  return { flagship: by(paid.filter((m) => m.tier === 0)), any: by(paid), free: models.filter((m) => m.category === "llm" && m.input_per_m === 0 && m.output_per_m === 0).length };
}

function ChangeTable({ site, rows }: { site: Site; rows: PriceChange[] }) {
  const b = `/s/${site.id}`;
  return (
    <div className="itable-wrap">
      <table className="itable">
        <thead>
          <tr>
            <th>Model</th>
            <th className="num">Input /1M</th>
            <th className="num">Output /1M</th>
            <th className="num">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.model.id}>
              <td>
                <Link className="m-name" href={`${b}/models/${c.model.id}`}>
                  <b>{c.model.name}</b>
                  <span className="m-vendor">{c.model.provider}</span>
                </Link>
              </td>
              <td className="num" data-label="Input">
                {fmtUsd(c.oldIn, 3)} → {fmtUsd(c.newIn, 3)}
              </td>
              <td className="num" data-label="Output">
                {fmtUsd(c.oldOut, 2)} → {fmtUsd(c.newOut, 2)}
              </td>
              <td data-label="Change">
                <ChangeChip pct={pct(c)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ChangesView({ site, day }: { site: Site; day: string }) {
  const [c, models, days] = await Promise.all([changeSummary(day), getModels(), getChangeDays()]);
  const ch = cheapest(models);
  const b = `/s/${site.id}`;
  const date = fmtDate(day);
  const parts = [
    c.down.length ? `${c.down.length} model${c.down.length > 1 ? "s" : ""} got cheaper` : "",
    c.up.length ? `${c.up.length} got more expensive` : "",
    c.added.length ? `${c.added.length} new model${c.added.length > 1 ? "s were" : " was"} added` : "",
  ].filter(Boolean);
  const lead = c.first
    ? `Tracking started on ${date}: ${models.length} models and their prices were recorded. Changes appear from the next day.`
    : parts.length
      ? `${parts.join(", ")} on ${date}.`
      : `No AI API price changes on ${date} across ${models.length} tracked models.`;
  return (
    <>
      <PageHead kicker="Daily price tracker" title={`AI API price changes — ${date}`} dek={lead} />
      {ch.any ? (
        <div className="price-cards">
          <div className="pcard">
            <div className="k">Cheapest flagship model</div>
            <div className="v">
              {ch.flagship ? (
                <Link href={`${b}/models/${ch.flagship.id}`}>{ch.flagship.name}</Link>
              ) : (
                "—"
              )}
            </div>
          </div>
          <div className="pcard">
            <div className="k">Cheapest paid model</div>
            <div className="v">
              <Link href={`${b}/models/${ch.any.id}`}>{ch.any.name}</Link>
            </div>
          </div>
          <div className="pcard">
            <div className="k">Free models available</div>
            <div className="v">{ch.free}</div>
          </div>
        </div>
      ) : null}
      {c.down.length ? (
        <>
          <div className="section-head">
            <h2>Price drops</h2>
            <span className="rule" />
          </div>
          <ChangeTable site={site} rows={c.down} />
        </>
      ) : null}
      {c.up.length ? (
        <>
          <div className="section-head">
            <h2>Price increases</h2>
            <span className="rule" />
          </div>
          <ChangeTable site={site} rows={c.up} />
        </>
      ) : null}
      {c.added.length ? (
        <>
          <div className="section-head">
            <h2>New models</h2>
            <span className="rule" />
          </div>
          <ModelTable site={site} models={c.added} />
        </>
      ) : null}
      <div className="section-head">
        <h2>Earlier days</h2>
        <span className="rule" />
      </div>
      <div className="vs-links">
        {days.slice(0, 30).map((d) => (
          <Link className="vs-link" href={`${b}/changes/${d}`} key={d}>
            {fmtDate(d)}
          </Link>
        ))}
      </div>
      <p className="src-note">Built from a daily snapshot of public API prices (USD per 1M tokens). A change is any move in input or output price versus the model&apos;s previous snapshot.</p>
    </>
  );
}
