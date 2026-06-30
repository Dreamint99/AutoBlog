import { notFound } from "next/navigation";
import type { Metadata } from "next";
import "@/sites/countly/theme.css";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { fontVars } from "@/sites/countly/fonts";
import { CnHeader, SiteFooter } from "@/sites/countly/Home";
import CurrencyWidget from "@/sites/countly/CurrencyWidget";
import NewsletterForm from "@/sites/countly/NewsletterForm";

export const dynamic = "force-dynamic";
const SUPPORTED = new Set(["countly"]);

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) return {};
  const title = "Live Currency Converter — Real-Time Exchange Rates";
  return {
    title: `${title} | ${site.name}`,
    description: "Free live currency converter. Convert USD, BDT, INR, EUR, GBP and more at today's real exchange rates. Updated continuously.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/currency-converter" },
    openGraph: { title, description: "Convert any currency at live rates.", type: "website", url: "/currency-converter" },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();

  return (
    <div className={`cn-root ${fontVars}`}>
      <CnHeader site={site} />
      <section className="cn-section">
        <div className="cn-wrap">
          <div className="cn-sec-head">
            <div>
              <span className="cn-sec-kicker">Free tool</span>
              <h2>Live Currency Converter</h2>
              <p>Convert any amount between world currencies at today&apos;s live exchange rates.</p>
            </div>
          </div>

          <CurrencyWidget />

          <div className="article-content" style={{ marginTop: "2.4rem" }}>
            <h2>How this currency converter works</h2>
            <p>
              This free tool converts between 160+ world currencies using live mid-market exchange rates that refresh
              continuously. Enter an amount, pick the currencies, and the result updates instantly. Popular pairs like
              USD to BDT, USD to INR and GBP to BDT are one click away. Bookmark this page — the rates stay current.
            </p>
            <h2>Frequently asked questions</h2>
            <h3>Are these exchange rates live?</h3>
            <p>Yes — rates come from a live exchange-rate feed and update throughout the day. They are mid-market reference rates; banks and apps add a margin.</p>
            <h3>Which currencies are supported?</h3>
            <p>Over 160, including USD, EUR, GBP, BDT, INR, PKR, QAR, AED, SAR, CAD, AUD and more.</p>
            <h3>Is the currency converter free?</h3>
            <p>Yes, completely free with no sign-up.</p>
          </div>
        </div>
      </section>
      <NewsletterForm />
      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}
