import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { buildEmbed, parseEmbedPair } from "@/sites/gccguide/hub/remittance";
import { isYm } from "@/sites/gccguide/hub/remittance-math";
import { thin, toPath } from "@/sites/gccguide/hub/series";
import { fmt, pct, dateShort, dateLong } from "@/sites/gccguide/hub/format";

/* /embed/remittance/<gulf>-to-<home>[?m=yyyy-mm][&theme=light|dark]
 *
 * A self-contained HTML widget for other sites' iframes: one inline SVG and
 * inline CSS, no scripts, no ads, no analytics, noindex. The attribution link is
 * rel="nofollow" (Google: links inside widgets are not editorial). */

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function page(body: string, theme: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>GCCGuide remittance chart</title><style>
:root{--bg:#ffffff;--fg:#0f172a;--mu:#64748b;--ln:#e2e8f0;--ac:#0d9488;--dn:#e11d48}
@media (prefers-color-scheme:dark){:root:not(.light){--bg:#0f1220;--fg:#e9ebf5;--mu:#9197ad;--ln:#1b2236;--ac:#2fd3c7;--dn:#ff6f6f}}
:root.dark{--bg:#0f1220;--fg:#e9ebf5;--mu:#9197ad;--ln:#1b2236;--ac:#2fd3c7;--dn:#ff6f6f}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.w{padding:14px 16px;border:1px solid var(--ln);border-radius:12px;min-height:100vh;display:flex;flex-direction:column;gap:6px}
.k{color:var(--mu);font-size:12px;text-transform:uppercase;letter-spacing:.04em}.v{font-size:26px;font-weight:750;font-variant-numeric:tabular-nums}.v small{font-size:14px;color:var(--mu);font-weight:600;margin-left:4px}
.d{font-weight:700}.up{color:var(--ac)}.down{color:var(--dn)}.row{display:flex;gap:14px;flex-wrap:wrap;color:var(--mu);font-size:12.5px}
svg{width:100%;height:auto;display:block;color:var(--ac)}svg.down{color:var(--dn)}.x{display:flex;justify-content:space-between;color:var(--mu);font-size:11px}
.dl-fab,#dream-concerns{display:none!important}
.f{margin-top:auto;display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--mu)}.f a{color:var(--mu)}
</style></head><body><div class="w">${body}</div></body></html>`.replace("<html lang=\"en\">", `<html lang="en" class="${theme}">`);
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, follow",
      "cache-control": "public, max-age=1800, s-maxage=1800",
    },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ site: string; pair: string }> }) {
  const { site: id, pair } = await params;
  const site = getSite(id);
  const url = new URL(req.url);
  const t = url.searchParams.get("theme");
  const theme = t === "dark" ? "dark" : t === "light" ? "light" : "";
  const p = parseEmbedPair(pair);
  if (!site || site.id !== "gccguide" || !p) return page(`<p>Unknown corridor.</p>`, theme, 404);
  const m = url.searchParams.get("m");
  const e = await buildEmbed(p.from, p.to, m && isYm(m) ? m : null);
  if (!e) return page(`<p>Data temporarily unavailable.</p>`, theme, 503);

  const base = siteBaseUrl(site);
  const reportUrl = `${base}/reports/remittance/${e.ym}`;
  const pts = thin(e.points, 120);
  const W = 560;
  const H = 150;
  const path = toPath(pts, W, H, 4);
  const up = pts.length > 1 && pts[pts.length - 1].v >= pts[0].v;
  const ticks = pts.length > 1 ? [0, 0.5, 1].map((f) => pts[Math.round(f * (pts.length - 1))]) : [];
  const dcls = (n: number | null) => (n == null ? "" : n >= 0 ? "up" : "down");

  const body = `
<span class="k">${esc(p.from)} → ${esc(p.to)} · ${esc(e.label)}${e.complete ? "" : " (so far)"}</span>
<div class="v">${fmt(e.pm.end.v, e.dp)}<small>${esc(p.to)} per 1 ${esc(p.from)}</small></div>
<div class="row"><span>vs prev. month <b class="d ${dcls(e.pm.chPrev)}">${pct(e.pm.chPrev)}</b></span><span>vs 12 months ago <b class="d ${dcls(e.pm.chYear)}">${pct(e.pm.chYear)}</b></span><span>${e.complete ? "month-end" : "latest"} ${esc(dateLong(e.pm.end.d))}</span></div>
${path ? `<svg viewBox="0 0 ${W} ${H}" class="${up ? "up" : "down"}" role="img" aria-label="${esc(p.from)} to ${esc(p.to)}, 12 months"><path d="${path.area}" fill="currentColor" fill-opacity="0.1"/><path d="${path.line}" fill="none" stroke="currentColor" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg><div class="x">${ticks.map((x) => `<span>${esc(dateShort(x.d))}</span>`).join("")}</div>` : ""}
<div class="f"><span>Mid-market rate, not a bank rate</span><a href="${esc(reportUrl)}" target="_blank" rel="nofollow noopener">Source: GCCGuide</a></div>`;
  return page(body, theme);
}
