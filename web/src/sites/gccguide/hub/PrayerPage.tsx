import Link from "next/link";
import type { Site } from "@/lib/types";
import { HubPage, Crumbs, PageHead, StatRow, BigStat, DataTable, Faq, SourceLine, Related, Callout, SectionHead } from "./ui";
import type { PrayerView, MethodKey } from "./prayer";
import { PRAYER_METHODS, prayerLabel } from "./prayer";
import { INDEX, GULF_CURRENCIES } from "./config";
import { dateLong, int } from "./format";

export default function PrayerPage({ site, v, method }: { site: Site; v: PrayerView; method: MethodKey }) {
  const b = `/s/${site.id}`;
  const country = v.city.country;
  const countryName = GULF_CURRENCIES.find((g) => g.country === country)?.short ?? country;
  const next = v.next;

  return (
    <HubPage site={site} active="tools">
      <Crumbs site={site} items={[{ label: "Prayer times", href: `${b}/prayer-times` }, { label: countryName, href: `${b}/prayer-times/${country}` }, { label: v.city.name }]} />
      <PageHead
        kicker={`${v.city.name}, ${countryName} · ${v.hijri} · ${v.city.tz}`}
        title={
          <>
            Prayer times in {v.city.name} today
          </>
        }
        dek={
          <>
            Today&apos;s Fajr, Dhuhr, Asr, Maghrib and Isha for {v.city.name} ({v.city.lat.toFixed(2)}°N, {v.city.lng.toFixed(2)}°E), the full
            month table, sunrise and sunset, the Qibla direction and the Ramadan 2027 suhoor/iftar times. Method: {v.methodLabel}.
          </>
        }
      />

      <StatRow>
        <BigStat
          label={next ? `Next: ${prayerLabel(next.name)}` : "Next prayer"}
          value={next ? next.at : "—"}
          tone="gold"
          sub={next ? `in ${next.minutes >= 60 ? `${Math.floor(next.minutes / 60)}h ${next.minutes % 60}m` : `${next.minutes}m`}` : "—"}
        />
        <BigStat label="Fajr" value={v.today.fajr} tone="navy" sub="suhoor ends" />
        <BigStat label="Maghrib" value={v.today.maghrib} tone="teal" sub="iftar" />
        <BigStat label="Qibla" value={`${v.qibla}°`} tone="navy" sub="from true north" />
      </StatRow>

      <SectionHead title="Today's prayer times" dek={`${dateLong(v.today.date)} in ${v.city.name} (${v.city.tz})`} />
      <div className="gh-prayer">
        {(["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const).map((k) => (
          <div key={k} className={next?.name === k ? "now" : ""}>
            <span>{k === "sunrise" ? "Sunrise" : prayerLabel(k)}</span>
            <b>{v.today[k]}</b>
          </div>
        ))}
      </div>

      <Callout tone="info" title={`Calculation method: ${v.methodLabel}`}>
        <p style={{ margin: 0 }}>
          {v.methodNote} Times are computed from the position of the sun for {v.city.lat.toFixed(3)}°, {v.city.lng.toFixed(3)}° and the
          Asr is calculated with the Shafi&apos;i shadow ratio. Mosques in {v.city.name} may round or add a few minutes — follow your local
          mosque.
        </p>
        <p style={{ margin: "8px 0 0" }}>
          Switch method:{" "}
          {PRAYER_METHODS.filter((m) => m.key !== method)
            .slice(0, 4)
            .map((m, i) => (
              <span key={m.key}>
                {i > 0 ? " · " : ""}
                <Link href={`${b}/prayer-times/${country}/${v.city.slug}?method=${m.key}`}>{m.label}</Link>
              </span>
            ))}
        </p>
      </Callout>

      <SectionHead title={`Prayer times in ${v.city.name} this month`} dek="Every day of the current month, so you can plan around work and travel." />
      <DataTable
        head={["Date", "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]}
        rows={v.month.map((d) => [
          dateLong(d.date),
          d.fajr,
          d.sunrise,
          d.dhuhr,
          d.asr,
          <b key={`m${d.date}`}>{d.maghrib}</b>,
          d.isha,
        ])}
        caption={`${v.city.name} — ${v.methodLabel}`}
        foot={<>Times in {v.city.tz}. Sunrise marks the end of Fajr; Maghrib is the iftar time.</>}
      />

      <SectionHead title="Ramadan 2027 — suhoor and iftar times" dek={`Ramadan 1448 is expected to begin around ${v.ramadanRange} (moon sighting decides the exact first day).`} />
      <DataTable
        head={["Day", "Date", "Suhoor ends (Fajr)", "Iftar (Maghrib)"]}
        rows={v.ramadan.map((d, i) => [`${i + 1}`, dateLong(d.date), d.fajr, <b key={`r${d.date}`}>{d.maghrib}</b>])}
        caption={`Expected Ramadan timetable for ${v.city.name}`}
        foot={<>Dates are projected from the expected start of Ramadan 1448 AH and may shift by a day. Re-check with your mosque once the moon is sighted.</>}
      />

      <SectionHead title="Sunrise, sunset and the Qibla" />
      <p className="gh-dek">
        Sunrise in {v.city.name} today is {v.today.sunrise} and the sun sets at {v.today.maghrib}. The Qibla from {v.city.name} is{" "}
        {v.qibla}° from true north — point a compass north and turn {Math.round(v.qibla)}° clockwise. The last third of the night, a
        recommended time for tahajjud, begins at about {v.lastThirdStart}.
      </p>

      <Faq
        items={[
          {
            q: `What time is Fajr in ${v.city.name} today?`,
            a: `Fajr begins at ${v.today.fajr} and sunrise is at ${v.today.sunrise}, so the Fajr window closes at sunrise.`,
          },
          {
            q: `What time is iftar in ${v.city.name}?`,
            a: `Iftar is at Maghrib, which is ${v.today.maghrib} today. During Ramadan the same calculation applies, with the expected timetable above.`,
          },
          {
            q: `Which calculation method is used for ${v.city.name}?`,
            a: `${v.methodLabel}. ${v.methodNote}`,
          },
          {
            q: `Why do times differ by a minute or two from my mosque?`,
            a: `Mosques often round up, add a safety margin, or use a slightly different Fajr angle. The astronomical calculation is the same; the convention is not. Follow your mosque for prayer and this page for planning.`,
          },
        ]}
      />

      {v.city.pop >= INDEX.prayerMinPopulation ? null : (
        <Callout tone="warn" title="Smaller town">
          <p style={{ margin: 0 }}>
            {v.city.name} has a population of about {int(v.city.pop)}, below the threshold for listing in the sitemap. The page is live for
            anyone who needs it, but it is not submitted to search engines.
          </p>
        </Callout>
      )}

      <Related
        title={`Other cities in ${countryName}`}
        links={v.month.length ? [{ label: "All prayer times", href: `${b}/prayer-times` }, { label: `${countryName} cities`, href: `${b}/prayer-times/${country}` }] : []}
      />

      <SourceLine
        source="adhan (MIT) + GeoNames"
        url="https://github.com/batoulapps/adhan-js"
        updated={v.today.date}
        note={
          <>
            City coordinates and populations: GeoNames (CC BY 4.0). Prayer times computed with adhan for {v.city.lat.toFixed(4)},{" "}
            {v.city.lng.toFixed(4)}. Hijri date via the Umm al-Qura calendar.
          </>
        }
      />
    </HubPage>
  );
}
