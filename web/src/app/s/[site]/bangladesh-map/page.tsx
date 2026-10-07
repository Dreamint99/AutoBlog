import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Masthead, Footer } from "@/sites/walvi/Chrome";
import { fontVars } from "@/sites/walvi/fonts";
import { travelFont } from "@/sites/walvi/travel/fonts";
import BdMap from "@/sites/walvi/travel/BdMap";

export const dynamic = "force-dynamic";

const FAQ = [
  {
    q: "How do I make a map of the districts of Bangladesh I have visited?",
    a: "Tap each district (zila) you have been to on the map, or pick it from the list of all 64 districts. Set your home district, add your name and photo if you like, then download the image as a Facebook or Instagram post or story. Free, no sign-up.",
  },
  {
    q: "How many districts are there in Bangladesh?",
    a: "Bangladesh has 64 districts (zila) in 8 divisions: Dhaka, Chattogram, Rajshahi, Khulna, Barishal, Sylhet, Rangpur and Mymensingh.",
  },
  {
    q: "What are the badges?",
    a: "Badges unlock as you travel — Sea Lover for three coastal districts, Hill Tracker for all three hill districts, Tea Trail for Sylhet, Moulvibazar and Habiganj, Tiger Country for a Sundarbans district, All 8 Divisions, and Shonar Bangla for all 64.",
  },
  {
    q: "Is my photo uploaded?",
    a: "No. The photo is read only inside your browser to draw the image and is never uploaded.",
  },
  {
    q: "Can I see the map in Bangla?",
    a: "Yes — switch the district names on the map between বাংলা and English.",
  },
];

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};
  const title = "Bangladesh District Map Maker — Which of the 64 Zila Have You Visited?";
  const description =
    "Colour in every district of Bangladesh you've visited, unlock travel badges, see your % of the country and all 8 divisions, and download a beautiful map for Facebook or Instagram. Free, Bangla & English.";
  return {
    title,
    description,
    keywords: ["bangladesh district map", "64 districts of bangladesh map", "zila map visited", "bangladesh travel map", "বাংলাদেশের ৬৪ জেলা ম্যাপ", "আমি কয়টি জেলা ঘুরেছি"],
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/bangladesh-map" },
    openGraph: { title, description, type: "website", url: "/bangladesh-map", siteName: "VisaPoint" },
  };
}

export default async function Page({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  return (
    <div className={`${fontVars} ${travelFont.variable}`}>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "VisaPoint", url: base },
            { name: "Bangladesh district map", url: `${base}/bangladesh-map` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "VisaPoint Bangladesh District Map",
            description: "Free map maker for the 64 districts of Bangladesh you have visited, with badges and a downloadable image.",
            applicationCategory: "TravelApplication",
            operatingSystem: "Any",
            inLanguage: ["en", "bn"],
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: `${base}/bangladesh-map`,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />
      <Masthead site={site} />
      <main>
        <section className="vp-pi-hero tm-hero bd-hero">
          <div className="vp-wrap">
            <nav className="vp-crumbs" aria-label="Breadcrumb">
              <Link href={b}>Home</Link>
              <span aria-hidden="true">›</span>
              <Link href={`${b}/travel-map`}>Travel map</Link>
              <span aria-hidden="true">›</span>
              <span>Bangladesh</span>
            </nav>
            <span className="vp-eyebrow light">Free tool · বাংলা &amp; English</span>
            <h1>
              How many of Bangladesh&apos;s 64 districts have you seen?
              <span className="bd-h1-bn">আপনি কয়টি জেলা ঘুরেছেন?</span>
            </h1>
            <p className="vp-lede light">
              Tap every zila you&apos;ve visited, unlock badges from Sea Lover to Shonar Bangla, and download a stunning map for
              Facebook, Instagram or WhatsApp.
            </p>
          </div>
        </section>
        <section className="vp-sec tm-sec">
          <div className="vp-wrap">
            <BdMap />
          </div>
        </section>
        <section className="vp-sec vp-sec-alt">
          <div className="vp-wrap vp-split">
            <div>
              <h2 className="vp-h2">Questions</h2>
              <div className="vp-faq">
                {FAQ.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
            <div>
              <h2 className="vp-h2">Been everywhere at home?</h2>
              <p className="vp-sub" style={{ marginTop: 0 }}>
                Map the <Link href={`${b}/travel-map`}>countries you&apos;ve visited</Link>, see{" "}
                <Link href={`${b}/passport/bangladesh`}>where the Bangladesh passport goes visa-free</Link>, or{" "}
                <Link href={`${b}/visa-check`}>check a visa status online</Link>.
              </p>
              <p className="tm-credit">
                District boundaries: <a href="https://www.geoboundaries.org/" rel="nofollow noopener">geoBoundaries</a> (CC BY 4.0),
                simplified. Areas and distances are calculated from the map and are approximate.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer site={site} />
    </div>
  );
}
