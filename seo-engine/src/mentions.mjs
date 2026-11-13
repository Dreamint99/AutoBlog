const safe = raw => {
  try { const u = new URL(raw); return u.protocol === "https:" && /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(u.hostname) && !/\.(local|internal|invalid|test)$/.test(u.hostname) && !/^\d+(?:\.\d+){3}$/.test(u.hostname) && !u.username && !u.password && (!u.port || u.port === "443") ? u : null; } catch { return null; }
};
const decode = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
export async function mentions(env) {
  const findings = [], checks = [];
  for (const [site, host] of [["ninetymins", "ninetymins.com"], ["countly", "countly.net"]]) {
    const q = `"${host}" -site:${host}`;
    const r = await fetch(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) { checks.push({ site, status: "search_unavailable", http: r.status }); continue; }
    const rss = await r.text();
    if (!rss.includes("<rss")) { checks.push({ site, status: "search_feed_unavailable" }); continue; }
    const search = [...rss.matchAll(/<item>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<\/item>/g)].map(m => decode(m[1]));
    const embeds = (await env.DB.prepare("SELECT host FROM seo_embed_hosts WHERE site_id=? ORDER BY last_seen DESC LIMIT 4").bind(site).all()).results.map(x => `https://${x.host}/`);
    for (const raw of [...new Set([...search, ...embeds])].slice(0, 4)) {
      const url = safe(raw); if (!url || url.hostname === host || url.hostname.endsWith("." + host)) continue;
      try {
        // No automatic redirects into unknown targets. Candidates remain human-reviewed.
        const page = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8000) });
        if (!page.ok || !/text\/html/.test(page.headers.get("content-type") || "") || Number(page.headers.get("content-length") || 0) > 1000000) continue;
        const reader = page.body.getReader(); const decoder = new TextDecoder(); let html = "";
        while (html.length < 300000) { const next = await reader.read(); if (next.done) break; html += decoder.decode(next.value, { stream: true }); }
        await reader.cancel();
        const linked = new RegExp(`<a\\b[^>]*href=["']https?://(?:www\\.)?${host.replace(/\./g, "\\.")}(?:[/'"?#])`, "i").test(html);
        const brand = html.toLowerCase().includes(host) || site === "ninetymins" && /ninetymins/i.test(html);
        if (brand && !linked) findings.push({ site, url: url.href, status: "potential_unlinked_mention", evidence: "Brand/domain found in fetched HTML; no direct HTML anchor to the site found. Dynamic links and attribution must be checked by a person." });
      } catch { /* unavailable public page; never infer a mention */ }
    }
    checks.push({ site, status: "searched", candidates: search.length, knownEmbedHosts: embeds.length });
  }
  await env.SEO_LOG.put("engine:mentions", JSON.stringify({ at: new Date().toISOString(), findings, checks, note: "Bing RSS is an undocumented free feed and can be unavailable. No outreach or messages are sent. Attribution is optional." }));
}
