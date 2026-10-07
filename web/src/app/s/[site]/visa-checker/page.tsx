import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getPassports, getPiMeta } from "@/lib/passports";
import { siteBaseUrl } from "@/lib/sites.config";
import { COUNTRIES } from "@/lib/walvi";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Masthead, Footer } from "@/sites/walvi/Chrome";
import { fontVars } from "@/sites/walvi/fonts";
import Checker from "@/sites/walvi/passport/Checker";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};
  const title = "Visa Checker: Do I Need a Visa? Check Any Passport & Destination | VisaPoint";
  const description =
    "Free visa requirement checker for 199 passports and destinations — visa-free, visa on arrival, eTA, e-Visa or visa required, with stay limits. Updated weekly.";
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/visa-checker" },
    openGraph: { title, description, type: "website", url: "/visa-checker", siteName: "VisaPoint" },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();
  const sp = await searchParams;
  const [rows, meta] = await Promise.all([getPassports(), getPiMeta()]);
  if (!rows.length || !meta) notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const passports = [...rows].sort((x, y) => x.name.localeCompare(y.name)).map(({ iso2, name, slug }) => ({ iso2, name, slug }));
  const dest = [...meta.dest].sort((x, y) => x.name.localeCompare(y.name));
  const guides: Record<string, string> = {};
  for (const d of meta.dest) {
    const c = COUNTRIES.find((x) => x.name.toLowerCase() === d.name.toLowerCase());
    if (c) guides[d.iso2] = c.slug;
  }
  const ok = (v?: string) => (v && /^[a-z]{2}$/i.test(v) ? v.toUpperCase() : "");

  return (
    <div className={fontVars}>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "VisaPoint", url: base },
            { name: "Visa checker", url: `${base}/visa-checker` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "VisaPoint Visa Checker",
            applicationCategory: "TravelApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: `${base}/visa-checker`,
          },
        ]}
      />
      <Masthead site={site} />
      <main>
        <section className="vp-pi-hero vp-chk-hero">
          <div className="vp-wrap">
            <nav className="vp-crumbs" aria-label="Breadcrumb">
              <Link href={b}>Home</Link>
              <span aria-hidden="true">›</span>
              <span>Visa checker</span>
            </nav>
            <span className="vp-eyebrow light">Free tool</span>
            <h1>Do I need a visa?</h1>
            <p className="vp-lede light">
              Pick your passport and destination — see instantly whether it&apos;s visa-free, visa on arrival, eTA, e-Visa or a
              full visa. {rows.length} passports, {meta.dest.length} destinations.
            </p>
            <Checker
              siteId={site.id}
              passports={passports}
              dest={dest}
              guides={guides}
              initialFrom={ok(sp.from)}
              initialTo={ok(sp.to)}
            />
          </div>
        </section>
        <section className="vp-sec">
          <div className="vp-wrap vp-split">
            <div>
              <h2 className="vp-h2">Popular checks</h2>
              <ul className="vp-pp-list wide">
                {[
                  ["BD", "PL", "Bangladesh → Poland"],
                  ["BD", "RO", "Bangladesh → Romania"],
                  ["BD", "HR", "Bangladesh → Croatia"],
                  ["IN", "DE", "India → Germany"],
                  ["PK", "IT", "Pakistan → Italy"],
                  ["NP", "PT", "Nepal → Portugal"],
                  ["BD", "MY", "Bangladesh → Malaysia"],
                  ["BD", "AE", "Bangladesh → UAE"],
                ].map(([f, t, l]) => (
                  <li key={l}>
                    <Link href={`${b}/visa-checker?from=${f.toLowerCase()}&to=${t.toLowerCase()}`}>{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <aside className="vp-panel">
              <h3 className="vp-panel-h">Travelling vs working</h3>
              <p className="vp-panel-sub">
                These results are for short tourist or business visits. Working abroad always needs a work permit and the
                matching national visa — see the{" "}
                <Link href={`${b}/countries`}>country register</Link> for each route.
              </p>
              <Link className="vp-more" href={`${b}/passport-index`}>
                See the Passport Index →
              </Link>
            </aside>
          </div>
        </section>
      </main>
      <Footer site={site} />
    </div>
  );
}
