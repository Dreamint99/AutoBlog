/** Client-safe public URLs.

SITE_ID is inlined by next.config (`env.SITE_ID`). On a single-site deploy the
`/s/<id>` branch is dead and never appears in HTML or the RSC payload. Local
multi-site dev (no SITE_ID) keeps the internal prefix.
*/
function suffixFor(path: string): string {
  if (!path || path === "/") return "";
  if (path.startsWith("/") || path.startsWith("#") || path.startsWith("?")) return path;
  return `/${path}`;
}

/** Canonical path for an internal link. `path` is "/", "/page", "#hash" or "?q". */
export function publicPath(siteId: string, path = "/"): string {
  const suffix = suffixFor(path);
  if (process.env.SITE_ID) return suffix || "/";
  return internalPrefix(siteId) + suffix;
}

/** Prefix for concatenated links (`${prefix}/page`). Empty when SITE_ID is set. */
export function sitePrefix(siteId: string): string {
  if (process.env.SITE_ID) return "";
  return internalPrefix(siteId);
}

function internalPrefix(siteId: string): string {
  return "/s/" + siteId;
}
