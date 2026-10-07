import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, searchArticles } from "@/lib/data";
import type { Article } from "@/lib/types";
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

  let results = [] as Article[];
  if (q) {
    // Each token is matched in D1 (bodies included) and cached; rank by how many hit.
    const tokens = [...new Set(q.toLowerCase().split(/\s+/).filter((t) => t.length >= 2))].slice(0, 6);
    const hits = new Map<string, { a: Article; score: number }>();
    for (const t of tokens) {
      for (const a of await searchArticles(site.id, t)) {
        const h = hits.get(a.id) ?? { a, score: 0 };
        h.score += 1;
        hits.set(a.id, h);
      }
    }
    results = [...hits.values()]
      .sort((x, y) => y.score - x.score || (x.a.created_at < y.a.created_at ? 1 : -1))
      .slice(0, 60)
      .map((x) => x.a);
  }

  return <CountlySearch site={site} q={q} results={results} />;
}
