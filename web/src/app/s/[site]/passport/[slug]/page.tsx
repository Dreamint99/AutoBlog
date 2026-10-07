import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getPassport, getPassports, getPiMeta } from "@/lib/passports";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import PassportPage from "@/sites/walvi/passport/PassportPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string; slug: string }> }): Promise<Metadata> {
  const { site: id, slug } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};
  const p = await getPassport(slug);
  if (!p) return {};
  const year = new Date().getFullYear();
  const title = `${p.name} Passport Ranking ${year}: ${p.score} Visa-Free Countries`;
  const description = `${p.name} passport ranks #${p.rank}: visa-free to ${p.free}, visa on arrival in ${p.voa}, eTA for ${p.eta} and e-Visa for ${p.evisa} destinations. Full list and world map, updated weekly.`;
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/passport/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/passport/${slug}`,
      siteName: "VisaPoint",
      images: [`https://flagcdn.com/w640/${p.iso2.toLowerCase()}.png`],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string; slug: string }> }) {
  const { site: id, slug } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();
  const [p, meta, all] = await Promise.all([getPassport(slug), getPiMeta(), getPassports()]);
  if (!p || !meta) notFound();
  const i = all.findIndex((r) => r.iso2 === p.iso2);
  const neighbours = all.slice(Math.max(0, i - 3), i + 4).filter((r) => r.iso2 !== p.iso2);
  const base = siteBaseUrl(site);
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "VisaPoint", url: base },
            { name: "Passport Index", url: `${base}/passport-index` },
            { name: `${p.name} passport`, url: `${base}/passport/${p.slug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `How many countries can ${p.name} passport holders visit without a visa?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `${p.free} visa-free, ${p.voa} with a visa on arrival and ${p.eta} with an eTA — ${p.score} in total. ${p.evisa} more offer an e-Visa.`,
                },
              },
              {
                "@type": "Question",
                name: `What is the ${p.name} passport ranking?`,
                acceptedAnswer: { "@type": "Answer", text: `#${p.rank} of ${all.length} passports in the VisaPoint Passport Index.` },
              },
            ],
          },
        ]}
      />
      <PassportPage site={site} p={p} dest={meta.dest} updatedAt={meta.updatedAt} neighbours={neighbours} total={all.length} />
    </>
  );
}
