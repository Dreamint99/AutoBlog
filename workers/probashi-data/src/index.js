// probashi-data: read-only JSON for probashiinfo.com data pages (rendered by the WP snippet "PBD data pages").
// Every dataset carries `updated` and per-row `source`. Pages list = what the snippet may render + index.
import visaCheck from "../../../probashi-data/data/visa_check.json";
import gamca from "../../../probashi-data/data/gamca.json";
import customs from "../../../probashi-data/data/customs.json";
import visaExtra from "../../../probashi-data/data/visa_extra.json";

// /v1/visa: live Bangladesh-passport codes from D1 (pi_passport, refreshed weekly) + Bangladeshi-specific extras
async function visaData(env) {
  const meta = await env.DB.prepare("SELECT k, v FROM pi_meta WHERE k IN ('dest','updated_at','source')").all();
  const M = Object.fromEntries(meta.results.map((r) => [r.k, r.v]));
  const bd = await env.DB.prepare("SELECT codes, rank, free, voa, eta, evisa, required FROM pi_passport WHERE iso2 = 'BD'").first();
  const dest = JSON.parse(M.dest), codes = JSON.parse(bd.codes);
  const code = Object.fromEntries(dest.map((d, i) => [d.iso2, codes[i]]));
  return {
    updated: (M.updated_at || "").slice(0, 10), source: "Passport Index dataset (ilyankou/passport-index-dataset, MIT)", source_url: M.source,
    rank: bd.rank, counts: { free: bd.free, voa: bd.voa, eta: bd.eta, evisa: bd.evisa, required: bd.required },
    countries: visaExtra.countries.map((c) => ({ ...c, code: code[c.iso2] || "" })).filter((c) => c.code),
  };
}
import agency from "../../../probashi-data/data/agency.json";
import migrationCost from "../../../probashi-data/data/migration_cost.json";
const AG = new Map(agency.agencies.map((a) => [a.slug, a]));
const agencyIndex = { updated: agency.updated, source: agency.source, source_url: agency.source_url,
  agencies: agency.agencies.map((a) => ({ slug: a.slug, rl: a.rl, name: a.name, status: a.status, release: a.release })) };
import { remittance, CURRENCIES } from "./remittance.js";

const SITE = "https://probashiinfo.com";
const DATA = { "visa-check": visaCheck, gamca, customs, "agency-index": agencyIndex, "migration-cost": migrationCost };

function pages() {
  const today = new Date().toISOString().slice(0, 10);
  const out = [{ path: "/visa-check/", index: false, lastmod: visaCheck.updated }];
  for (const c of visaCheck.countries) out.push({ path: `/visa-check/${c.slug}/`, index: true, lastmod: visaCheck.updated });
  out.push({ path: "/visa/", index: true, lastmod: visaExtra.updated });
  for (const c of visaExtra.countries) out.push({ path: `/visa/${c.slug}/`, index: !!(c.index && c.release && c.release <= today), lastmod: c.release && c.release > visaExtra.updated ? c.release : visaExtra.updated });
  out.push({ path: "/customs/", index: true, lastmod: customs.updated });
  for (const t of customs.topics) out.push({ path: `/customs/${t.slug}/`, index: true, lastmod: customs.updated });
  out.push({ path: "/baggage/", index: true, lastmod: customs.updated });
  for (const a of customs.airlines) out.push({ path: `/baggage/${a.slug}/`, index: true, lastmod: customs.updated });
  out.push({ path: "/gamca/", index: true, lastmod: gamca.updated });
  for (const c of gamca.cities) out.push({ path: `/gamca/${c.slug}/`, index: c.index, lastmod: gamca.updated });
  out.push({ path: "/agency/", index: true, lastmod: agency.updated });
  out.push({ path: "/migration-cost/", index: true, lastmod: migrationCost.updated });
  for (const a of agency.agencies) out.push({ path: `/agency/${a.slug}/`, index: a.release <= today, lastmod: a.release > agency.updated ? a.release : agency.updated });
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
    const one = url.pathname.match(/^\/v1\/agency\/(rl-\d+)\/?$/);
    if (one) {
      const a = AG.get(one[1]);
      return a ? json({ updated: agency.updated, source: agency.source, source_url: agency.source_url, agency: a }) : json({ error: "not found" }, 404, 30);
    }
    const m = url.pathname.match(/^\/v1\/([a-z-]+)\/?$/);
    if (url.pathname === "/" || url.pathname === "/health") return json({ ok: true, datasets: Object.keys(DATA) }, 200, 60);
    if (!m) return json({ error: "not found" }, 404, 30);
    if (m[1] === "pages") return json({ site: SITE, pages: pages() });
    if (DATA[m[1]]) return json(DATA[m[1]]);
    if (m[1] === "visa") {
      const cache = caches.default, key = new Request("https://pbd.cache/visa-v1");
      let hit = await cache.match(key);
      if (hit) return hit;
      const res = json(await visaData(env), 200, 12 * 3600);
      await cache.put(key, res.clone());
      return res;
    }
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
