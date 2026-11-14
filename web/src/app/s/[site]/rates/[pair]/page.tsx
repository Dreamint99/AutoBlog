import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { parsePair, buildRateView } from "@/sites/gccguide/hub/rates";
import RatePage from "@/sites/gccguide/hub/RatePage";
import { dateLong, fmt } from "@/sites/gccguide/hub/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ site: string; pair: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: id, pair } = await params;
  const site = getSite(id);
  const p = parsePair(pair);
  if (!site || site.id !== "gccguide" || !p) return {};
  const v = await buildRateView(p);
  if (!v) return { title: "Rate unavailable" };
  return {
    title: v.title,
    description: v.description,
    metadataBase: new URL(siteBaseUrl(site)),
    // Reverse pairs duplicate the forward page's content, so they point at it.
    alternates: { canonical: v.reverse ? v.canonical : `/rates/${pair.toLowerCase()}` },
    robots: v.reverse ? { index: false, follow: true } : { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      images: defaultOgImages(),
      title: v.title,
      description: v.description,
      type: "website",
      url: `/rates/${pair.toLowerCase()}`,
    },
    twitter: { card: "summary_large_image", title: v.title, description: v.description },
  };
}

export default async function Page({ params }: Props) {
  const { site: id, pair } = await params;
  const site = getSite(id);
  const p = parsePair(pair);
  if (!site || site.id !== "gccguide" || !p) notFound();
  const v = await buildRateView(p);
  if (!v) notFound();

  const base = siteBaseUrl(site);
  const url = `${base}/rates/${pair.toLowerCase()}`;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Exchange rates", url: `${base}/rates` },
            { name: `${v.from} to ${v.to}`, url },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ExchangeRateSpecification",
            name: `${v.from}/${v.to} exchange rate`,
            url,
            dateModified: v.updated,
            currentExchangeRate: {
              "@type": "UnitPriceSpecification",
              price: Number(v.rate!.toFixed(6)),
              priceCurrency: v.to,
              unitText: `1 ${v.from}`,
            },
            // The visible page states the same thing in words.
            description: `1 ${v.from} = ${fmt(v.rate!, v.dp)} ${v.to} on ${dateLong(v.asOf)}.`,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: v.faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
      <RatePage site={site} v={v} />
    </>
  );
}
