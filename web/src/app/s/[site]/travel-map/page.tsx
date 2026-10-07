import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Masthead, Footer } from "@/sites/walvi/Chrome";
import { fontVars } from "@/sites/walvi/fonts";
import TravelMap from "@/sites/walvi/travel/TravelMap";
import { travelFont } from "@/sites/walvi/travel/fonts";

export const dynamic = "force-dynamic";

const FAQ = [
  {
    q: "How do I make a map of the countries I have visited?",
    a: "Tap each country you have been to on the map, pick it from the list of all countries, or search for it, add your name and photo if you like, then download the image as an Instagram post or story. It is free and needs no sign-up.",
  },
  {
    q: "Is my photo uploaded anywhere?",
    a: "No. Your photo is read only inside your browser to draw the image; it is never uploaded to VisaPoint or anyone else.",
  },
  {
    q: "How many countries are there in the world?",
    a: "The usual count is 195: the 193 UN member states plus the two observer states, the Holy See and Palestine. The travel map uses 195 to work out your percentage of the world.",
  },
  {
    q: "Can I edit my travel map later?",
    a: "Yes. Your selection is saved on this device, and the Share link reopens your map anywhere.",
  },
];

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};
  const title = "My Travel Map: Countries I've Visited Map Maker (Free)";
  const description =
    "Make a beautiful map of every country you've visited — add your name and photo, see your % of the world and continents, and download it for Instagram or Facebook. Free, no sign-up.";
  return {
    title,
    description,
    keywords: ["countries visited map", "travel map maker", "map of countries I have visited", "visited countries map", "travel map instagram"],
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/travel-map" },
    openGraph: { title, description, type: "website", url: "/travel-map", siteName: "VisaPoint" },
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
            { name: "Travel map", url: `${base}/travel-map` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "VisaPoint Travel Map",
            description: "Free map maker for the countries you have visited, with a downloadable image for social media.",
            applicationCategory: "TravelApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: `${base}/travel-map`,
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
        <section className="vp-pi-hero tm-hero">
          <div className="vp-wrap">
            <nav className="vp-crumbs" aria-label="Breadcrumb">
              <Link href={b}>Home</Link>
              <span aria-hidden="true">›</span>
              <span>Travel map</span>
            </nav>
            <span className="vp-eyebrow light">Free tool · no sign-up</span>
            <h1>How much of the world have you seen?</h1>
            <p className="vp-lede light">
              Colour in every country you&apos;ve visited, add your name and photo, and download a beautiful map for Instagram,
              Facebook or WhatsApp.
            </p>
          </div>
        </section>
        <section className="vp-sec tm-sec">
          <div className="vp-wrap">
            <TravelMap />
          </div>
        </section>
        <section className="vp-sec vp-sec-alt">
          <div className="vp-wrap vp-split">
            <div>
              <h2 className="vp-h2">Make your travel map in 3 steps</h2>
              <ol className="vp-steps" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <li>
                  <span className="vp-step-n">1</span>
                  <div>
                    <b>Pick your countries</b>
                    <p>Tap them on the map, choose from the full A–Z list of every country, or search by name.</p>
                  </div>
                </li>
                <li>
                  <span className="vp-step-n">2</span>
                  <div>
                    <b>Add your name &amp; photo</b>
                    <p>Optional — they appear on the image, and the photo never leaves your phone.</p>
                  </div>
                </li>
                <li>
                  <span className="vp-step-n">3</span>
                  <div>
                    <b>Download &amp; share</b>
                    <p>Square post or full-screen story, in Neon, Paper or Sunset style.</p>
                  </div>
                </li>
              </ol>
            </div>
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
              <p className="vp-sub" style={{ marginTop: 18 }}>
                Planning the next one? <Link href={`${b}/visa-checker`}>Check if you need a visa</Link> or see{" "}
                <Link href={`${b}/passport-index`}>how strong your passport is</Link>.
              </p>
              <p className="tm-credit">
                Country facts: <a href="https://github.com/mledoze/countries" rel="nofollow noopener">mledoze/countries</a> (ODbL), population:{" "}
                <a href="https://data.worldbank.org/" rel="nofollow noopener">World Bank</a> (CC BY 4.0), map: Natural Earth via world-atlas. Distances are
                straight-line between country centres.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer site={site} />
    </div>
  );
}
