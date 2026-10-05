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
const CACHEABLE_CT = /text\/html|application\/(xml|rss)|text\/xml/;

function isRscRequest(request, url) {
  const h = request.headers;
  return h.get("rsc") === "1" || h.has("next-router-state-tree") ||
    h.has("next-router-prefetch") || url.searchParams.has("_rsc");
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET") return worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return worker.fetch(request, env, ctx);
    if (isRscRequest(request, url)) return worker.fetch(request, env, ctx);

    const cacheKey = new Request(url.toString());
    const cache = caches.default;
    try {
      const hit = await cache.match(cacheKey);
      // Entries stored before the RSC fix may still be flight data — ignore them.
      if (hit && !(hit.headers.get("content-type") || "").includes("x-component")) {
        const h = new Headers(hit.headers);
        h.set("x-edge-cache", "HIT");
        return new Response(hit.body, { status: hit.status, headers: h });
      }
    } catch {}

    const res = await worker.fetch(request, env, ctx);
    const ct = res.headers.get("content-type") || "";
    if (res.status === 200 && CACHEABLE_CT.test(ct)) {
      try {
        const buf = await res.arrayBuffer();
        const storeHeaders = new Headers(res.headers);
        storeHeaders.set("cache-control", `public, s-maxage=${TTL}`);
        storeHeaders.delete("set-cookie");
        ctx.waitUntil(cache.put(cacheKey, new Response(buf, { status: 200, headers: storeHeaders })));
        const h = new Headers(res.headers);
        h.set("x-edge-cache", "MISS");
        return new Response(buf, { status: 200, headers: h });
      } catch {
        return res;
      }
    }
    return res;
  },
};
