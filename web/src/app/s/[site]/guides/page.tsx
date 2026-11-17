import { defaultOgImages } from "@/lib/og";
import "@/sites/walvi/theme.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticles } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { WalviShell } from "@/sites/walvi/Chrome";
import { PageBanner, Crumbs } from "@/sites/walvi/data-ui";
import { JsonLd, breadcrumbSchema, websiteSchema } from "@/lib/seo";
import { topicOf } from "@/sites/walvi/guide-meta";
import { GuideCard } from "@/sites/walvi/cards";
import { publicPath, sitePrefix } from "@/lib/public-path";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ topic?: string | string[]; page?: string | string[] }>;
}): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};
  // Page 1 keeps the original title/canonical. Unfiltered page N is its own
  // canonical (so deep guides stay indexable); topic views fold into /guides.
  const sp = await searchParams;
  const n = parseInt(one(sp.page), 10) || 1;
  const deep = !one(sp.topic) && n > 1;
  const canonical = deep ? `/guides?page=${n}` : "/guides";
  return {
    title: deep ? `Europe work permit & visa guides — page ${n} | VisaPoint` : "Europe work permit & visa guides | VisaPoint",
    description:
      "Step-by-step work-permit and visa guides for moving to Europe from Asia and the Gulf — documents, cost, processing time and scam warnings, with official sources.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical },
    openGraph: { images: defaultOgImages(),
      title: "Europe work permit & visa guides | VisaPoint",
      description: "Work-permit and visa guides for moving to Europe — documents, cost, timeline.",
      type: "website",
      url: canonical,
    },
  };
}

/* Topic filter chips + uniform guide cards (cards.tsx artwork, no feature
   photos), paginated with real ?page=N links so every guide stays reachable by a
   plain <a> for crawlers. Topic views canonicalise to /guides. Card titles stay
   <h3>: the dream-concerns-inject worker drops a lead card before the 2nd
   `article h2`, which inside these React cards breaks hydration (#418). */
const PER_PAGE = 24;
const TOPICS = ["Work permit", "Salaries", "Jobs", "Cost of living", "Scam alert", "Guide"] as const;
const slugOf = (t: string) => t.toLowerCase().replace(/[^a-z]+/g, "-");
const TOPIC_LABEL: Record<string, string> = { "Work permit": "Visas & permits", Guide: "Other guides" };

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v || "").trim();
}

function pageHref(b: string, topic: string, page: number): string {
  const q = new URLSearchParams();
  if (topic) q.set("topic", topic);
  if (page > 1) q.set("page", String(page));
  const s = q.toString();
  return `${b}/guides${s ? `?${s}` : ""}`;
}

/** 1 … 4 5 [6] 7 8 … 15 */
function pageList(cur: number, last: number): (number | "gap")[] {
  const out: (number | "gap")[] = [];
  for (let p = 1; p <= last; p++) {
    if (p === 1 || p === last || Math.abs(p - cur) <= 2) out.push(p);
    else if (out[out.length - 1] !== "gap") out.push("gap");
  }
  return out;
}

export default async function GuidesPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ topic?: string | string[]; page?: string | string[] }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();

  const sp = await searchParams;
  const articles = (await getArticles(site.id)).filter((a) => !a.is_mock);
  const base = siteBaseUrl(site);
  const b = sitePrefix(site.id);

  const counts = new Map<string, number>();
  for (const a of articles) counts.set(topicOf(a), (counts.get(topicOf(a)) || 0) + 1);
  const topics = TOPICS.filter((t) => counts.get(t));
  const active = topics.find((t) => slugOf(t) === one(sp.topic).toLowerCase());
  const topicSlug = active ? slugOf(active) : "";
  const list = active ? articles.filter((a) => topicOf(a) === active) : articles;
  const last = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const page = Math.min(last, Math.max(1, parseInt(one(sp.page), 10) || 1));
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
        <Crumbs items={[{ name: site.name, href: publicPath(site.id, "/") }, { name: "Guides" }]} />
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
          <>
            <nav className="vx-filter" aria-label="Filter guides by topic">
              <ul className="vx-chips">
                <li>
                  <Link href={pageHref(b, "", 1)} aria-current={!active ? "page" : undefined}>
                    All guides <small>{articles.length}</small>
                  </Link>
                </li>
                {topics.map((t) => (
                  <li key={t}>
                    <Link href={pageHref(b, slugOf(t), 1)} aria-current={active === t ? "page" : undefined}>
                      {TOPIC_LABEL[t] || t} <small>{counts.get(t)}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="vx-count">
              {active ? `${TOPIC_LABEL[active] || active}: ` : ""}
              {list.length} guides{last > 1 ? ` · page ${page} of ${last}` : ""}
            </p>
            <div className="vx-cards vx-guidegrid">
              {shown.map((a) => (
                <GuideCard site={site} a={a} key={a.id} />
              ))}
            </div>
            {last > 1 ? (
              <nav className="vx-pager" aria-label="Guide pages">
                {page > 1 ? (
                  <Link href={pageHref(b, topicSlug, page - 1)} rel="prev" className="vx-pg-step">
                    ← Previous
                  </Link>
                ) : (
                  <span className="vx-pg-step is-off">← Previous</span>
                )}
                <span className="vx-pg-nums">
                  {pageList(page, last).map((p, i) =>
                    p === "gap" ? (
                      <span className="vx-pg-gap" key={`g${i}`}>
                        …
                      </span>
                    ) : p === page ? (
                      <span className="vx-pg-cur" aria-current="page" key={p}>
                        {p}
                      </span>
                    ) : (
                      <Link href={pageHref(b, topicSlug, p)} key={p}>
                        {p}
                      </Link>
                    ),
                  )}
                </span>
                {page < last ? (
                  <Link href={pageHref(b, topicSlug, page + 1)} rel="next" className="vx-pg-step">
                    Next →
                  </Link>
                ) : (
                  <span className="vx-pg-step is-off">Next →</span>
                )}
              </nav>
            ) : null}
          </>
        )}
      </WalviShell>
    </>
  );
}
