import Link from "next/link";
import type { InfModel, Site } from "@/lib/types";
import { sitePrefix } from "@/lib/public-path";

/* Shared presentational pieces for InfKey data-product pages (server components). */

export function fmtUsd(n: number | null, digits = 2): string {
  if (n === null || n === undefined) return "—";
  if (n === 0) return "$0";
  if (n < 0.01) return "$" + n.toFixed(4);
  if (n < 1) return "$" + n.toFixed(Math.max(digits, 3));
  return "$" + n.toFixed(2);
}

export function fmtContext(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return (Math.round((n / 1_000_000) * 10) / 10).toString().replace(/\.0$/, "") + "M";
  if (n >= 1000) return Math.round(n / 1000) + "K";
  return String(n);
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function PageHead({
  kicker,
  title,
  dek,
  verified,
}: {
  kicker: string;
  title: string;
  dek?: string;
  verified?: string | null;
}) {
  return (
    <header className="page-head">
      <div className="article-cat">{kicker}</div>
      <h1 className="page-title">{title}</h1>
      {dek ? <p className="page-dek">{dek}</p> : null}
      {verified ? (
        <div className="verified-band">
          <span className="vb-tag">Pricing verified</span>
          <span className="vb-date">{fmtDate(verified)}</span>
          <span className="vb-note">
            USD per 1M tokens · excludes taxes, caching &amp; retries — confirm with the provider.
          </span>
        </div>
      ) : null}
    </header>
  );
}

export function Caps({ model }: { model: InfModel }) {
  const caps: string[] = [];
  if (model.supports_vision) caps.push("Vision");
  if (model.supports_audio) caps.push("Audio");
  if (model.supports_functions) caps.push("Functions");
  if (model.supports_structured) caps.push("JSON");
  if (caps.length === 0) return <span className="faint-dash">—</span>;
  return (
    <span className="caps">
      {caps.map((c) => (
        <span className="cap" key={c}>
          {c}
        </span>
      ))}
    </span>
  );
}

export function ModelTable({ site, models, id, sortable = false }: { site: Site; models: InfModel[]; id?: string; sortable?: boolean }) {
  const b = sitePrefix(site.id);
  const sort = (kind: "num" | "text") => (sortable ? { "data-sort": kind } : {});
  const ts = (iso: string | null) => {
    const t = iso ? Date.parse(iso) : NaN;
    return Number.isNaN(t) ? 0 : t;
  };
  return (
    <div className="itable-wrap">
      <table className="itable" id={id}>
        <thead>
          <tr>
            <th {...sort("text")}>Model</th>
            <th className="num" {...sort("num")}>Input /1M</th>
            <th className="num" {...sort("num")}>Output /1M</th>
            <th className="num" {...sort("num")}>Context</th>
            <th>Capabilities</th>
            <th {...sort("num")}>Verified</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id} data-s={`${m.name} ${m.provider} ${m.id}`.toLowerCase()}>
              <td data-v={m.name.toLowerCase()}>
                <Link className="m-name" href={`${b}/models/${m.id}`}>
                  <b>{m.name}</b>
                  <span className="m-vendor">{m.provider}</span>
                </Link>
              </td>
              <td className="num accent" data-label="Input" data-v={m.input_per_m ?? -1}>
                {fmtUsd(m.input_per_m, 3)}
              </td>
              <td className="num accent" data-label="Output" data-v={m.output_per_m ?? -1}>
                {fmtUsd(m.output_per_m, 2)}
              </td>
              <td className="num" data-label="Context" data-v={m.max_context ?? 0}>
                {fmtContext(m.max_context)}
              </td>
              <td data-label="Caps">
                <Caps model={m} />
              </td>
              <td className="mono-faint" data-label="Verified" data-v={ts(m.last_verified)}>
                {fmtDate(m.last_verified)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Status badge component */
export function StatusBadge({ indicator }: { indicator: string }) {
  const cls =
    indicator === "none"
      ? "operational"
      : indicator === "minor" || indicator === "maintenance"
        ? indicator === "maintenance" ? "maintenance" : "degraded"
        : "outage";
  const label =
    indicator === "none"
      ? "Operational"
      : indicator === "minor"
        ? "Degraded"
        : indicator === "maintenance"
          ? "Maintenance"
          : "Outage";
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

/** Fit badge for "Can I run it?" */
export function FitBadge({ fit }: { fit: "fits" | "tight" | "no" }) {
  const cls = fit === "fits" ? "runs" : fit === "tight" ? "barely" : "toobig";
  const label = fit === "fits" ? "Runs" : fit === "tight" ? "Barely fits" : "Too big";
  return <span className={`fit-badge ${cls}`}>{label}</span>;
}

/** Memory bar showing needed vs available */
export function MemoryBar({
  need,
  available,
  fit,
}: {
  need: number;
  available: number;
  fit: "fits" | "tight" | "no";
}) {
  const pct = Math.min((need / available) * 100, 120);
  const fillClass = fit === "fits" ? "fits" : fit === "tight" ? "tight" : "over";
  return (
    <div className="mem-bar-wrap">
      <div className="mem-bar-label">
        <span>Needed: {need.toFixed(1)} GB</span>
        <span>Available: {available.toFixed(0)} GB</span>
      </div>
      <div className="mem-bar">
        <div className={`mem-bar-fill ${fillClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        {pct > 100 && <div className="mem-bar-threshold" style={{ left: `${(available / need) * 100}%` }} />}
      </div>
    </div>
  );
}

/** Price change chip with arrow */
export function ChangeChip({ pct }: { pct: number }) {
  if (pct === 0) return <span className="faint-dash">—</span>;
  const isDown = pct < 0;
  return (
    <span className={`change-chip ${isDown ? "down" : "up"}`}>
      <span className="arrow">{isDown ? "▼" : "▲"}</span>
      {isDown ? "" : "+"}
      {pct}%
    </span>
  );
}

/** The current headline model of each big lab (newest full-size LLM), for "popular comparisons". */
const LABS = ["OpenAI", "Anthropic", "Google", "DeepSeek", "xAI", "Meta", "Mistral", "Qwen (Alibaba)"];
const NOT_HEADLINE = /gemma|batch|preview|exp|mini|nano|lite|flash|haiku|small|tiny|oss|guard|audio|image|realtime|search|embed|tts|transcribe|vl-|-vl|coder|safeguard/i;
export function headliners(models: InfModel[], n = 6): InfModel[] {
  const out: InfModel[] = [];
  for (const lab of LABS) {
    const c = models.filter((m) => m.provider === lab && m.category === "llm" && !NOT_HEADLINE.test(`${m.name} ${m.id}`));
    if (!c.length) continue;
    c.sort((a, b) => (b.created ?? 0) - (a.created ?? 0) || (b.output_per_m ?? 0) - (a.output_per_m ?? 0));
    out.push(c[0]);
    if (out.length >= n) break;
  }
  return out;
}

/** All head-to-head pairs of the given models, canonical (alphabetical) slug first. */
export function pairsOf(list: InfModel[], max: number): [string, InfModel, InfModel][] {
  const pairs: [string, InfModel, InfModel][] = [];
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length && pairs.length < max; j++) pairs.push([[list[i].id, list[j].id].sort().join("-vs-"), list[i], list[j]]);
  return pairs;
}
