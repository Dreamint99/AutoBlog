import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { getRule } from "@/sites/gccguide/hub/rules";
import GratuityPage from "@/sites/gccguide/hub/GratuityPage";
import { GULF_CURRENCIES, INDEX } from "@/sites/gccguide/hub/config";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ site: string; country: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseInput(sp: Record<string, string | string[] | undefined>) {
  const num = (v: string | string[] | undefined) => {
    const s = Array.isArray(v) ? v[0] : v;
    const n = Number(s);
    return s != null && s !== "" && Number.isFinite(n) ? n : null;
  };
  const wage = num(sp.wage);
  const years = num(sp.years);
  const reasonRaw = Array.isArray(sp.reason) ? sp.reason[0] : sp.reason;
  const reason = reasonRaw === "termination" ? "termination" : "resignation";
  if (wage == null && years == null) return null;
  return {
    monthlyWage: Math.min(Math.max(wage ?? 5000, 0), 10_000_000),
    years: Math.min(Math.max(years ?? 5, 0), 50),
    reason: reason as "resignation" | "termination",
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: id, country } = await params;
  const site = getSite(id);
  const g = GULF_CURRENCIES.find((c) => c.country === country);
  const rule = getRule(country);
  if (!site || site.id !== "gccguide" || !g) return {};
  const confirmed = Boolean(rule?.gratuity.confirmed);
  return {
    title: `Gratuity calculator ${g.short} ${new Date().getUTCFullYear()} — end-of-service pay (${g.code})`,
    description: `Work out your ${g.short} end-of-service gratuity: ${confirmed ? "the statutory formula, the article it comes from and worked examples" : "formula pending verification against an official source"}. Resignation and termination.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/gratuity/${country}` },
    robots: confirmed && INDEX.calculators ? { index: true, follow: true, "max-image-preview": "large" } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: `Gratuity calculator — ${g.short}`, description: `End-of-service pay under ${g.short} labour law.`, type: "website", url: `/gratuity/${country}` },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { site: id, country } = await params;
  const site = getSite(id);
  const g = GULF_CURRENCIES.find((c) => c.country === country);
  const rule = getRule(country);
  if (!site || site.id !== "gccguide" || !g || !rule) notFound();
  const sp = await searchParams;
  const input = parseInput(sp);

  const base = siteBaseUrl(site);
  const url = `${base}/gratuity/${country}`;
  const faq =
    rule.gratuity.confirmed
      ? [
          { q: `How is gratuity calculated in ${g.short}?`, a: rule.gratuity.plain_english },
          { q: `Which article of the ${g.short} labour law covers end-of-service pay?`, a: `${rule.gratuity.article}. The text is linked on this page.` },
        ]
      : [];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Calculators", url: `${base}/calculators` },
            { name: `Gratuity — ${g.short}`, url },
          ]),
          ...(faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
        ]}
      />
      <GratuityPage site={site} country={country} countryName={g.short} currency={g.code} rule={rule.gratuity} input={input} />
    </>
  );
}
