import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { allMissions, sourceCountries, missionsIn, missionSlug, verifiedMissions } from "@/sites/gccguide/hub/embassy";
import { GULF_CURRENCIES, INDEX } from "@/sites/gccguide/hub/config";
import { HubPage, Crumbs, PageHead, DataTable, Faq, SectionHead, Callout, SourceLine, Related } from "@/sites/gccguide/hub/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") return {};
  return {
    title: "Embassies and consulates in the Gulf — addresses, phones and official sites",
    description: `Verified contact details for ${verifiedMissions().length} embassies and consulates in the UAE, Saudi Arabia, Qatar, Kuwait, Oman and Bahrain, each read from an official mission or foreign-ministry page.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/embassy" },
    robots: INDEX.embassy ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: "Embassies and consulates in the Gulf", description: "Addresses, phones and official sites, with the source page for each.", type: "website", url: "/embassy" },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const missions = allMissions();
  const countries = sourceCountries();

  const faq = [
    {
      q: "How were these embassy details checked?",
      a: "Each record was read from the mission's own website or the sending country's foreign ministry and carries that page's URL and the date it was checked. Where a field was not published on the official page, it is left blank rather than filled from a directory.",
    },
    {
      q: "Why is my country's embassy missing?",
      a: `Only missions whose official page could be read are listed — currently ${verifiedMissions().length} of them across ${countries.length} sending countries. Some foreign ministries publish contact details only inside a script-driven page or behind a block, and we do not guess an address or a phone number.`,
    },
    {
      q: "Do I need an appointment?",
      a: "Most Gulf missions require one for consular services and publish the booking system on their own site — use the website link on the mission page rather than turning up.",
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Embassies", url: `${base}/embassy` },
          ]),
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ]}
      />
      <HubPage site={site} active="countries">
        <Crumbs site={site} items={[{ label: "Embassies & consulates" }]} />
        <PageHead
          kicker={`${missions.length} missions · ${countries.length} sending countries`}
          title="Embassies and consulates in the Gulf"
          dek="Addresses, phone numbers, emails, opening hours and the official website for each mission — every one read from an official source, with the page and the date printed on the record."
        />

        <DataTable
          head={["Gulf state", "Missions listed"]}
          rows={GULF_CURRENCIES.map((g) => [
            <Link key={g.country} href={`${b}/embassy#${g.country}`}>
              <b>{g.short}</b>
            </Link>,
            `${missionsIn(g.country).length}`,
          ])}
          caption="Missions by host country"
          foot={<>Consulates are listed where the sending country has them — Dubai and Jeddah carry several.</>}
        />

        {GULF_CURRENCIES.map((g) => (
          <div key={g.country} id={g.country}>
            <SectionHead title={`${g.short} — ${missionsIn(g.country).length} missions`} />
            <div className="gh-grid cols3">
              {missionsIn(g.country).map((m) => (
                <Link key={m.source_country + m.city} className="gh-card" href={`${b}/embassy/${missionSlug(m)}`}>
                  <b>{m.source_country}</b>
                  <span>{m.city}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <Callout tone="warn" title="What is deliberately missing">
          <p style={{ margin: 0 }}>
            A mission has a page only when its official site published the details we show. {countries.length} sending countries are covered; some
            foreign ministries publish only behind a script or a block, and those missions are absent rather than approximated. For an emergency,
            call your foreign ministry&apos;s 24-hour line — it is on their site, not here.
          </p>
        </Callout>

        <Faq items={faq} />

        <Related
          title="Related"
          links={[
            { label: "Visa & residence fees", href: `${b}/visa-fees` },
            { label: "Public holidays", href: `${b}/public-holidays` },
            { label: "Country guides", href: `${b}/country/uae` },
          ]}
        />

        <SourceLine source="Official mission and foreign-ministry pages" url={`${base}/embassy`} updated={missions[0]?.checked ?? "2026-11-14"} note={<>One source URL per record, printed on each mission page with its check date.</>} />
      </HubPage>
    </>
  );
}
