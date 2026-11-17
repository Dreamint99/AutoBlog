const sites = { ninetymins: "https://ninetymins.com/", countly: "https://countly.net/" };
const base64 = x => btoa(String.fromCharCode(...new Uint8Array(x))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
async function token(raw) {
  const c = JSON.parse(raw), t = Math.floor(Date.now() / 1000), enc = new TextEncoder();
  const head = base64(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const body = base64(enc.encode(JSON.stringify({ iss: c.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: "https://oauth2.googleapis.com/token", iat: t, exp: t + 3500 })));
  const pem = c.private_key.replace(/-----[^-]+-----|\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = base64(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(`${head}.${body}`)));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${body}.${signature}` }) });
  if (!r.ok) throw new Error(`Google authentication HTTP ${r.status}`); return (await r.json()).access_token;
}
const day = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
async function google(access, url, body) { const r = await fetch(url, { method: "POST", signal: AbortSignal.timeout(15000), headers: { authorization: `Bearer ${access}`, "content-type": "application/json" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`Search Console HTTP ${r.status}`); return r.json(); }
export async function monitor(env) {
  const result = { at: new Date().toISOString(), sites: {}, credentialStatus: { gsc: !!env.GSC_SERVICE_ACCOUNT, bing: !!env.BING_WEBMASTER_API_KEY } };
  const access = env.GSC_SERVICE_ACCOUNT ? await token(env.GSC_SERVICE_ACCOUNT) : null;
  for (const [site, property] of Object.entries(sites)) {
    const data = { gsc: { status: "not_configured", reason: "Existing GitHub OIDC credentials are not usable in Cloudflare. Configure GSC_SERVICE_ACCOUNT to enable live read-only pulls." }, bing: { status: "not_configured" } };
    if (access) {
      const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
      const current = await google(access, endpoint, { startDate: day(9), endDate: day(3), dimensions: ["query"], rowLimit: 25000 });
      const previous = await google(access, endpoint, { startDate: day(16), endDate: day(10), dimensions: ["query"], rowLimit: 25000 });
      const before = new Set((previous.rows || []).map(r => r.keys[0]));
      const newQueries = (current.rows || []).filter(r => !before.has(r.keys[0])).sort((a, b) => b.impressions - a.impressions).slice(0, 20).map(r => ({ query: r.keys[0], impressions: r.impressions, clicks: r.clicks }));
      const urls = site === "ninetymins" ? (await env.DB.prepare("SELECT path FROM seo_matches ORDER BY lastmod DESC LIMIT 5").all()).results.map(r => property.slice(0, -1) + r.path) : (await env.DB.prepare("SELECT kind,slug FROM seo_pages WHERE site_id='countly' ORDER BY lastmod DESC LIMIT 5").all()).results.map(r => `${property}data/${r.kind}/${r.slug}`);
      const inspected = [];
      for (const url of urls) { const j = await google(access, "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", { inspectionUrl: url, siteUrl: property, languageCode: "en-US" }); const status = j.inspectionResult?.indexStatusResult; inspected.push({ url, verdict: status?.verdict, coverage: status?.coverageState }); }
      data.gsc = { status: "ok", window: [day(9), day(3)], topNewQueries: newQueries, sampledIndexedShare: inspected.length ? inspected.filter(r => r.verdict === "PASS").length / inspected.length : null, sampleSize: inspected.length, inspections: inspected, note: "Newest five changed URLs; not a site-wide indexing rate. Query lists can omit anonymized queries." };
    }
    if (env.BING_WEBMASTER_API_KEY) {
      const r = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=${encodeURIComponent(property)}&apikey=${encodeURIComponent(env.BING_WEBMASTER_API_KEY)}`, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`Bing Webmaster HTTP ${r.status}`);
      const j = await r.json(); const rows = j.d || [];
      data.bing = { status: "ok", queryClicks: rows.reduce((n, r) => n + Number(r.Clicks || 0), 0), topQueries: rows.sort((a, b) => Number(b.Clicks || 0) - Number(a.Clicks || 0)).slice(0, 20), note: "Sum of returned query buckets; API coverage/window applies." };
    }
    result.sites[site] = data;
  }
  await env.SEO_LOG.put("engine:search", JSON.stringify(result));
  return result;
}
