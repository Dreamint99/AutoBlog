// probashi-data: read-only JSON for probashiinfo.com data pages (rendered by the WP snippet "PBD data pages").
// Every dataset carries `updated` and per-row `source`. Pages list = what the snippet may render + index.
import visaCheck from "../../../probashi-data/data/visa_check.json";
import gamca from "../../../probashi-data/data/gamca.json";
import { remittance, CURRENCIES } from "./remittance.js";

const SITE = "https://probashiinfo.com";
const DATA = { "visa-check": visaCheck, gamca };

function pages() {
  const out = [{ path: "/visa-check/", index: false, lastmod: visaCheck.updated }];
  for (const c of visaCheck.countries) out.push({ path: `/visa-check/${c.slug}/`, index: true, lastmod: visaCheck.updated });
  out.push({ path: "/gamca/", index: true, lastmod: gamca.updated });
  for (const c of gamca.cities) out.push({ path: `/gamca/${c.slug}/`, index: c.index, lastmod: gamca.updated });
  const today = new Date().toISOString().slice(0, 10);
  out.push({ path: "/remittance/", index: true, lastmod: today });
  for (const c of CURRENCIES) out.push({ path: `/remittance/${c[1]}/`, index: true, lastmod: today });
  return out;
}

const json = (body, status = 200, maxAge = 3600) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${maxAge}`, "access-control-allow-origin": SITE },
  });

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/v1\/([a-z-]+)\/?$/);
    if (url.pathname === "/" || url.pathname === "/health") return json({ ok: true, datasets: Object.keys(DATA) }, 200, 60);
    if (!m) return json({ error: "not found" }, 404, 30);
    if (m[1] === "pages") return json({ site: SITE, pages: pages() });
    if (DATA[m[1]]) return json(DATA[m[1]]);
    if (m[1] === "remittance") {
      const cache = caches.default, key = new Request("https://pbd.cache/remittance-v2");
      let hit = await cache.match(key);
      if (hit) return hit;
      const d = await remittance();
      if (!d) return json({ error: "rates unavailable" }, 503, 60);
      const res = json(d, 200, 3 * 3600);
      await cache.put(key, res.clone());
      return res;
    }
    return json({ error: "unknown dataset" }, 404, 30);
  },
};
