import { notFound } from "next/navigation";
import type { Metadata } from "next";
import "@/sites/countly/theme.css";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { fontVars } from "@/sites/countly/fonts";
import { CnHeader, SiteFooter } from "@/sites/countly/Home";
import CryptoWidget from "@/sites/countly/CryptoWidget";
import NewsletterForm from "@/sites/countly/NewsletterForm";

export const dynamic = "force-dynamic";
const SUPPORTED = new Set(["countly"]);

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) return {};
  const title = "Live Crypto Prices — Bitcoin, Ethereum & Top 50 Coins";
  return {
    title: `${title} | ${site.name}`,
    description: "Live cryptocurrency prices and market caps for Bitcoin, Ethereum, Solana and the top 50 coins. Real-time, auto-refreshing, free.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/crypto" },
    openGraph: { title, description: "Live crypto prices, updated every minute.", type: "website", url: "/crypto" },
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
              <span className="cn-sec-kicker">Live tracker</span>
              <h2>Live Crypto Prices</h2>
              <p>Real-time prices, 24-hour change and market caps for the top 50 cryptocurrencies.</p>
            </div>
          </div>

          <CryptoWidget />

          <div className="article-content" style={{ marginTop: "2.4rem" }}>
            <h2>About this crypto price tracker</h2>
            <p>
              Track Bitcoin, Ethereum, Solana and the top 50 coins by market capitalisation, with prices that
              auto-refresh every minute. Search any coin and watch its 24-hour movement live. Bookmark this page to
              follow the market.
            </p>
            <h2>Frequently asked questions</h2>
            <h3>What is the price of Bitcoin right now?</h3>
            <p>The live Bitcoin price is shown at the top of the table above and updates automatically.</p>
            <h3>How often do prices update?</h3>
            <p>Every 60 seconds, directly from a live market data feed.</p>
            <h3>Is this crypto tracker free?</h3>
            <p>Yes, free with no sign-up.</p>
          </div>
        </div>
      </section>
      <NewsletterForm />
      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}
