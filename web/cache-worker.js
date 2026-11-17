/**
 * Edge-cache wrapper around the OpenNext worker.
 *
 * Workers free plan allows ~10ms CPU per request; Next SSR intermittently
 * exceeds it and Cloudflare kills the request with error 1102 (surfaces as
 * intermittent 503s). Serving GET HTML/RSC from the zone cache skips SSR
 * entirely on hits, so almost all traffic costs ~0 CPU.
 *
 * - 5 min TTL per colo; content freshness is fine (articles are drip-published).
 * - The stored copy gets its own Cache-Control; the client still receives the
 *   original headers, so browsers don't over-cache dynamic pages.
 * - caches.default is a no-op on workers.dev — this only helps on the real
 *   domains, which is where the traffic is.
 */
import worker from "./.open-next/worker.js";
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

// 30 min per-colo cache. Longer TTL = far fewer SSR renders, which keeps the
// free-plan 10ms-CPU limit (error 1102 → 5XX) from firing during aggressive
// crawls (e.g. Ahrefs Site Audit). Content is drip-published, so 30 min stale
// is fine; new posts still appear within the window.
const TTL = 1800;
// RSC (text/x-component) is NOT cached: it's keyed on request headers (RSC,
// Next-Router-State-Tree, prefetch), not the URL, so caching it under the page URL
// served raw "0:{...}" flight data to normal visitors as the homepage.
// Browsers must revalidate pages: a 4-hour browser copy outlives a deploy and then
// pairs old HTML with the new server.
const CLIENT_CC = "public, max-age=0, must-revalidate";
// image/png: the on-demand /card/ and /pin/ images (Satori renders are the most CPU-heavy requests)
const CACHEABLE_CT = /text\/html|text\/plain|application\/(xml|rss\+xml|xml|rss)|text\/xml|image\/png/;

function isRscRequest(request, url) {
  const h = request.headers;
  return h.get("rsc") === "1" || h.has("next-router-state-tree") ||
    h.has("next-router-prefetch") || url.searchParams.has("_rsc");
}

// The site components build links as /s/<site>/<path> (the internal route); on a
// single-site deployment middleware 308s those to /<path>. Every internal link was
// therefore a redirect hop for Googlebot — wasted crawl budget, and some /s/ URLs got
// indexed as duplicates. Rewrite them to the clean URL in the served HTML.
function cleanLinks(res, siteId) {
  if (!siteId) return res;
  const prefix = `/s/${siteId}`;
  const fix = (attr) => ({
    element(el) {
      const v = el.getAttribute(attr);
      if (!v || !v.startsWith(prefix)) return;
      const rest = v.slice(prefix.length);
      if (rest && !/^[/?#]/.test(rest)) return; // e.g. /s/countly-foo is not ours
      el.setAttribute(attr, rest.startsWith("/") ? rest : `/${rest}`);
    },
  });
  return new HTMLRewriter()
    .on(`a[href^="${prefix}"]`, fix("href"))
    .on(`link[href^="${prefix}"]`, fix("href"))
    .on(`form[action^="${prefix}"]`, fix("action"))
    .transform(res);
}


const SEO_DOC_TTL = 3600;

function isSitemapPath(pathname) {
  return pathname === "/sitemap.xml" || pathname === "/sitemap-index.xml" ||
    /^\/sitemap-[a-z0-9][a-z0-9-]*\.xml$/.test(pathname);
}

function fallbackRobots(request, env) {
  const origin = new URL(request.url).origin;
  const sitemap = env && env.SITE_ID === "gccguide" ? `${origin}/sitemap-index.xml` : `${origin}/sitemap.xml`;
  const body = `User-agent: *\nAllow: /\n\nHost: ${origin}\nSitemap: ${sitemap}\n`;
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-robots-fallback": "static",
    },
  });
}

function edgeTtl(url, env) {
  if (url.pathname === "/robots.txt" || isSitemapPath(url.pathname)) return SEO_DOC_TTL;
  if (env && env.SITE_ID === "ninetymins" && /^\/(match|embed|league|team|today|tomorrow)(\/|$)/.test(url.pathname)) return 30;
  return TTL;
}

