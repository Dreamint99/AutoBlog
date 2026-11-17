import { defaultOgImages } from "@/lib/og";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import {
  getVisaCountryBySlug,
  getVisaPair,
  getVisaDataDate,
  fmtDataDate,
  shouldIndexPair,
  REQ_LABELS,
} from "@/lib/visa";
import VisaPairPage from "@/sites/walvi/visa/PairPage";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ site: string; pair: string }> };

// Pair slug format: <passport-slug>-to-<destination-slug>
function parsePairSlug(slug: string): { passportSlug: string; destSlug: string } | null {
  const match = slug.match(/^(.+)-to-(.+)$/);
  if (!match) return null;
  return { passportSlug: match[1], destSlug: match[2] };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { site: id, pair: slug } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};

  const parsed = parsePairSlug(slug);
  if (!parsed) return {};

  const [passport, destination] = await Promise.all([
    getVisaCountryBySlug(parsed.passportSlug),
    getVisaCountryBySlug(parsed.destSlug),
  ]);
  if (!passport || !destination) return {};

  const pair = await getVisaPair(passport.iso2, destination.iso2);
  if (!pair) return {};

  const reqLabel = REQ_LABELS[pair.requirement];
  const title = `${passport.name} to ${destination.name} Visa Requirements ${new Date().getFullYear()} | VisaPoint`;
  const description = `Do ${passport.name} citizens need a visa for ${destination.name}? ${reqLabel}${pair.days ? ` for ${pair.days} days` : ""}. Check official requirements and apply online.`;

  const shouldIndex = shouldIndexPair(passport.iso2, destination.iso2);

  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/visa/${slug}` },
    robots: { index: shouldIndex, follow: true },
    openGraph: {
      images: defaultOgImages(),
      title,
      description,
      type: "website",
      url: `/visa/${slug}`,
      siteName: "VisaPoint",
    },
  };
}

export default async function Page({ params }: P) {
  const { site: id, pair: slug } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();

  const parsed = parsePairSlug(slug);
  if (!parsed) notFound();

  const [passport, destination] = await Promise.all([
    getVisaCountryBySlug(parsed.passportSlug),
    getVisaCountryBySlug(parsed.destSlug),
  ]);
  if (!passport || !destination) notFound();

  const [pair, dataDate] = await Promise.all([
    getVisaPair(passport.iso2, destination.iso2),
    getVisaDataDate(),
  ]);
  if (!pair) notFound();

  const base = siteBaseUrl(site);
  const reqLabel = REQ_LABELS[pair.requirement];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "VisaPoint", url: base },
            { name: "Visa Checker", url: `${base}/visa-checker` },
            { name: `${passport.name} to ${destination.name}`, url: `${base}/visa/${slug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `Do ${passport.name} citizens need a visa for ${destination.name}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `${reqLabel}${pair.days ? `. ${passport.name} passport holders can stay for up to ${pair.days} days.` : ". Check with the embassy for the allowed duration."} Requirements can change — always confirm with the official embassy or visa portal before travel.`,
                },
              },
              {
                "@type": "Question",
                name: `How long can ${passport.name} citizens stay in ${destination.name}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: pair.days
                    ? `${passport.name} passport holders can stay in ${destination.name} for up to ${pair.days} days under the ${reqLabel.toLowerCase()} policy.`
                    : `The allowed stay duration for ${passport.name} passport holders in ${destination.name} depends on the visa type. Contact the ${destination.name} embassy for specific details.`,
                },
              },
            ],
          },
        ]}
      />
      <VisaPairPage
        site={site}
        passport={passport}
        destination={destination}
        pair={pair}
        dataDate={fmtDataDate(dataDate)}
      />
    </>
  );
}
