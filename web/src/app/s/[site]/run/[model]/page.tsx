import "@/sites/infkey/theme.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getHfModel, hfName, hfOrg, RUN_INDEX_TOP } from "@/lib/aidata";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { PageHead, FitBadge } from "@/sites/infkey/data-ui";
import { GPUS, QUANTS, estimate, fmtParams, needGb } from "@/sites/infkey/gpus";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { infMeta } from "@/sites/infkey/meta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string; model: string }> }): Promise<Metadata> {
  const p = await params;
  const site = getSite(p.site);
  const m = await getHfModel(p.model);
  if (!site || site.id !== "infkey" || !m) return {};
  const n = hfName(m);
  return infMeta(
    site,
    `Can I run ${n} locally? VRAM needed & which GPUs work`,
    `${n} (${fmtParams(m.params)} parameters) needs about ${needGb(m.params, 0.6).toFixed(0)} GB at 4-bit and ${needGb(m.params, 2).toFixed(0)} GB at 16-bit. See which GPUs and Macs can run it and how fast.`,
    `/run/${m.id}`,
    m.rank > RUN_INDEX_TOP,
  );
}

export default async function RunModelPage({ params }: { params: Promise<{ site: string; model: string }> }) {
  const p = await params;
  const site = getSite(p.site);
  if (!site || site.id !== "infkey") notFound();
  const m = await getHfModel(p.model);
  if (!m) notFound();
  const n = hfName(m);
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const rows = GPUS.map((g) => ({ g, q: QUANTS.map((q) => estimate(m.params, g, q.bytes)) }));
  const fitsAny = rows.filter((r) => r.q[2].fit !== "no");
  const cheapest = fitsAny.sort((a, c) => a.g.vram - c.g.vram)[0];
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: base }, { name: "Can I run it?", url: `${base}/run` }, { name: n, url: `${base}/run/${m.id}` }])} />
      <InfShell site={site}>
        <PageHead
          kicker={hfOrg(m)}
          title={`Can I run ${n} locally?`}
          dek={`${n} has ${fmtParams(m.params)} parameters. It needs about ${needGb(m.params, 0.6).toFixed(1)} GB of GPU memory at 4-bit, ${needGb(m.params, 1.07).toFixed(1)} GB at 8-bit and ${needGb(m.params, 2).toFixed(1)} GB at full 16-bit precision.${cheapest ? ` The smallest card here that runs it at 4-bit is the ${cheapest.g.name} (${cheapest.g.vram} GB).` : " No single consumer GPU here can hold it; it needs multiple GPUs or a datacenter card."}`}
        />
        <div className="price-cards">
          {QUANTS.map((q) => (
            <div className="pcard lg" key={q.id}>
              <div className="k">{q.name}</div>
              <div className="v">
                {needGb(m.params, q.bytes).toFixed(1)} <small>GB</small>
              </div>
            </div>
          ))}
        </div>
        <div className="itable-wrap">
          <table className="itable">
            <thead>
              <tr>
                <th>GPU / Mac</th>
                <th className="num">Memory</th>
                <th>4-bit</th>
                <th>8-bit</th>
                <th>16-bit</th>
                <th className="num">Speed (4-bit)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ g, q }) => (
                <tr key={g.id}>
                  <td>
                    <Link className="m-name" href={`${b}/run/${m.id}/${g.id}`}>
                      <b>{g.name}</b>
                    </Link>
                  </td>
                  <td className="num" data-label="VRAM">{g.vram} GB</td>
                  <td data-label="4-bit"><FitBadge fit={q[2].fit} /></td>
                  <td data-label="8-bit"><FitBadge fit={q[1].fit} /></td>
                  <td data-label="16-bit"><FitBadge fit={q[0].fit} /></td>
                  <td className="num" data-label="Speed">{q[2].tps ? `~${q[2].tps} tok/s` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="src-note">
          Estimates: weights + ~1.5 GB runtime + a short (~8K) context. Speed ≈ memory bandwidth ÷ model size; real speed depends on the app (llama.cpp, Ollama, LM Studio, vLLM), drivers and context length. Model size from{" "}
          <a href={`https://huggingface.co/${m.hf_id}`} target="_blank" rel="noopener noreferrer nofollow">
            Hugging Face
          </a>
          .
        </p>
      </InfShell>
    </>
  );
}
