import "@/sites/infkey/theme.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getModel } from "@/lib/models";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { fmtUsd, fmtContext, fmtDate } from "@/sites/infkey/data-ui";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import type { InfModel } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseSlug(slug: string): [string, string] | null {
  const parts = slug.split("-vs-");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}): Promise<Metadata> {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const pair = parseSlug(slug);
  if (!site || site.id !== "infkey" || !pair) return {};
  const [a, b] = await Promise.all([getModel(pair[0]), getModel(pair[1])]);
  if (!a || !b) return {};
  return {
    title: `${a.name} vs ${b.name}: API Pricing Compared — InfKey`,
    description: `${a.name} vs ${b.name} on input/output price, context window and capabilities. Verified pricing with official sources.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/compare/${slug}` },
    openGraph: {
      title: `${a.name} vs ${b.name}: API Pricing Compared — InfKey`,
      description: `${a.name} vs ${b.name} on price, context window and capabilities.`,
      type: "website",
      url: `/compare/${slug}`,
    },
    twitter: { card: "summary_large_image", title: `${a.name} vs ${b.name} — InfKey` },
  };
}

type Side = "a" | "b" | "tie";
type Row = { label: string; a: string; b: string; win: Side };

function cheaper(a: number | null, b: number | null): Side {
  if (a === null || b === null) return "tie";
  if (a < b) return "a";
  if (b < a) return "b";
  return "tie";
}
function higher(a: number | null, b: number | null): Side {
  if (a === null || b === null) return "tie";
  if (a > b) return "a";
  if (b > a) return "b";
  return "tie";
}
function boolWin(a: boolean, b: boolean): Side {
  if (a === b) return "tie";
  return a ? "a" : "b";
}
const yn = (v: boolean) => (v ? "Yes" : "No");

export default async function ComparePairPage({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}) {
  const { site: id, slug } = await params;
  const site = getSite(id);
  if (!site || site.id !== "infkey") notFound();
  const pair = parseSlug(slug);
  if (!pair) notFound();
  const [A, B] = await Promise.all([getModel(pair[0]), getModel(pair[1])]);
  if (!A || !B) notFound();

  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);

  const rows: Row[] = [
    { label: "Provider", a: A.provider, b: B.provider, win: "tie" },
    { label: "Input / 1M", a: fmtUsd(A.input_per_m, 3), b: fmtUsd(B.input_per_m, 3), win: cheaper(A.input_per_m, B.input_per_m) },
    { label: "Output / 1M", a: fmtUsd(A.output_per_m, 2), b: fmtUsd(B.output_per_m, 2), win: cheaper(A.output_per_m, B.output_per_m) },
    { label: "Cached input / 1M", a: fmtUsd(A.cached_input_per_m, 3), b: fmtUsd(B.cached_input_per_m, 3), win: cheaper(A.cached_input_per_m, B.cached_input_per_m) },
    { label: "Context window", a: fmtContext(A.max_context), b: fmtContext(B.max_context), win: higher(A.max_context, B.max_context) },
    { label: "Max output", a: fmtContext(A.max_output), b: fmtContext(B.max_output), win: higher(A.max_output, B.max_output) },
    { label: "Vision", a: yn(A.supports_vision), b: yn(B.supports_vision), win: boolWin(A.supports_vision, B.supports_vision) },
    { label: "Audio", a: yn(A.supports_audio), b: yn(B.supports_audio), win: boolWin(A.supports_audio, B.supports_audio) },
    { label: "Function calling", a: yn(A.supports_functions), b: yn(B.supports_functions), win: boolWin(A.supports_functions, B.supports_functions) },
    { label: "Structured / JSON", a: yn(A.supports_structured), b: yn(B.supports_structured), win: boolWin(A.supports_structured, B.supports_structured) },
    { label: "Verified", a: fmtDate(A.last_verified), b: fmtDate(B.last_verified), win: "tie" },
  ];

  function verdict(m: InfModel, other: InfModel): string {
    const inWin = (m.input_per_m ?? Infinity) < (other.input_per_m ?? Infinity);
    const outWin = (m.output_per_m ?? Infinity) < (other.output_per_m ?? Infinity);
    if (inWin && outWin) return "Cheaper on both input and output";
    if (inWin) return "Cheaper on input tokens";
    if (outWin) return "Cheaper on output tokens";
    return "Higher token price";
  }

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: site.name, url: base },
          { name: "Compare", url: `${base}/compare` },
          { name: `${A.name} vs ${B.name}`, url: `${base}/compare/${slug}` },
        ])}
      />
      <InfShell site={site}>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href={b}>{site.name}</Link>
        <span className="sep" aria-hidden="true">
          /
        </span>
        <Link href={`${b}/compare`}>Compare</Link>
        <span className="sep" aria-hidden="true">
          /
        </span>
        <span className="here">
          {A.name} vs {B.name}
        </span>
      </nav>

      <header className="page-head">
        <div className="article-cat">Comparison</div>
        <h1 className="page-title">
          {A.name} <span className="vs-big">vs</span> {B.name}
        </h1>
        <p className="page-dek">
          Input/output pricing, context window and capabilities, side by side. Lower price and larger
          context are highlighted as the better value.
        </p>
        <div className="verified-band">
          <span className="vb-tag">Pricing verified</span>
          <span className="vb-date">
            {fmtDate(A.last_verified)} / {fmtDate(B.last_verified)}
          </span>
          <span className="vb-note">USD per 1M tokens · confirm with the provider before relying on it.</span>
        </div>
      </header>

      <div className="cmp-wrap">
        <table className="cmp">
          <thead>
            <tr>
              <th>Metric</th>
              <th>
                <Link href={`${b}/models/${A.id}`}>{A.name}</Link>
                <span className="cmp-vendor">{A.provider}</span>
              </th>
              <th>
                <Link href={`${b}/models/${B.id}`}>{B.name}</Link>
                <span className="cmp-vendor">{B.provider}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td className={r.win === "a" ? "win" : ""}>{r.a}</td>
                <td className={r.win === "b" ? "win" : ""}>{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="verdict-row">
        <div className="verdict">
          <h3>{A.name}</h3>
          <p>{verdict(A, B)}</p>
        </div>
        <div className="verdict">
          <h3>{B.name}</h3>
          <p>{verdict(B, A)}</p>
        </div>
      </div>

      <div className="cta-row">
        <Link className="btn btn-primary" href={`${b}/calculators#calculator`}>
          ▸ Price your own workload
        </Link>
        <Link className="btn btn-ghost" href={`${b}/models`}>
          All models
        </Link>
      </div>
      </InfShell>
    </>
  );
}
