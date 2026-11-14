import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { holidayYears, holidayYearsFor, countryName } from "@/sites/gccguide/hub/directory";
import { GULF_CURRENCIES, INDEX } from "@/sites/gccguide/hub/config";
import { HubPage, Crumbs, PageHead, DataTable, Faq, SectionHead, SourceLine, Related, Callout } from "@/sites/gccguide/hub/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") return {};
  return {
    title: "Public holidays in the Gulf — 2026 and 2027 calendars",
    description: "Official public holidays for the UAE, Saudi Arabia, Qatar, Kuwait, Oman and Bahrain in 2026 and 2027, with lunar dates marked as expected and Ramadan working-hours notes.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/public-holidays" },
    robots: INDEX.holidays ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: "Gulf public holidays 2026 and 2027", description: "Every official holiday, with expectations flagged.", type: "website", url: "/public-holidays" },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const years = holidayYears();

  const faq = [
    {
      q: "Are the Islamic holiday dates fixed?",
      a: "No. Eid al-Fitr, Eid al-Adha, the Hijri New Year and the Prophet's birthday depend on the moon sighting and on each government's official announcement. The tables mark those rows as expected and give the astronomical projection; the fixed national days are exact.",
    },
    {
      q: "Do private-sector workers get the same holidays?",
      a: "In most Gulf states the cabinet announces a single holiday calendar that applies to both sectors, sometimes with a shorter break for private-sector employees. Ramadan also brings reduced working hours for Muslim employees — each country page carries the note.",
    },
    {
      q: "How many public holidays are there in the UAE?",
      a: `The UAE's 2026 calendar lists ${holidayYearsFor("uae").length ? years.find((h) => h.country === "uae" && h.year === 2026)?.holidays.length ?? "several" : "several"} holiday periods, of which the Eid periods move each year. See the UAE page for the dated list.`,
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Public holidays", url: `${base}/public-holidays` },
          ]),
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ]}
      />
      <HubPage site={site} active="countries">
        <Crumbs site={site} items={[{ label: "Public holidays" }]} />
        <PageHead
          kicker={`${years.length} calendars`}
          title="Public holidays in the Gulf"
          dek="The official holiday calendar for each Gulf state, 2026 and 2027 — fixed national days and the lunar feasts, with the moon-dependent dates marked rather than presented as certain."
        />

        <DataTable
          head={["Country", "Holidays 2026", "Holidays 2027"]}
          rows={GULF_CURRENCIES.map((g) => {
            const y26 = holidayYearsFor(g.country).includes(2026);
            const y27 = holidayYearsFor(g.country).includes(2027);
            const n = (y: number) => years.find((h) => h.country === g.country && h.year === y)?.holidays.length ?? 0;
            return [
              <b key={g.country}>{g.short}</b>,
              y26 ? <Link key="26" href={`${b}/public-holidays/${g.country}-2026`}>{n(2026)} holidays →</Link> : "—",
              y27 ? <Link key="27" href={`${b}/public-holidays/${g.country}-2027`}>{n(2027)} holidays →</Link> : "—",
            ];
          })}
          caption="Official public holidays by country"
          foot={<>A holiday period counts once (Eid al-Fitr is one row even when it spans four days).</>}
        />

        <div className="gh-grid cols3">
          {GULF_CURRENCIES.map((g) => (
            <Link key={g.country} className="gh-card" href={`${b}/public-holidays/${g.country}-2027`}>
              <b>{g.short}</b>
              <span>2027 calendar →</span>
            </Link>
          ))}
        </div>

        <Callout tone="info" title="Ramadan 2027 and working hours">
          <p style={{ margin: 0 }}>
            Ramadan 1448 is expected to begin around 8 February 2027. Gulf labour laws shorten working hours for Muslim employees during the month
            (usually two hours a day), and the Eid al-Fitr holiday follows. Each country calendar carries its own note and the official source.
          </p>
        </Callout>

        <Faq items={faq} />

        <Related
          title="Related"
          links={[
            { label: "Prayer times", href: `${b}/prayer-times` },
            { label: "Visa fees", href: `${b}/visa-fees` },
            { label: "Exchange rates", href: `${b}/rates` },
          ]}
        />

        <SourceLine source="Official government announcements" url={years[0]?.source_url || base} updated={years[0]?.checked ?? "2026-11-14"} note={<>Each calendar links the cabinet circular or official calendar it came from.</>} />
      </HubPage>
    </>
  );
}

void countryName;
