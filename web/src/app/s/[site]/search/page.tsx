import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, getArticles } from "@/lib/data";
import CountlySearch from "@/sites/countly/Search";

export const dynamic = "force-dynamic";
// Search results shouldn't be indexed.
export const metadata: Metadata = { robots: { index: false, follow: true } };

const SUPPORTED = new Set(["countly"]);

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || !SUPPORTED.has(site.id)) notFound();

  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q || "").trim();

  let results = [] as Awaited<ReturnType<typeof getArticles>>;
  if (q) {
    const tokens = q.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
    const all = await getArticles(site.id);
    results = all
      .map((a) => {
        const hay = `${a.title} ${a.excerpt} ${a.keyword} ${(a.tags || []).join(" ")}`.toLowerCase();
        const score = tokens.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
        return { a, score };
      })
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 60)
      .map((x) => x.a);
  }

  return <CountlySearch site={site} q={q} results={results} />;
}
