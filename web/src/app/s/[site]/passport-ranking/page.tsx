import { defaultOgImages } from "@/lib/og";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { getPassportRanking, getVisaDataDate, fmtDataDate } from "@/lib/visa";
import PassportRankingPage, { RANKING_FAQ } from "@/sites/walvi/visa/RankingPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};

  const ranking = await getPassportRanking();
  const year = new Date().getFullYear();
  const title = `Passport Power Ranking ${year}: World's Strongest Passports | VisaPoint`;
  const description = `Live ranking of ${ranking.length || 199} passports by visa-free access${
    ranking[0] ? ` — ${ranking[0].name} is #1 with ${ranking[0].score} destinations` : ""
  }. Updated weekly with embeddable chart.`;

  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/passport-ranking" },
    openGraph: {
      images: defaultOgImages(),
      title,
      description,
      type: "website",
      url: "/passport-ranking",
      siteName: "VisaPoint",
    },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();

  const [ranking, dataDate] = await Promise.all([getPassportRanking(), getVisaDataDate()]);
  if (!ranking.length) notFound();

  const base = siteBaseUrl(site);
  const bd = ranking.find((r) => r.passport === "BD");

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "VisaPoint", url: base },
            { name: "Passport Ranking", url: `${base}/passport-ranking` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "VisaPoint Passport Power Ranking",
            description: `Ranking of ${ranking.length} passports by visa-free, visa-on-arrival and eTA destinations.`,
            url: `${base}/passport-ranking`,
            dateModified: dataDate,
            creator: { "@type": "Organization", name: "VisaPoint", url: base },
            license: "https://opensource.org/licenses/MIT",
            isAccessibleForFree: true,
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "World's most powerful passports",
            itemListElement: ranking.slice(0, 20).map((r, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: `${r.name} passport — ${r.score} destinations`,
              url: `${base}/visa-free-countries/${r.slug}`,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: RANKING_FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a(ranking[0], bd) },
            })),
          },
        ]}
      />
      <PassportRankingPage site={site} ranking={ranking} dataDate={fmtDataDate(dataDate)} />
    </>
  );
}
