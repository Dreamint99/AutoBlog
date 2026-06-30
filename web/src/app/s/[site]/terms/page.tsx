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
    title: `Terms of Service | ${site.name}`,
    description: `The terms for using ${site.name}.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();
  return (
    <InfoPage site={site} kicker="Legal" title="Terms of Service">
      <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}.</p>
      <p>By using {site.name}, you agree to these terms.</p>
      <h2>Information only — not professional advice</h2>
      <p>
        The statistics, rankings and figures on {site.name} are <strong>best-available estimates compiled from public
        sources</strong> and may include errors or out-of-date numbers. They are provided for general information only
        and are <strong>not</strong> financial, investment, legal or professional advice. Always verify against the
        original source before relying on or citing any figure.
      </p>
      <h2>No warranty</h2>
      <p>The site is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for any loss arising from use of the information here.</p>
      <h2>Intellectual property</h2>
      <p>Site design and original content are ours. You may cite our pages with a link, but may not scrape or republish the site wholesale.</p>
      <h2>External links</h2>
      <p>We link to third-party sources and tools; we are not responsible for their content or policies.</p>
      <h2>Changes</h2>
      <p>We may update these terms at any time. Continued use means you accept the current version.</p>
      <p>Questions? See our <a href={`/s/${site.id}/contact`}>contact page</a>.</p>
    </InfoPage>
  );
}
