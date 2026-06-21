import "@/sites/infkey/theme.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getModel, getModels } from "@/lib/models";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { fmtUsd, fmtContext, fmtDate } from "@/sites/infkey/data-ui";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; id: string }>;
}): Promise<Metadata> {
  const { site: id, id: modelId } = await params;
  const site = getSite(id);
  const model = site?.id === "infkey" ? await getModel(modelId) : undefined;
  if (!site || !model) return {};
  return {
    title: `${model.name} API Pricing & Specs — InfKey`,
    description: `${model.name} (${model.provider}): verified input/output pricing, ${fmtContext(
      model.max_context,
    )} context, capabilities and official source.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/models/${model.id}` },
    openGraph: {
      title: `${model.name} API Pricing & Specs — InfKey`,
      description: `${model.name} (${model.provider}) verified API pricing, context window and capabilities.`,
      type: "website",
      url: `/models/${model.id}`,
    },
    twitter: { card: "summary_large_image", title: `${model.name} API Pricing — InfKey` },
  };
}

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ site: string; id: string }>;
}) {
  const { site: id, id: modelId } = await params;
  const site = getSite(id);
  if (!site || site.id !== "infkey") notFound();
  const model = await getModel(modelId);
  if (!model) notFound();

  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const others = (await getModels(model.category)).filter((m) => m.id !== model.id).slice(0, 4);

  const specs: ReadonlyArray<[string, string]> = [
    ["Context window", fmtContext(model.max_context) + (model.max_context ? " tokens" : "")],
    ["Max output", model.max_output ? model.max_output.toLocaleString("en-US") + " tokens" : "—"],
    ["Latency", model.latency_note ?? "—"],
    ["Commercial use", model.commercial_use ? "Allowed" : "Restricted"],
    ["Version", model.version ?? "—"],
  ];

  const caps: ReadonlyArray<[string, boolean]> = [
    ["Vision", model.supports_vision],
    ["Audio", model.supports_audio],
    ["Function calling", model.supports_functions],
    ["Structured / JSON", model.supports_structured],
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: site.name, url: base },
          { name: "Models", url: `${base}/models` },
          { name: model.name, url: `${base}/models/${model.id}` },
        ])}
      />
      <InfShell site={site}>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href={b}>{site.name}</Link>
        <span className="sep" aria-hidden="true">
          /
        </span>
        <Link href={`${b}/models`}>Models</Link>
        <span className="sep" aria-hidden="true">
          /
        </span>
        <span className="here">{model.name}</span>
      </nav>

      <header className="page-head">
        <div className="article-cat">{model.provider}</div>
        <h1 className="page-title">{model.name} API pricing</h1>
        {model.notes ? <p className="page-dek">{model.notes}</p> : null}
        <div className="verified-band">
          <span className="vb-tag">Pricing verified</span>
          <span className="vb-date">{fmtDate(model.last_verified)}</span>
          <span className="vb-note">USD per 1M tokens · confirm with the provider before relying on it.</span>
        </div>
      </header>

      <div className="price-cards">
        <div className="pcard">
          <div className="k">Input</div>
          <div className="v">
            {fmtUsd(model.input_per_m, 3)} <small>/1M</small>
          </div>
        </div>
        <div className="pcard">
          <div className="k">Output</div>
          <div className="v">
            {fmtUsd(model.output_per_m, 2)} <small>/1M</small>
          </div>
        </div>
        <div className="pcard">
          <div className="k">Cached input</div>
          <div className="v">
            {model.cached_input_per_m !== null ? fmtUsd(model.cached_input_per_m, 3) : "—"}{" "}
            <small>/1M</small>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <section className="spec-block">
          <h2 className="block-h">Specifications</h2>
          <dl className="spec-list">
            {specs.map(([k, v]) => (
              <div className="spec-row" key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="spec-block">
          <h2 className="block-h">Capabilities</h2>
          <div className="cap-grid">
            {caps.map(([k, on]) => (
              <div className={`cap-row${on ? " on" : ""}`} key={k}>
                <span className="cap-ic" aria-hidden="true">
                  {on ? "✓" : "—"}
                </span>
                {k}
              </div>
            ))}
          </div>
          {model.official_source ? (
            <a className="src-link" href={model.official_source} target="_blank" rel="noopener noreferrer nofollow">
              Official pricing source ↗
            </a>
          ) : null}
        </section>
      </div>

      <div className="cta-row">
        <Link className="btn btn-primary" href={`${b}/calculators#calculator`}>
          ▸ Estimate cost in the calculator
        </Link>
        <Link className="btn btn-ghost" href={`${b}/compare`}>
          Compare with another model
        </Link>
      </div>

      {others.length > 0 ? (
        <>
          <div className="section-head">
            <h2>Compare {model.name} with</h2>
            <span className="rule" />
          </div>
          <div className="vs-links">
            {others.map((o) => (
              <Link className="vs-link" href={`${b}/compare/${model.id}-vs-${o.id}`} key={o.id}>
                {model.name} <span className="vs">vs</span> {o.name}
              </Link>
            ))}
          </div>
        </>
      ) : null}
      </InfShell>
    </>
  );
}
