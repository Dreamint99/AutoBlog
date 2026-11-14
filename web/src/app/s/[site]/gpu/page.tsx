import "@/sites/infkey/theme.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getHfModels, hfName } from "@/lib/aidata";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { PageHead } from "@/sites/infkey/data-ui";
import { GPUS, estimate, fmtParams, type Gpu } from "@/sites/infkey/gpus";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { infMeta } from "@/sites/infkey/meta";

export const dynamic = "force-dynamic";

const KINDS: Array<[Gpu["kind"], string]> = [
  ["nvidia", "NVIDIA GeForce"],
  ["amd", "AMD Radeon"],
  ["intel", "Intel Arc"],
  ["apple", "Apple Silicon (unified memory)"],
  ["datacenter", "Datacenter & workstation"],
];

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const site = getSite((await params).site);
  if (!site || site.id !== "infkey") return {};
  return infMeta(
    site,
    `GPUs for local AI: VRAM, bandwidth & what each card can run (${GPUS.length} GPUs)`,
    `Every popular graphics card and Apple chip for running AI models locally: VRAM, memory bandwidth, how many of the most downloaded open models fit at 4-bit, and the largest one.`,
    "/gpu",
  );
}

export default async function GpuIndex({ params }: { params: Promise<{ site: string }> }) {
  const site = getSite((await params).site);
  if (!site || site.id !== "infkey") notFound();
  const models = await getHfModels();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const rows = GPUS.map((g) => {
    const fits = models.filter((m) => estimate(m.params, g, 0.6).fit !== "no");
    const biggest = fits.reduce<(typeof models)[number] | null>((a, m) => (!a || m.params > a.params ? m : a), null);
    return { g, fits: fits.length, biggest };
  });

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: base }, { name: "Can I run it?", url: `${base}/run` }, { name: "GPUs", url: `${base}/gpu` }])} />
      <InfShell site={site}>
        <PageHead
          kicker={`${GPUS.length} GPUs · ${models.length} open models`}
          title="Which GPU runs which AI model?"
          dek="VRAM decides what fits; memory bandwidth decides how fast it runs. Pick your card to see every popular open model it can run locally."
        />
        {KINDS.map(([kind, label]) => {
          const list = rows.filter((r) => r.g.kind === kind).sort((a, c) => c.g.vram - a.g.vram || c.g.bw - a.g.bw);
          if (!list.length) return null;
          return (
            <section key={kind}>
              <div className="section-head">
                <h2>{label}</h2>
                <span className="rule" />
              </div>
              <div className="itable-wrap">
                <table className="itable">
                  <thead>
                    <tr>
                      <th>GPU</th>
                      <th className="num">VRAM</th>
                      <th className="num">Bandwidth</th>
                      <th className="num">Models that fit (4-bit)</th>
                      <th>Largest that fits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(({ g, fits, biggest }) => (
                      <tr key={g.id}>
                        <td>
                          <Link className="m-name" href={`${b}/gpu/${g.id}`}>
                            <b>{g.name}</b>
                          </Link>
                        </td>
                        <td className="num" data-label="VRAM">{g.vram} GB</td>
                        <td className="num" data-label="Bandwidth">{g.bw} GB/s</td>
                        <td className="num" data-label="Fit at 4-bit">
                          {fits} / {models.length}
                        </td>
                        <td data-label="Largest">{biggest ? `${hfName(biggest)} (${fmtParams(biggest.params)})` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
        <p className="src-note">
          Estimates for a short (~8K) context at 4-bit (Q4_K_M). Memory and bandwidth from each vendor&apos;s spec sheet; model sizes from Hugging Face.{" "}
          <Link href={`${b}/run`}>Search by model instead →</Link>
        </p>
      </InfShell>
    </>
  );
}
