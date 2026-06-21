import Link from "next/link";
import type { InfModel, Site } from "@/lib/types";

/* Shared presentational pieces for InfKey data-product pages (server components). */

export function fmtUsd(n: number | null, digits = 2): string {
  if (n === null || n === undefined) return "—";
  if (n === 0) return "$0";
  if (n < 0.01) return "$" + n.toFixed(4);
  if (n < 1) return "$" + n.toFixed(Math.max(digits, 3));
  return "$" + n.toFixed(digits);
}

export function fmtContext(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toString().replace(/\.0$/, "") + "M";
  if (n >= 1000) return Math.round(n / 1000) + "K";
  return String(n);
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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

export function ModelTable({ site, models }: { site: Site; models: InfModel[] }) {
  const b = `/s/${site.id}`;
  return (
    <div className="itable-wrap">
      <table className="itable">
        <thead>
          <tr>
            <th>Model</th>
            <th className="num">Input /1M</th>
            <th className="num">Output /1M</th>
            <th className="num">Context</th>
            <th>Capabilities</th>
            <th>Verified</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id}>
              <td>
                <Link className="m-name" href={`${b}/models/${m.id}`}>
                  <b>{m.name}</b>
                  <span className="m-vendor">{m.provider}</span>
                </Link>
              </td>
              <td className="num accent">{fmtUsd(m.input_per_m, 3)}</td>
              <td className="num accent">{fmtUsd(m.output_per_m, 2)}</td>
              <td className="num">{fmtContext(m.max_context)}</td>
              <td>
                <Caps model={m} />
              </td>
              <td className="mono-faint">{fmtDate(m.last_verified)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
