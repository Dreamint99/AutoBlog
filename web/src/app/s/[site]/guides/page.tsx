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

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function categoryOf(a: Article): string {
  const tag = a.tags.find((t) => t.trim().length > 0);
  return (tag ?? a.keyword ?? "Guide").toUpperCase();
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
    title: "Europe work permit & visa guides | Walvi",
    description:
      "Step-by-step work-permit and visa guides for moving to Europe from Asia and the Gulf — documents, cost, processing time and scam warnings, with official sources.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/guides" },
    openGraph: {
      title: "Europe work permit & visa guides | Walvi",
      description: "Work-permit and visa guides for moving to Europe — documents, cost, timeline.",
      type: "website",
      url: "/guides",
    },
  };
}

function Card({ siteId, article }: { siteId: string; article: Article }) {
  const href = `/s/${siteId}/${article.slug}`;
  return (
    <article className="card">
      <Link href={href} className="card-media" aria-label={article.title} tabIndex={-1}>
        <span className="card-cat">{categoryOf(article)}</span>
        {article.image_url ? <img src={article.image_url} alt={article.title} loading="lazy" /> : null}
      </Link>
      <div className="card-body">
        <h3 className="card-title">
          <Link href={href}>{article.title}</Link>
        </h3>
        {article.excerpt ? <p className="card-excerpt">{article.excerpt}</p> : null}
        <div className="card-foot">
          <span className="read">{article.reading_time} min</span>
          <span className="sep">·</span>
          <span>{formatDate(article.created_at)}</span>
        </div>
      </div>
    </article>
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
          <div className="grid" style={{ marginTop: "8px" }}>
            {articles.map((a) => (
              <Card siteId={site.id} article={a} key={a.id} />
            ))}
          </div>
        )}
      </WalviShell>
    </>
  );
}