async function robotsDoc(request, url, env, ctx) {
  const keyUrl = new URL(url.toString());
  const ver = env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id;
  if (ver) keyUrl.searchParams.set("__v", ver);
  const cacheKey = new Request(keyUrl.toString());
  const cache = caches.default;
  try {
    const hit = await cache.match(cacheKey);
    if (hit && hit.status === 200 && (hit.headers.get("content-type") || "").includes("text/plain")) {
      const h = new Headers(hit.headers);
      h.set("x-edge-cache", "HIT");
      h.set("cache-control", "public, max-age=3600");
      return new Response(hit.body, { status: 200, headers: h });
    }
  } catch { /* cache is best-effort */ }
  // Answer immediately with a static file so a CPU kill (error 1102) during
  // Next's robots render cannot turn the fetch into a 5xx. The full robots.txt
  // is filled into the edge cache in the background when the render succeeds.
  ctx.waitUntil((async () => {
    try {
      const res = await worker.fetch(request, env, ctx);
      if (!res || res.status !== 200 || !(res.headers.get("content-type") || "").includes("text/plain")) return;
      const body = await res.text();
      if (!body.trim()) return;
      await cache.put(cacheKey, new Response(body, {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": `public, s-maxage=${SEO_DOC_TTL}` },
      }));
    } catch { /* static response already went out */ }
  })());
  const res = fallbackRobots(request, env);
  res.headers.set("x-edge-cache", "MISS");
  return res;
}

export default {
  async fetch(request, env, ctx) {
    let res;
    try {
      res = await route(request, env, ctx);
    } catch (err) {
      // robots.txt never 5xxs — Google Search Console treats a failed fetch as a site error.
      if (new URL(request.url).pathname === "/robots.txt") return fallbackRobots(request, env);
      throw err;
    }
    if (new URL(request.url).pathname === "/robots.txt" && res.status >= 500) return fallbackRobots(request, env);
    const ct = res.headers.get("content-type") || "";
    return ct.includes("text/html") ? cleanLinks(res, env.SITE_ID) : res;
  },
};

const route = async (request, env, ctx) => {
    if (request.method !== "GET") return worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return worker.fetch(request, env, ctx);
    // Live status pages must stay fresh (data changes every 5 min).
    if (url.pathname === "/status" || url.pathname.startsWith("/status/")) return worker.fetch(request, env, ctx);
    if (url.pathname === "/robots.txt") return robotsDoc(request, url, env, ctx);
    if (isRscRequest(request, url)) return worker.fetch(request, env, ctx);

    // Key on the deployed version so a deploy never serves HTML from the previous
    // build (old chunk hashes / build id -> "server-side exception" on the client).
    const keyUrl = new URL(url.toString());
    const ver = env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id;
    if (ver) keyUrl.searchParams.set("__v", ver);
    const cacheKey = new Request(keyUrl.toString());
    const cache = caches.default;
    try {
      const hit = await cache.match(cacheKey);
      // Entries stored before the RSC fix may still be flight data — ignore them.
      if (hit && !(hit.headers.get("content-type") || "").includes("x-component")) {
        const h = new Headers(hit.headers);
        h.set("x-edge-cache", "HIT");
        h.set("cache-control", CLIENT_CC);
        return new Response(hit.body, { status: hit.status, headers: h });
      }
    } catch {}

    const res = await worker.fetch(request, env, ctx);
    const ct = res.headers.get("content-type") || "";
    if (res.status === 200 && CACHEABLE_CT.test(ct)) {
      try {
        const buf = await res.arrayBuffer();
        // A streamed SSR error still returns 200 — never store it.
        const bad = ct.includes("text/html") && new TextDecoder().decode(buf).includes("data-dgst=");
        const storeHeaders = new Headers(res.headers);
        storeHeaders.set("cache-control", `public, s-maxage=${edgeTtl(url, env)}`);
        storeHeaders.delete("set-cookie");
        if (!bad) ctx.waitUntil(cache.put(cacheKey, new Response(buf, { status: 200, headers: storeHeaders })));
        const h = new Headers(res.headers);
        h.set("x-edge-cache", bad ? "BYPASS" : "MISS");
        h.set("cache-control", CLIENT_CC);
        return new Response(buf, { status: 200, headers: h });
      } catch {
        return res;
      }
    }
    return res;
};
