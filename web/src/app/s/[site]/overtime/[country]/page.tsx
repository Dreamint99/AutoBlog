import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { buildRuleMetadata, RuleCalcRoute } from "@/sites/gccguide/hub/rule-routes";
import { GULF_CURRENCIES } from "@/sites/gccguide/hub/config";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ site: string; country: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return buildRuleMetadata("overtime", params);
}

export default async function Page({ params, searchParams }: Props) {
  const { site: id, country } = await params;
  const site = getSite(id);
  const g = GULF_CURRENCIES.find((c) => c.country === country);
  if (!site || site.id !== "gccguide" || !g) notFound();
  const body = await RuleCalcRoute("overtime", params, searchParams);
  if (!body) notFound();
  const base = siteBaseUrl(site);
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: site.name, url: base },
          { name: "Calculators", url: `${base}/calculators` },
          { name: g.short, url: `${base}/overtime/${country}` },
        ])}
      />
      {body}
    </>
  );
}
