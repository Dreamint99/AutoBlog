import { defaultOgImages } from "@/lib/og";
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
    q: "What is Unseen Bangladesh?",
    a: "Unseen Bangladesh is the idea that most of us have seen only a fraction of our own country. This free Unseen Bangladesh tracker lets you colour in every district you have visited out of all 64 districts and 8 divisions, see how much of Bangladesh is still unseen for you, and download a shareable map for Facebook, Instagram or WhatsApp. No sign-up needed.",
  },
  {
    q: "আনসিন বাংলাদেশ (Unseen Bangladesh) কীভাবে ট্র্যাক করব?",
    a: "ম্যাপে যে জেলাগুলোতে ঘুরে এসেছেন সেগুলোতে ট্যাপ করুন, অথবা ৬৪ জেলার তালিকা থেকে বেছে নিন। নিজের হোম জেলা সেট করুন, নাম-ছবি যোগ করুন, দেখুন বাংলাদেশের কত শতাংশ আপনি দেখেছেন — আর কতটুকু এখনো অদেখা (unseen)। তারপর ফেসবুক বা ইনস্টাগ্রামে শেয়ার করার মতো সুন্দর একটা ম্যাপ ইমেজ ডাউনলোড করুন। সম্পূর্ণ ফ্রি।",
  },
  {
    q: "How do I make a map of the districts of Bangladesh I have visited?",
    a: "Tap each district you have been to on the map, or pick it from the list of all 64 districts. Set your home district, add your name and photo if you like, then download the image as a Facebook or Instagram post or story. Free, no sign-up.",
  },
  {
    q: "How many districts are there in Bangladesh?",
    a: "Bangladesh has 64 districts in 8 divisions: Dhaka, Chattogram, Rajshahi, Khulna, Barishal, Sylhet, Rangpur and Mymensingh. Use this Unseen Bangladesh map to check which of the 64 districts you still haven't seen.",
  },
  {
    q: "বাংলাদেশের কতটুকু ঘুরে দেখেছেন — হিসাব করব কীভাবে?",
    a: "এই টুলে ভিজিট করা জেলাগুলো মার্ক করলেই দেখতে পাবেন — কয়টা জেলা, ৮টি বিভাগের কয়টা, দেশের কত শতাংশ জমি, আর মোট কত কিলোমিটার পথ পাড়ি দিয়েছেন। বাকিটাই আপনার আনসিন বাংলাদেশ — অদেখা জেলাগুলোর লিস্টও পাবেন।",
  },
  {
    q: "What are the badges?",
    a: "Badges unlock as you travel — Sea Lover for three coastal districts, Hill Tracker for all three hill districts, Tea Trail for Sylhet, Moulvibazar and Habiganj, Tiger Country for a Sundarbans district, All 8 Divisions, and All 64 Districts for the full set.",
  },
  {
    q: "Is my photo uploaded?",
    a: "No. The photo is read only inside your browser to draw the image and is never uploaded.",
  },
];

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};
  const title = "Unseen Bangladesh — 64 District Map: How Much of Bangladesh Have You Seen?";
  const description =
    "Track your Unseen Bangladesh: colour the 64 districts you've visited, unlock travel badges, see your % of the country and all 8 divisions, and download a beautiful map for Facebook or Instagram. বাংলাদেশের কতটুকু ঘুরে দেখেছেন? Free, no sign-up.";
  return {
    title,
    description,
    keywords: [
      "unseen bangladesh",
      "unseen bangladesh map",
      "আনসিন বাংলাদেশ",
      "বাংলাদেশের অদেখা জায়গা",
      "bangladesh district map",
      "64 districts of bangladesh map",
      "bangladesh map visited",
      "bangladesh travel map",
      "districts of bangladesh i have visited",
      "বাংলাদেশ জেলা ম্যাপ",
      "কতটুকু বাংলাদেশ দেখেছেন",
    ],
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/bangladesh-map", languages: { "en": "/bangladesh-map", "bn": "/bangladesh-map" } },
    openGraph: { images: defaultOgImages(), title, description, type: "website", url: "/bangladesh-map", siteName: "VisaPoint" },
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
            { name: "Unseen Bangladesh — district map", url: `${base}/bangladesh-map` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Unseen Bangladesh — VisaPoint 64 District Map",
            description:
              "Free Unseen Bangladesh tracker: map the 64 districts of Bangladesh you have visited, see what's still unseen, unlock badges and download a shareable image. বাংলাদেশের কতটুকু ঘুরে দেখেছেন?",
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
              <span>Unseen Bangladesh</span>
            </nav>
            <span className="vp-eyebrow light">Unseen Bangladesh · free tool · no sign-up</span>
            <h1>
              Unseen Bangladesh: how many of the 64 districts have you seen?
            </h1>
            <p className="vp-lede light">
              Track every district you&apos;ve visited, unlock badges from Sea Lover to All 64 Districts, and download a stunning map for
              Facebook, Instagram or WhatsApp. <span lang="bn">বাংলাদেশের কতটুকু ঘুরে দেখেছেন — এক নজরে দেখে নিন।</span>
            </p>
          </div>
        </section>
        <section className="vp-sec tm-sec">
          <div className="vp-wrap">
            <BdMap />
          </div>
        </section>
        <section className="vp-sec vp-sec-alt">
          <div className="vp-wrap">
            <h2 className="vp-h2">Unseen Bangladesh — আনসিন বাংলাদেশ: অদেখা জেলাগুলো খুঁজে বের করুন</h2>
            <p className="vp-sub">
              Most of us live in Bangladesh our whole lives and still leave most of the map blank. The Unseen Bangladesh tracker turns that
              blank map into a challenge: colour in each of the 64 districts as you visit, and watch your percentage of the country grow —
              from the tea gardens of Sylhet and the hills of Bandarban to the Sundarbans, Cox&apos;s Bazar&apos;s coast and the char islands
              of the north.
            </p>
            <p className="vp-sub">
              <span lang="bn">
                আনসিন বাংলাদেশ মানে শুধু বিখ্যাত জায়গা না — মানে দেশের প্রতিটা অদেখা জেলা, লুকানো রত্ন, নতুন নদী, নতুন মানুষ। ৮টি
                বিভাগের ৬৪টি জেলার প্রতিটা রঙ করে করে সাজান আপনার নিজের ভ্রমণের ম্যাপ, আর শেয়ার করুন বন্ধুদের সাথে — কে কতটুকু
                বাংলাদেশ দেখেছে, দেখে নিন এখনই।
              </span>
            </p>
            <p className="vp-sub">
              Whether you call it an unseen Bangladesh map, a visited-districts tracker, or a{" "}
              <span lang="bn">বাংলাদেশ জেলা ম্যাপ</span> — this is the free tool that answers one question:{" "}
              <em>how much of Bangladesh have you really seen?</em>
            </p>
          </div>
        </section>
        <section className="vp-sec">
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
