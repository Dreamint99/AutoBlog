import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { getRule } from "@/sites/gccguide/hub/rules";
import GratuityPage from "@/sites/gccguide/hub/GratuityPage";
import { GULF_CURRENCIES, INDEX } from "@/sites/gccguide/hub/config";
import { parseExampleSlug } from "@/sites/gccguide/hub/gratuity";
import { fmt } from "@/sites/gccguide/hub/format";

export const dynamic = "force-dynamic";

/** Only these lengths of service are indexed at launch — the ones people
 *  actually search for. Everything else stays reachable but noindex. */
const INDEXED_YEARS = new Set([3, 5, 7, 10]);

type Props = { params: Promise<{ site: string; country: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: id, country, slug } = await params;
  const site = getSite(id);
  const g = GULF_CURRENCIES.find((c) => c.country === country);
  const ex = parseExampleSlug(slug);
  const rule = getRule(country);
  if (!site || site.id !== "gccguide" || !g || !ex || !ex) return {};
  const ok = Boolean(rule?.gratuity.confirmed) && INDEX.calculatorExamples && INDEXED_YEARS.has(ex.years);
  return {
    title: `Gratuity for ${g.code} ${fmt(ex.wage, 0)} basic after ${ex.years} years in ${g.short}`,
    description: `How much end-of-service gratuity ${g.short} labour law gives on a ${g.code} ${fmt(ex.wage, 0)} ${rule?.gratuity.wage_base === "basic" ? "basic " : ""}wage after ${ex.years} years — with the full calculation, the article and the official source.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/gratuity/${country}/${slug}` },
    robots: ok ? { index: true, follow: true, "max-image-preview": "large" } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: `Gratuity after ${ex.years} years in ${g.short}`, description: `${g.code} ${fmt(ex.wage, 0)} wage after ${ex.years} years.`, type: "website", url: `/gratuity/${country}/${slug}` },
  };
}

export default async function Page({ params }: Props) {
  const { site: id, country, slug } = await params;
  const site = getSite(id);
  const g = GULF_CURRENCIES.find((c) => c.country === country);
  const ex = parseExampleSlug(slug);
  const rule = getRule(country);
  if (!site || site.id !== "gccguide" || !g || !ex || !rule) notFound();

  const base = siteBaseUrl(site);
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: site.name, url: base },
          { name: "Calculators", url: `${base}/calculators` },
          { name: `Gratuity — ${g.short}`, url: `${base}/gratuity/${country}` },
          { name: `${ex.years} years`, url: `${base}/gratuity/${country}/${slug}` },
        ])}
      />
      <GratuityPage
        site={site}
        country={country}
        countryName={g.short}
        currency={g.code}
        rule={rule.gratuity}
        input={{ monthlyWage: ex.wage, years: ex.years, reason: "resignation" }}
        example={{ wage: ex.wage, years: ex.years }}
      />
    </>
  );
}
