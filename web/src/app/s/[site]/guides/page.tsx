import "@/sites/walvi/theme.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Article } from "@/lib/types";
import { getSite, getArticles } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { WalviShell } from "@/sites/walvi/Chrome";
import { PageBanner, Crumbs } from "@/sites/walvi/data-ui";
import { JsonLd, breadcrumbSchema, websiteSchema } from "@/lib/seo";
import { countryOf, topicOf } from "@/sites/walvi/guide-meta";
import Flag from "@/sites/walvi/Flag";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>;
}): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};
  return {
    title: "Europe work permit & visa guides | VisaPoint",
    description:
      "Step-by-step work-permit and visa guides for moving to Europe from Asia and the Gulf — documents, cost, processing time and scam warnings, with official sources.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/guides" },
    openGraph: {
      title: "Europe work permit & visa guides | VisaPoint",
      description: "Work-permit and visa guides for moving to Europe — documents, cost, timeline.",
      type: "website",
      url: "/guides",
    },
  };
}

/* Text list (flag + topic + title) — no feature photos: the Wikipedia-matched ones
   were often wrong, and 250 images made this page ~640 KB. */
function GuideRow({ siteId, article }: { siteId: string; article: Article }) {
  const c = countryOf(article);
  return (
    <li className="vp-guide">
      <span className="vp-guide-flag">
        <Flag emoji={c?.flag} size={36} />
      </span>
      <div>
        <span className="vp-kicker">
          {topicOf(article)}
          {c ? ` · ${c.name}` : ""}
        </span>
        <h3>
          <Link href={`/s/${siteId}/${article.slug}`}>{article.title}</Link>
        </h3>
        {article.excerpt ? <p>{article.excerpt}</p> : null}
        <span className="vp-date">
          Updated {formatDate(article.created_at)} · {article.reading_time} min read
        </span>
      </div>
    </li>
  );
}

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();

  const articles = await getArticles(site.id);
  const base = siteBaseUrl(site);

  return (
    <>
      <JsonLd
        data={[
          websiteSchema(`${site.name} — Europe work & visa guides`, `${base}/guides`),
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Guides", url: `${base}/guides` },
          ]),
        ]}
      />
      <WalviShell site={site}>
        <Crumbs items={[{ name: site.name, href: `/s/${site.id}` }, { name: "Guides" }]} />
        <PageBanner
          flag="📑"
          kicker="Guides & insights"
          title="Europe work permit &amp; visa guides"
          dek="Step-by-step routes from Asia and the Gulf to Europe — documents, cost, processing time, salaries and scam warnings, written plainly and pointed at official sources."
          chips={[`${articles.length} published`, "Updated regularly", "Sources cited"]}
        />

        {articles.length === 0 ? (
          <div className="empty">
            <div className="empty-mark" aria-hidden="true">
              📑
            </div>
            <h2>Guides landing soon</h2>
            <p>Work-permit walkthroughs, salary breakdowns and scam warnings are publishing now. Check back shortly.</p>
          </div>
        ) : (
          <ul className="vp-guides" style={{ marginTop: "8px", marginBottom: "40px" }}>
            {articles.map((a) => (
              <GuideRow siteId={site.id} article={a} key={a.id} />
            ))}
          </ul>
        )}
      </WalviShell>
    </>
  );
}
