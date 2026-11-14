import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { holidayFor, holidaySlug, holidayYearsFor, parseHolidaySlug, spanDays, countryName } from "@/sites/gccguide/hub/directory";
import { GULF_CURRENCIES, INDEX } from "@/sites/gccguide/hub/config";
import { HubPage, Crumbs, PageHead, DataTable, Faq, SourceLine, Related, Callout, StatRow, BigStat, SectionHead } from "@/sites/gccguide/hub/ui";
import { dateLong } from "@/sites/gccguide/hub/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ site: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const p = parseHolidaySlug(slug);
  const h = p ? holidayFor(p.country, p.year) : undefined;
  if (!site || site.id !== "gccguide" || !h) return {};
  return {
    title: `Public holidays in ${countryName(h.country)} ${h.year} — full official calendar`,
    description: `${h.holidays.length} public holidays in ${countryName(h.country)} for ${h.year}, including ${h.holidays.filter((x) => x.expected).length} moon-dependent dates marked as expected. ${h.ramadan_note.slice(0, 120)}`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/public-holidays/${holidaySlug(h)}` },
    robots: INDEX.holidays ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: `${countryName(h.country)} public holidays ${h.year}`, description: "Official calendar with expected lunar dates flagged.", type: "website", url: `/public-holidays/${holidaySlug(h)}` },
  };
}

export default async function Page({ params }: Props) {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const p = parseHolidaySlug(slug);
  const h = p ? holidayFor(p.country, p.year) : undefined;
  if (!site || site.id !== "gccguide" || !h) notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const g = GULF_CURRENCIES.find((x) => x.country === h.country);
  const name = g?.short ?? h.country;
  const totalDays = h.holidays.reduce((n, x) => n + spanDays(x), 0);
  const expected = h.holidays.filter((x) => x.expected).length;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: site.name, url: base },
          { name: "Public holidays", url: `${base}/public-holidays` },
          { name: `${name} ${h.year}`, url: `${base}/public-holidays/${holidaySlug(h)}` },
        ])}
      />
      <HubPage site={site} active="countries">
        <Crumbs site={site} items={[{ label: "Public holidays", href: `${b}/public-holidays` }, { label: `${name} ${h.year}` }]} />
        <PageHead
          kicker={`${h.holidays.length} holidays · ${totalDays} days`}
          title={`Public holidays in ${name} ${h.year}`}
          dek={`The official calendar: ${h.holidays.length} holiday periods totalling ${totalDays} days${expected ? `, of which ${expected} depend on the moon sighting and are marked as expected` : ""}.`}
        />

        <StatRow>
          <BigStat label="Holiday periods" value={`${h.holidays.length}`} tone="navy" sub={name} />
          <BigStat label="Days off" value={`${totalDays}`} tone="teal" sub="counting multi-day breaks" />
          <BigStat label="Moon-dependent" value={`${expected}`} tone="gold" sub="confirmed by sighting" />
          <BigStat label="Checked" value={h.checked} tone="navy" sub="official source" />
        </StatRow>

        <DataTable
          head={["Date", "Holiday", "Days", "Status"]}
          rows={h.holidays.map((x) => [
            <b key={x.date}>{dateLong(x.date)}</b>,
            <span key={x.name}>
              {x.name}
              {x.note ? <div style={{ color: "var(--faint)", fontSize: 12, whiteSpace: "normal", maxWidth: "44ch" }}>{x.note}</div> : null}
            </span>,
            `${spanDays(x)}`,
            x.expected ? <span key="e" style={{ color: "var(--gold)" }}>expected</span> : "fixed",
          ])}
          caption={`${name} public holidays, ${h.year}`}
          foot={<>Dates in the table are the official calendar; lunar holidays can shift by a day once sighted.</>}
        />

        <Callout tone="law" title="Ramadan and working hours">
          <p style={{ margin: 0 }}>{h.ramadan_note}</p>
        </Callout>

        <Faq
          items={[
            {
              q: `When is Eid al-Fitr in ${name} in ${h.year}?`,
              a:
                h.holidays.find((x) => /eid al-fitr/i.test(x.name)) != null
                  ? `The calendar places Eid al-Fitr at ${dateLong(h.holidays.find((x) => /eid al-fitr/i.test(x.name))!.date)}, pending the moon sighting. The official announcement is usually made the evening before.`
                  : `The ${h.year} calendar does not list a separate Eid al-Fitr period; see the official source linked below.`,
            },
            {
              q: `How many days off do workers get in ${name} in ${h.year}?`,
              a: `${totalDays} days across ${h.holidays.length} holiday periods, as published in the official calendar. Some employers add company days, and weekend rules differ — ${name} weekends and shift patterns are set by the labour ministry.`,
            },
            {
              q: "Are these dates confirmed?",
              a: `${h.holidays.length - expected} of the ${h.holidays.length} periods are fixed dates set by law. The other ${expected} follow the Islamic calendar and are confirmed by moon sighting; they are marked "expected" here and may move by one day.`,
            },
          ]}
        />

        <SectionHead title="Other years and countries" />
        <div className="gh-grid cols3">
          {holidayYearsFor(h.country)
            .filter((y) => y !== h.year)
            .map((y) => (
              <Link key={y} className="gh-card" href={`${b}/public-holidays/${h.country}-${y}`}>
                <b>{name} {y}</b>
                <span>calendar →</span>
              </Link>
            ))}
          {GULF_CURRENCIES.filter((x) => x.country !== h.country).map((x) => (
            <Link key={x.country} className="gh-card" href={`${b}/public-holidays/${x.country}-${h.year}`}>
              <b>{x.short} {h.year}</b>
              <span>calendar →</span>
            </Link>
          ))}
        </div>

        <Related
          title="Related"
          links={[
            { label: "Prayer times", href: `${b}/prayer-times` },
            { label: "Ramadan 2027 timetables", href: `${b}/prayer-times/${h.country}` },
          ]}
        />

        <SourceLine source="Official holiday calendar" url={h.source_url || base} updated={h.checked} note={<>Transcribed from the linked official calendar or cabinet circular. Lunar dates marked expected.</>} />
      </HubPage>
    </>
  );
}
