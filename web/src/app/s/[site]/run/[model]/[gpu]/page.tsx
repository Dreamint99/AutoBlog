import "@/sites/infkey/theme.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getHfModel, hfName } from "@/lib/aidata";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { PageHead } from "@/sites/infkey/data-ui";
import { QUANTS, estimate, fmtParams, getGpu } from "@/sites/infkey/gpus";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { infMeta } from "@/sites/infkey/meta";

export const dynamic = "force-dynamic";

async function load(p: { site: string; model: string; gpu: string }) {
  const site = getSite(p.site);
  const m = await getHfModel(p.model);
  const g = getGpu(p.gpu);
  return { site, m, g };
}

export async function generateMetadata({ params }: { params: Promise<{ site: string; model: string; gpu: string }> }): Promise<Metadata> {
  const { site, m, g } = await load(await params);
  if (!site || site.id !== "infkey" || !m || !g) return {};
  const q4 = estimate(m.params, g, 0.6);
  const ans = q4.fit === "no" ? "No" : q4.fit === "tight" ? "Barely" : "Yes";
  // Pair pages start as noindex; promote the ones that show search demand later.
  return infMeta(site, `Can ${g.name} run ${hfName(m)}? ${ans} — VRAM & speed`, `${hfName(m)} on ${g.name} (${g.vram} GB): needs ~${q4.need.toFixed(1)} GB at 4-bit. ${ans === "No" ? "It does not fit." : `Estimated ~${q4.tps} tokens/s.`}`, `/run/${m.id}/${g.id}`, true);
}

export default async function RunPairPage({ params }: { params: Promise<{ site: string; model: string; gpu: string }> }) {
  const { site, m, g } = await load(await params);
  if (!site || site.id !== "infkey" || !m || !g) notFound();
  const n = hfName(m);
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const res = QUANTS.map((q) => ({ q, e: estimate(m.params, g, q.bytes) }));
  const best = res.find((r) => r.e.fit === "fits") ?? res.find((r) => r.e.fit === "tight");
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: base }, { name: n, url: `${base}/run/${m.id}` }, { name: g.name, url: `${base}/run/${m.id}/${g.id}` }])} />
      <InfShell site={site}>
        <PageHead
          kicker="Can I run it?"
          title={`Can ${g.name} run ${n}?`}
          dek={best ? `Yes. ${n} (${fmtParams(m.params)}) runs on the ${g.name} (${g.vram} GB) at ${best.q.name}, at roughly ${best.e.tps} tokens per second (estimate).` : `No. ${n} (${fmtParams(m.params)}) is too big for the ${g.name} (${g.vram} GB) even at 4-bit. Try a smaller model or a card with more memory.`}
        />
        <div className="itable-wrap">
          <table className="itable">
            <thead>
              <tr>
                <th>Precision</th>
                <th className="num">Memory needed</th>
                <th>Result</th>
                <th className="num">Speed</th>
              </tr>
            </thead>
            <tbody>
              {res.map(({ q, e }) => (
                <tr key={q.id}>
                  <td>{q.name}</td>
                  <td className="num">{e.need.toFixed(1)} GB</td>
                  <td>{e.fit === "fits" ? "Runs" : e.fit === "tight" ? "Barely fits" : "Too big"}</td>
                  <td className="num">{e.tps ? `~${e.tps} tok/s` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="src-note">
          Estimates only. <Link href={`${b}/run/${m.id}`}>All GPUs for {n}</Link> · <Link href={`${b}/gpu/${g.id}`}>Best models for the {g.name}</Link>
        </p>
      </InfShell>
    </>
  );
}
