import "@/sites/infkey/theme.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getHfModels, hfName, hfOrg } from "@/lib/aidata";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { PageHead } from "@/sites/infkey/data-ui";
import { GPUS, fmtParams, needGb } from "@/sites/infkey/gpus";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { infMeta } from "@/sites/infkey/meta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const site = getSite((await params).site);
  if (!site || site.id !== "infkey") return {};
  return infMeta(site, "Can I run this AI model locally? VRAM calculator for 500+ models", "Check if Llama, Qwen, Mistral, Gemma, DeepSeek and 500+ open AI models fit on your GPU or Mac: VRAM needed at FP16, 8-bit and 4-bit, and estimated speed.", "/run");
}

export default async function RunHub({ params }: { params: Promise<{ site: string }> }) {
  const site = getSite((await params).site);
  if (!site || site.id !== "infkey") notFound();
  const models = (await getHfModels()).slice(0, 200);
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: base }, { name: "Can I run it?", url: `${base}/run` }])} />
      <InfShell site={site}>
        <PageHead kicker="Run AI locally" title="Can I run this AI model on my computer?" dek="Pick a model to see how much GPU memory it needs and which graphics cards and Macs can run it. Most-downloaded open models first." />
        <div className="section-head">
          <h2>Pick your GPU or Mac</h2>
          <span className="rule" />
        </div>
        <div className="vs-links">
          {GPUS.filter((g) => g.top).map((g) => (
            <Link className="vs-link" href={`${b}/gpu/${g.id}`} key={g.id}>
              {g.name} <span className="vs">{g.vram} GB</span>
            </Link>
          ))}
          <Link className="vs-link" href={`${b}/gpu`}>
            All {GPUS.length} GPUs →
          </Link>
        </div>
        <div className="section-head">
          <h2>Popular open models</h2>
          <span className="rule" />
        </div>
        <div className="itable-wrap">
          <table className="itable">
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Size</th>
                <th className="num">4-bit needs</th>
                <th className="num">16-bit needs</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link className="m-name" href={`${b}/run/${m.id}`}>
                      <b>{hfName(m)}</b>
                      <span className="m-vendor">{hfOrg(m)}</span>
                    </Link>
                  </td>
                  <td className="num">{fmtParams(m.params)}</td>
                  <td className="num accent">{needGb(m.params, 0.6).toFixed(1)} GB</td>
                  <td className="num">{needGb(m.params, 2).toFixed(1)} GB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="src-note">Model sizes from Hugging Face (parameter counts of the published weights). Memory figures are estimates for a short (~8K token) context; long contexts need more.</p>
      </InfShell>
    </>
  );
}
