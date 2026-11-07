/**
 * /archive — every published article, newest first, grouped by month.
 *
 * An HTML sitemap: the home page and "related" boxes only reach the newest or most
 * similar posts, so older articles were several clicks deep or linked from nowhere
 * (Search Console: "Discovered – currently not indexed"). One crawlable page that
 * links every article gives each a real internal link within two clicks of home.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticles } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { publicPath } from "@/lib/site-context";
import { LegalLayout } from "@/sites/LegalLayout";
import { isVcArticle, vcFor } from "@/sites/walvi/visacheck/data";

export const dynamic = "force-dynamic";
const SUPPORTED = new Set(["countly", "walvi", "infkey", "ninetymins", "gccguide"]);

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) return {};
  return {
    title: `All articles | ${site.name}`,
    description: `Every ${site.name} guide and data article in one list, newest first, grouped by month.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/archive" },
    robots: { index: true, follow: true },
  };
}

export default async function ArchivePage({ params }: { params: Promise<{ site: string }> }) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();
  const articles = (await getArticles(site.id)).filter(
    (a) => !(site.id === "walvi" && isVcArticle(a) && vcFor(a)),
  );

  const groups = new Map<string, typeof articles>();
  for (const a of articles) {
    const d = new Date(a.created_at);
    const key = isNaN(d.getTime())
      ? "Earlier"
      : d.toLocaleDateString("en-US", { year: "numeric", month: "long", timeZone: "UTC" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  return (
    <LegalLayout site={site} kicker="Archive" title={`All ${site.name} articles`}>
      <p>
        {articles.length} articles, newest first. Use <Link href={publicPath(site.id, "/search")}>search</Link> to find a
        topic quickly.
      </p>
      {[...groups.entries()].map(([month, list]) => (
        <section key={month}>
          <h2>{month}</h2>
          <ul className="archive-list">
            {list.map((a) => (
              <li key={a.slug}>
                <Link href={publicPath(site.id, `/${a.slug}`)} prefetch={false}>
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </LegalLayout>
  );
}
