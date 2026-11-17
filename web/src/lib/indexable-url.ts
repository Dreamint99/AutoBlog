/** Sitemap locs: canonical, indexable, no redirect hop.

Drops internal `/s/<site>` paths (middleware 308s those), noindex shells
(search, embeds, admin, card images) and query-string URLs (the compare pages
301 `?a=&b=` to a sorted path). Callers still have to omit 404s and pages whose
own metadata is noindex.
*/
export function indexableLoc(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  let path = u.pathname || "/";
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (!path.startsWith("/")) return null;
  if (path.split("/").includes("s")) return null;
  if (/^\/(search|embed|admin|api|card|pin)(\/|$)/.test(path)) return null;
  if (u.search) return null;
  u.pathname = path;
  u.search = "";
  u.hash = "";
  return u.toString();
}

export function indexableEntries<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const loc = indexableLoc(item.url);
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    out.push({ ...item, url: loc });
  }
  return out;
}
