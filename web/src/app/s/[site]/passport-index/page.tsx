import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getPassports, getPiMeta } from "@/lib/passports";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import PassportIndexPage, { PI_FAQ } from "@/sites/walvi/passport/IndexPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};
  const rows = await getPassports();
  const year = new Date().getFullYear();
  const title = `Passport Index ${year}: World's Most Powerful Passports Ranked | VisaPoint`;
  const description = `Live ranking of ${rows.length || 199} passports by visa-free, visa-on-arrival and eTA access${
    rows[0] ? ` — ${rows[0].name} is #1 with ${rows[0].score} destinations` : ""
  }. Updated weekly, with an interactive world map.`;
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/passport-index" },
    openGraph: { title, description, type: "website", url: "/passport-index", siteName: "VisaPoint" },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();
  const [rows, meta] = await Promise.all([getPassports(), getPiMeta()]);
  if (!rows.length) notFound();
  const base = siteBaseUrl(site);
  const bd = rows.find((r) => r.iso2 === "BD");
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "VisaPoint", url: base },
            { name: "Passport Index", url: `${base}/passport-index` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "VisaPoint Passport Index",
            description: `Ranking of ${rows.length} passports by the number of destinations reachable visa-free, with a visa on arrival or an eTA.`,
            url: `${base}/passport-index`,
            dateModified: meta?.updatedAt,
            creator: { "@type": "Organization", name: "VisaPoint", url: base },
            license: "https://opensource.org/licenses/MIT",
            isAccessibleForFree: true,
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Most powerful passports",
            itemListElement: rows.slice(0, 20).map((r, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: `${r.name} passport — ${r.score} destinations`,
              url: `${base}/passport/${r.slug}`,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: PI_FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a(rows[0], bd) },
            })),
          },
        ]}
      />
      <PassportIndexPage site={site} rows={rows} updatedAt={meta?.updatedAt || ""} />
    </>
  );
}
