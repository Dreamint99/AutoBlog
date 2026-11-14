import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { findCity, buildPrayerView, PRAYER_METHODS, type MethodKey } from "@/sites/gccguide/hub/prayer";
import PrayerPage from "@/sites/gccguide/hub/PrayerPage";
import { GULF_CURRENCIES } from "@/sites/gccguide/hub/config";
import { gate } from "@/sites/gccguide/hub/gate";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ site: string; country: string; city: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function methodOf(v: string | string[] | undefined): MethodKey {
  const s = Array.isArray(v) ? v[0] : v;
  return (PRAYER_METHODS.find((m) => m.key === s)?.key ?? "local") as MethodKey;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { site: id, country, city } = await params;
  const site = getSite(id);
  const c = findCity(country, city);
  const g = GULF_CURRENCIES.find((x) => x.country === country);
  if (!site || site.id !== "gccguide" || !c || !g) return {};
  const today = buildPrayerView(c).today;
  return {
    title: `Prayer times in ${c.name} today — Fajr ${today.fajr}, Maghrib ${today.maghrib} (${g.short})`,
    description: `Today's prayer times in ${c.name}, ${g.short}: Fajr ${today.fajr}, Dhuhr ${today.dhuhr}, Asr ${today.asr}, Maghrib ${today.maghrib}, Isha ${today.isha}. Full month table, Qibla direction and Ramadan 2027 suhoor/iftar times.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/prayer-times/${country}/${c.slug}` },
    robots: gate.prayerCity(c.pop) ? { index: true, follow: true, "max-image-preview": "large" } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: `Prayer times in ${c.name}`, description: `Fajr ${today.fajr} · Maghrib ${today.maghrib}`, type: "website", url: `/prayer-times/${country}/${c.slug}` },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { site: id, country, city } = await params;
  const site = getSite(id);
  const c = findCity(country, city);
  const g = GULF_CURRENCIES.find((x) => x.country === country);
  if (!site || site.id !== "gccguide" || !c || !g) notFound();
  const sp = await searchParams;
  const method = methodOf(sp.method);
  const v = buildPrayerView(c, method);
  const base = siteBaseUrl(site);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Prayer times", url: `${base}/prayer-times` },
            { name: g.short, url: `${base}/prayer-times/${country}` },
            { name: c.name, url: `${base}/prayer-times/${country}/${c.slug}` },
          ]),
          // Deliberately no Event schema: a daily prayer is not a calendar event,
          // and inventing one would put markup on the page that the page is not.
        ]}
      />
      <PrayerPage site={site} v={v} method={method} />
    </>
  );
}
