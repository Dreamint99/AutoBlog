import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite, searchArticles, getArticles } from "@/lib/data";
import type { Article } from "@/lib/types";
import CountlySearch from "@/sites/countly/Search";
import InfkeySearch from "@/sites/infkey/Search";
import WalviSearch from "@/sites/walvi/Search";
import GccSearch from "@/sites/gccguide/Search";

export const dynamic = "force-dynamic";
// Search results shouldn't be indexed.
export const metadata: Metadata = { robots: { index: false, follow: true } };

const SUPPORTED = new Set(["countly", "infkey", "walvi", "gccguide"]);
const STOP = new Set("a an the of for to in on and or how is are what best with by my your free 2025 2026".split(" "));

/** Cheap ranking over the cached article list (no body scan): title words count double. */
function rankList(list: Article[], q: string): Article[] {
  const toks = [...new Set(q.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !STOP.has(t)))].slice(0, 8);
  if (!toks.length) return [];
  return list
    .map((a) => {
      const title = a.title.toLowerCase();
      const rest = `${a.keyword || ""} ${a.excerpt || ""} ${(a.tags || []).join(" ")}`.toLowerCase();
      const hit = toks.filter((t) => title.includes(t) || rest.includes(t)).length;
      const score = toks.reduce((s, t) => s + (title.includes(t) ? 2 : rest.includes(t) ? 1 : 0), 0);
      return { a, score, hit };
    })
    // most of the query's words must appear, not just the common ones
    .filter((x) => x.hit >= Math.max(1, Math.ceil(toks.length * 0.75)))
    .sort((x, y) => y.score - x.score || (x.a.created_at < y.a.created_at ? 1 : -1))
    .slice(0, 30)
    .map((x) => x.a);
}

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

  if (site.id !== "countly") {
    const results = q ? rankList(await getArticles(site.id), q) : [];
    const View = site.id === "infkey" ? InfkeySearch : site.id === "gccguide" ? GccSearch : WalviSearch;
    return <View site={site} q={q} results={results} />;
  }

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
