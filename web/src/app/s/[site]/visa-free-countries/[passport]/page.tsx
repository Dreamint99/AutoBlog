import { defaultOgImages } from "@/lib/og";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import {
  getVisaCountryBySlug,
  getVisaFreeCountries,
  getPassportRanking,
  getVisaDataDate,
  fmtDataDate,
  shouldIndexPassportPage,
  REQ_LABELS,
  REQ_COLORS,
  type DestinationByCategory,
  type VisaRequirement,
} from "@/lib/visa";
import VisaFreeCountriesPage from "@/sites/walvi/visa/VisaFreePage";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ site: string; passport: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { site: id, passport: slug } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};

  const country = await getVisaCountryBySlug(slug);
  if (!country) return {};

  const destinations = await getVisaFreeCountries(country.iso2);
  const visaFree = destinations.filter((d) => d.requirement === "visa_free").length;
  const voa = destinations.filter((d) => d.requirement === "visa_on_arrival").length;
  const eta = destinations.filter((d) => d.requirement === "eta").length;
  const total = visaFree + voa + eta;

  const title = `${country.name} Passport: Visa-Free Countries ${new Date().getFullYear()} | VisaPoint`;
  const description = `${country.name} passport holders can visit ${total} countries without a prior visa: ${visaFree} visa-free, ${voa} visa on arrival, ${eta} eTA. Full list with allowed days.`;

  const shouldIndex = shouldIndexPassportPage(country.iso2);

  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/visa-free-countries/${slug}` },
    robots: { index: shouldIndex, follow: true },
    openGraph: {
      images: defaultOgImages(),
      title,
      description,
      type: "website",
      url: `/visa-free-countries/${slug}`,
      siteName: "VisaPoint",
    },
  };
}

export default async function Page({ params }: P) {
  const { site: id, passport: slug } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();

  const country = await getVisaCountryBySlug(slug);
  if (!country) notFound();

  const [destinations, ranking, dataDate] = await Promise.all([
    getVisaFreeCountries(country.iso2),
    getPassportRanking(),
    getVisaDataDate(),
  ]);

  if (!destinations.length) notFound();

  const passportRank = ranking.find((r) => r.passport === country.iso2);
  const base = siteBaseUrl(site);

  // Group by requirement category
  const grouped: Record<VisaRequirement, DestinationByCategory[]> = {
    visa_free: [],
    visa_on_arrival: [],
    eta: [],
    e_visa: [],
    visa_required: [],
    no_admission: [],
  };
  for (const d of destinations) {
    grouped[d.requirement].push(d);
  }

  const score = grouped.visa_free.length + grouped.visa_on_arrival.length + grouped.eta.length;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "VisaPoint", url: base },
            { name: "Visa-Free Countries", url: `${base}/visa-free-countries` },
            { name: country.name, url: `${base}/visa-free-countries/${slug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: `${country.name} Passport Visa Requirements`,
            description: `Visa requirements for ${country.name} passport holders to ${destinations.length} countries.`,
            url: `${base}/visa-free-countries/${slug}`,
            dateModified: dataDate,
            creator: { "@type": "Organization", name: "VisaPoint", url: base },
            license: "https://opensource.org/licenses/MIT",
            isAccessibleForFree: true,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `How many countries can ${country.name} passport holders visit visa-free?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `${country.name} passport holders can enter ${score} countries without a prior visa: ${grouped.visa_free.length} visa-free, ${grouped.visa_on_arrival.length} with a visa on arrival, and ${grouped.eta.length} with an electronic travel authorisation (eTA).`,
                },
              },
              {
                "@type": "Question",
                name: `What is the ${country.name} passport ranking?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: passportRank
                    ? `The ${country.name} passport ranks #${passportRank.rank} in the VisaPoint Passport Index with a mobility score of ${passportRank.score}.`
                    : `See the VisaPoint Passport Index for the current ${country.name} passport ranking.`,
                },
              },
            ],
          },
        ]}
      />
      <VisaFreeCountriesPage
        site={site}
        country={country}
        grouped={grouped}
        score={score}
        rank={passportRank?.rank}
        totalPassports={ranking.length}
        dataDate={fmtDataDate(dataDate)}
        neighbours={ranking.filter((r) => Math.abs(r.rank - (passportRank?.rank ?? 0)) <= 2 && r.passport !== country.iso2).slice(0, 4)}
      />
    </>
  );
}
