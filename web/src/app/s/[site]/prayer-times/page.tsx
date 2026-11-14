import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { citiesOf, buildPrayerView, CITY_COUNT, indexedCities } from "@/sites/gccguide/hub/prayer";
import { GULF_CURRENCIES } from "@/sites/gccguide/hub/config";
import { HubPage, Crumbs, PageHead, DataTable, Faq, SectionHead, Callout, SourceLine, Related } from "@/sites/gccguide/hub/ui";
import { int } from "@/sites/gccguide/hub/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") return {};
  return {
    title: "Prayer times in the Gulf — every city, with monthly tables and Qibla",
    description: `Today's Fajr, Dhuhr, Asr, Maghrib and Isha times for Gulf cities in the UAE, Saudi Arabia, Qatar, Kuwait, Oman and Bahrain (${CITY_COUNT} places, ${indexedCities().length} indexed). Full month tables, Qibla direction and Ramadan 2027 timetables.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/prayer-times" },
    openGraph: { images: defaultOgImages(), title: "Prayer times in the Gulf", description: "Every Gulf city, with month tables and Qibla direction.", type: "website", url: "/prayer-times" },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "gccguide") notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);

  // One row per country: the capital's times, computed live.
  const rows = GULF_CURRENCIES.map((g) => {
    const cities = citiesOf(g.country);
    const capital = cities[0];
    const v = capital ? buildPrayerView(capital) : null;
    return { g, cities, capital, v };
  });

  const faq = [
    {
      q: "How are these prayer times calculated?",
      a: `Astronomically, from each city's latitude and longitude, using the adhan library (MIT). The method differs by country: Umm al-Qura for Saudi Arabia, the Dubai method for the UAE, Qatar's and Kuwait's own conventions, and the Muslim World League convention where a country has no dedicated preset.`,
    },
    {
      q: "Why do my mosque and this page differ by a minute?",
      a: "Mosques often round up or add a safety margin (two or three minutes) and a few use a different Fajr angle. The underlying calculation is the same — follow your mosque for praying, use this page for planning.",
    },
    {
      q: "Are these times correct for the whole country?",
      a: "Each city has its own page calculated for its own coordinates. Within a small country like Bahrain or Qatar the differences are a minute or two; across Saudi Arabia they are larger, so pick the closest city.",
    },
    {
      q: "Where do the city names come from?",
      a: `GeoNames (CC BY 4.0), filtered to populated places with at least 1,000 residents — ${CITY_COUNT} places across the six states. Contributions to GeoNames are welcome and improve these pages.`,
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Prayer times", url: `${base}/prayer-times` },
          ]),
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ]}
      />
      <HubPage site={site} active="tools">
        <Crumbs site={site} items={[{ label: "Prayer times" }]} />
        <PageHead
          kicker={`${CITY_COUNT} cities · ${indexedCities().length} indexed`}
          title="Prayer times in the Gulf"
          dek="Today's times, the full month, sunrise and sunset, the Qibla direction and Ramadan 2027 suhoor/iftar tables — for every Gulf city and town, calculated for its own coordinates."
        />

        <DataTable
          head={["Country", "Cities", "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]}
          rows={rows.map(({ g, cities, capital, v }) => [
            <Link key={g.country} href={`${b}/prayer-times/${g.country}`}>
              <b>{g.short}</b>
            </Link>,
            `${cities.length}`,
            v ? v.today.fajr : "—",
            v ? v.today.dhuhr : "—",
            v ? v.today.asr : "—",
            v ? v.today.maghrib : "—",
            v ? v.today.isha : "—",
          ])}
          caption={`Today's times in each country's largest city, ${new Date().toISOString().slice(0, 10)}`}
          foot={<>Each country page lists every city; each city page carries the full month and the Ramadan table.</>}
        />

        <SectionHead title="Countries" />
        <div className="gh-grid cols3">
          {rows.map(({ g, cities, capital }) => (
            <Link key={g.country} className="gh-card" href={`${b}/prayer-times/${g.country}`}>
              <b>{g.short}</b>
              <span>{capital ? capital.name : `${cities.length} cities`}</span>
            </Link>
          ))}
        </div>

        <Callout tone="info" title="Every town, not just the capitals">
          <p style={{ margin: 0 }}>
            GccGuide carries {CITY_COUNT} populated places across the six states. Pages for towns below the population threshold used for the
            sitemap are still live and correct — they are simply not submitted to search engines until there is demand for them.
          </p>
        </Callout>

        <Faq items={faq} />

        <Related
          title="Also useful"
          links={[
            { label: "Gold rate in the Gulf", href: `${b}/gold-rate` },
            { label: "Exchange rates", href: `${b}/rates` },
            { label: "Public holidays", href: `${b}/public-holidays` },
          ]}
        />

        <SourceLine
          source="adhan (MIT) + GeoNames (CC BY 4.0)"
          url="https://download.geonames.org/export/dump/readme.txt"
          updated={new Date().toISOString().slice(0, 10)}
          note={<>Coordinates and populations from GeoNames; times computed locally, no external prayer-time API.</>}
        />
      </HubPage>
    </>
  );
}
