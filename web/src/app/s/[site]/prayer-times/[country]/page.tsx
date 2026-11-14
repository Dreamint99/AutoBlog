import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { citiesOf, buildPrayerView, indexedCities } from "@/sites/gccguide/hub/prayer";
import { GULF_CURRENCIES, INDEX } from "@/sites/gccguide/hub/config";
import { HubPage, Crumbs, PageHead, DataTable, Faq, SectionHead, SourceLine, Related } from "@/sites/gccguide/hub/ui";
import { int } from "@/sites/gccguide/hub/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ site: string; country: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: id, country } = await params;
  const site = getSite(id);
  const g = GULF_CURRENCIES.find((c) => c.country === country);
  if (!site || site.id !== "gccguide" || !g) return {};
  const cities = citiesOf(country);
  return {
    title: `Prayer times in ${g.short} — every city (${cities.length} places)`,
    description: `Today's Fajr, Dhuhr, Asr, Maghrib and Isha times for ${cities.length} cities and towns in ${g.short}, each calculated for its own coordinates, with monthly tables and Qibla direction.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/prayer-times/${country}` },
    robots: INDEX.prayer ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: `Prayer times in ${g.short}`, description: `${cities.length} cities with monthly tables.`, type: "website", url: `/prayer-times/${country}` },
  };
}

export default async function Page({ params }: Props) {
  const { site: id, country } = await params;
  const site = getSite(id);
  const g = GULF_CURRENCIES.find((c) => c.country === country);
  if (!site || site.id !== "gccguide" || !g) notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const cities = citiesOf(country);
  if (!cities.length) notFound();

  // Compute today's times for every city in the country (cap the table at 60 rows
  // for readability; the rest are still linked from the "all cities" list).
  const withTimes = cities.slice(0, 60).map((c) => ({ c, v: buildPrayerView(c) }));

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: site.name, url: base },
          { name: "Prayer times", url: `${base}/prayer-times` },
          { name: g.short, url: `${base}/prayer-times/${country}` },
        ])}
      />
      <HubPage site={site} active="tools">
        <Crumbs site={site} items={[{ label: "Prayer times", href: `${b}/prayer-times` }, { label: g.short }]} />
        <PageHead
          kicker={`${cities.length} cities and towns`}
          title={`Prayer times in ${g.short}`}
          dek={`Today's times for every populated place in ${g.short} above 1,000 residents, each calculated for its own latitude and longitude. Open a city for the full month and the Ramadan table.`}
        />

        <DataTable
          head={["City", "Population", "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]}
          rows={withTimes.map(({ c, v }) => [
            <Link key={c.slug} href={`${b}/prayer-times/${country}/${c.slug}`}>
              <b>{c.name}</b>
            </Link>,
            int(c.pop),
            v.today.fajr,
            v.today.dhuhr,
            v.today.asr,
            v.today.maghrib,
            v.today.isha,
          ])}
          caption={`${g.short} — today's prayer times by city`}
          foot={
            <>
              Showing the {Math.min(60, cities.length)} largest of {cities.length} places.{" "}
              <Link href={`${b}/prayer-times`}>All Gulf countries →</Link>
            </>
          }
        />

        <SectionHead title="All cities and towns" dek="Ordered by population. Small towns are included even when they are not indexed." />
        <ul style={{ columns: "2", listStyle: "none", padding: 0, margin: "0 0 10px" }}>
          {cities.map((c) => (
            <li key={c.slug} style={{ padding: "3px 0", breakInside: "avoid" }}>
              <Link href={`${b}/prayer-times/${country}/${c.slug}`}>{c.name}</Link>
              <span style={{ color: "var(--faint)", fontSize: 12 }}> · {int(c.pop)}</span>
            </li>
          ))}
        </ul>

        <Faq
          items={[
            {
              q: `Which calculation method is used in ${g.short}?`,
              a: `Each city page names its method and lets you switch. ${g.short} pages use the country's own convention where the adhan library provides one, otherwise the Muslim World League convention.`,
            },
            {
              q: `How many places in ${g.short} have a page?`,
              a: `${cities.length} populated places with at least 1,000 residents (GeoNames). ${indexedCities().filter((c) => c.country === country).length} of them are above the population threshold and listed in the sitemap.`,
            },
          ]}
        />

        <Related
          title="Other countries"
          links={GULF_CURRENCIES.filter((x) => x.country !== country).map((x) => ({ label: x.short, href: `${b}/prayer-times/${x.country}` }))}
        />

        <SourceLine source=" GeoNames (CC BY 4.0) + adhan (MIT)" url="https://www.geonames.org/" updated={new Date().toISOString().slice(0, 10)} note={<>City coordinates and populations: GeoNames. Times computed locally with adhan.</>} />
      </HubPage>
    </>
  );
}
