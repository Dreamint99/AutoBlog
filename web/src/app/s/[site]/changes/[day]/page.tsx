import "@/sites/infkey/theme.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getChangeDays } from "@/lib/models";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import ChangesView, { changeSummary } from "@/sites/infkey/Changes";
import { fmtDate } from "@/sites/infkey/data-ui";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { infMeta } from "@/sites/infkey/meta";

export const dynamic = "force-dynamic";

const ok = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

export async function generateMetadata({ params }: { params: Promise<{ site: string; day: string }> }): Promise<Metadata> {
  const p = await params;
  const site = getSite(p.site);
  if (!site || site.id !== "infkey" || !ok(p.day)) return {};
  const c = await changeSummary(p.day);
  const date = fmtDate(p.day);
  const bits = [c.down.length ? `${c.down.length} price drops` : "", c.up.length ? `${c.up.length} increases` : "", c.added.length ? `${c.added.length} new models` : ""].filter(Boolean).join(", ");
  // A day with nothing new is still useful to visitors but not worth indexing.
  return infMeta(site, `AI API price changes on ${date}${bits ? `: ${bits}` : ""}`, `AI model API prices on ${date}: ${bits || "no changes"}. Old vs new price per 1M tokens for every model that moved.`, `/changes/${p.day}`, c.n === 0);
}

export default async function ChangesDay({ params }: { params: Promise<{ site: string; day: string }> }) {
  const p = await params;
  const site = getSite(p.site);
  if (!site || site.id !== "infkey" || !ok(p.day)) notFound();
  if (!(await getChangeDays()).includes(p.day)) notFound();
  const base = siteBaseUrl(site);
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: base }, { name: "AI price changes", url: `${base}/changes` }, { name: fmtDate(p.day), url: `${base}/changes/${p.day}` }])} />
      <InfShell site={site}>
        <ChangesView site={site} day={p.day} />
      </InfShell>
    </>
  );
}
