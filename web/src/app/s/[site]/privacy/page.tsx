import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import InfoPage from "@/sites/countly/InfoPage";

export const dynamic = "force-dynamic";
const SUPPORTED = new Set(["countly"]);

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) return {};
  return {
    title: `Privacy Policy | ${site.name}`,
    description: `How ${site.name} collects, uses and protects your data.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/privacy" },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();
  return (
    <InfoPage site={site} kicker="Legal" title="Privacy Policy">
      <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}.</p>
      <p>
        {site.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your privacy. This policy explains what we collect and how we use it.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Anonymous analytics</strong> — basic, aggregated usage data (page views, country, device) via our analytics provider. No personally identifying profiles.</li>
        <li><strong>Newsletter email</strong> — only if you subscribe. Used to send occasional updates.</li>
        <li><strong>Contact details</strong> — the name, email and message you submit through our contact form.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To operate and improve the site, respond to your messages, and (if you opted in) send newsletters. We do <strong>not</strong> sell your personal data.</p>
      <h2>Cookies</h2>
      <p>We use minimal cookies/local storage needed for the site and anonymous analytics. You can block cookies in your browser settings.</p>
      <h2>Third parties</h2>
      <p>We rely on trusted providers to run the site, including our hosting/analytics platform and a database provider, which process data on our behalf. External links (e.g. sources) have their own policies.</p>
      <h2>Your choices</h2>
      <p>You can unsubscribe from emails at any time, and you may request access to or deletion of your data by contacting us via the <a href={`/s/${site.id}/contact`}>contact page</a>.</p>
      <h2>Changes</h2>
      <p>We may update this policy; the &ldquo;last updated&rdquo; date will change accordingly.</p>
    </InfoPage>
  );
}
