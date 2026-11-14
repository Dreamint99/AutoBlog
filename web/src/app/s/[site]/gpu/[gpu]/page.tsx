import "@/sites/infkey/theme.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getHfModels, hfName, hfOrg } from "@/lib/aidata";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { PageHead, FitBadge } from "@/sites/infkey/data-ui";
import { estimate, fmtParams, getGpu } from "@/sites/infkey/gpus";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { infMeta } from "@/sites/infkey/meta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string; gpu: string }> }): Promise<Metadata> {
  const p = await params;
  const site = getSite(p.site);
  const g = getGpu(p.gpu);
  if (!site || site.id !== "infkey" || !g) return {};
  return infMeta(site, `Best AI models for ${g.name}${/GB\)?$/.test(g.name) ? "" : ` (${g.vram} GB)`} — what can it run?`, `Which local AI models run on the ${g.name} with ${g.vram} GB: the biggest and most popular open models that fit at 4-bit and 8-bit, with estimated speed.`, `/gpu/${g.id}`, !g.top);
}

export default async function GpuPage({ params }: { params: Promise<{ site: string; gpu: string }> }) {
  const p = await params;
  const site = getSite(p.site);
  const g = getGpu(p.gpu);
  if (!site || site.id !== "infkey" || !g) notFound();
  const all = await getHfModels();
  const rows = all.map((m) => ({ m, e4: estimate(m.params, g, 0.6), e8: estimate(m.params, g, 1.07) })).filter((r) => r.e4.fit !== "no");
  const biggest = [...rows].sort((a, c) => c.m.params - a.m.params)[0];
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: base }, { name: "Can I run it?", url: `${base}/run` }, { name: g.name, url: `${base}/gpu/${g.id}` }])} />
      <InfShell site={site}>
        <PageHead
          kicker={`${g.vram} GB · ${g.bw} GB/s`}
          title={`What AI models can the ${g.name} run?`}
          dek={`${rows.length} of the ${all.length} most popular open models fit on the ${g.name} at 4-bit.${biggest ? ` The largest is ${hfName(biggest.m)} (${fmtParams(biggest.m.params)}).` : ""} Most downloaded first.`}
        />
        <div className="itable-wrap">
          <table className="itable">
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Size</th>
                <th>4-bit</th>
                <th>8-bit</th>
                <th className="num">Speed (4-bit)</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 150).map(({ m, e4, e8 }) => (
                <tr key={m.id}>
                  <td>
                    <Link className="m-name" href={`${b}/run/${m.id}/${g.id}`}>
                      <b>{hfName(m)}</b>
                      <span className="m-vendor">{hfOrg(m)}</span>
                    </Link>
                  </td>
                  <td className="num" data-label="Size">{fmtParams(m.params)}</td>
                  <td data-label="4-bit"><FitBadge fit={e4.fit} /></td>
                  <td data-label="8-bit"><FitBadge fit={e8.fit} /></td>
                  <td className="num" data-label="Speed">~{e4.tps} tok/s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="src-note">Estimates for a short (~8K) context. Speed depends on the app and settings. Memory and bandwidth from the vendor&apos;s spec sheet.</p>
      </InfShell>
    </>
  );
}
