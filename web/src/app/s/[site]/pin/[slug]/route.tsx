import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/ogFonts";
import { getArticle, getSite } from "@/lib/data";

// 1000×1500 (2:3) Pinterest pin for an article — the tall format Pinterest favours.
// Top: the article's own photo (fetched server-side; Wikimedia refuses requests without a
// User-Agent). Middle: the title as the hook. Then, when the article has a ranking table,
// a top-5 bar chart — data infographics are what spreads on Pinterest.
// /pins.xml lists these so a Pinterest business account can auto-publish every new article.
export const dynamic = "force-dynamic";

const THEME: Record<string, { a: string; b: string; accent: string }> = {
  "infkey-noir": { a: "#1e1b4b", b: "#7c3aed", accent: "#c4b5fd" },
  "walvi-atlas": { a: "#0b1f3a", b: "#134e4a", accent: "#2dd4bf" },
  "countly-data": { a: "#1e1b4b", b: "#4f46e5", accent: "#a5b4fc" },
  "ninetymins-pitch": { a: "#052e16", b: "#15803d", accent: "#bef264" },
  "gcc-night": { a: "#0c1222", b: "#7a1e3a", accent: "#fbbf24" },
};

const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#?\w+;/g, " ").replace(/\s+/g, " ").trim();
const MULT: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };

/** Top rows of the article's first table that pair a name with a number ("$25.2B", "1,580", "42%"). */
function topRows(html: string): { label: string; shown: string; v: number }[] {
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!table) return [];
  const rows: { label: string; shown: string; v: number }[] = [];
  for (const tr of table.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const cells = (tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []).map(text);
    if (tr.includes("<th")) continue;
    const label = cells.find((c) => /[A-Za-zঀ-৿]{2}/.test(c) && !/^\$?[\d.,]+\s*[kmbt%]?$/i.test(c));
    const nums = cells.filter((c) => c !== label && /\d/.test(c) && /^[^A-Za-z]*[\d.,]+\s*(k|m|b|t|bn|million|billion|%)?\b/i.test(c));
    // Prefer a value with a currency/unit/thousands separator; a bare 1-3 digit integer is usually the rank column.
    const numCell = nums.find((c) => /[$€£%]|\d\s*(k|m|b|t|bn|million|billion)\b|\d,\d{3}/i.test(c)) || nums.find((c) => !/^\d{1,3}$/.test(c.trim()));
    if (!label || !numCell) continue;
    const m = numCell.replace(/,/g, "").match(/([\d.]+)\s*(k|m|b|t|bn|million|billion)?/i);
    if (!m) continue;
    const unit = (m[2] || "").toLowerCase().replace("million", "m").replace(/^(billion|bn)$/, "b");
    rows.push({ label: label.slice(0, 34), shown: numCell.slice(0, 14), v: parseFloat(m[1]) * (MULT[unit] || 1) });
    if (rows.length === 5) break;
  }
  return rows.length >= 3 && rows.some((r) => r.v > 0) ? rows : [];
}

async function photoData(url: string): Promise<string> {
  if (!/^https:\/\//.test(url) || url.includes("/card/")) return "";
  try {
    const r = await fetch(url, { headers: { "User-Agent": "AutoBlogPins/1.0 (https://countly.net; pin images)" }, cf: { cacheTtl: 86400 } } as RequestInit);
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !/^image\/(jpeg|png|webp)/.test(type)) return "";
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 4_000_000) return "";
    return `data:${type.split(";")[0]};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return "";
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ site: string; slug: string }> }) {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const art = site ? await getArticle(site.id, slug) : undefined;
  const t = THEME[site?.theme ?? ""] ?? { a: "#111827", b: "#1f2937", accent: "#fbbf24" };
  const title = (art?.title || site?.name || "").trim();
  const sub = (art?.meta_description || art?.excerpt || "").trim().slice(0, 140);
  const tag = art?.tags?.[0] || site?.niche?.split(/[,.]/)[0] || "";
  const rows = art ? topRows(art.body_html || "") : [];
  // Graphics only (owner's call): no photo; the hook is a big number or the niche icon.
  const photo = "";
  void photoData;
  const max = Math.max(...rows.map((r) => r.v), 1);
  const fs = title.length <= 40 ? 84 : title.length <= 70 ? 72 : 60;
  const photoH = rows.length ? 380 : 480;
  const ICON: Record<string, string> = { countly: "📊", infkey: "🤖", walvi: "✈️", gccguide: "🕌", ninetymins: "⚽" };
  // Headline number of the title ("400M", "$25.2B", "1.58 billion", "90%") as a big hook when there is no photo; never a year.
  const hero = photo ? "" : (title.match(/[$€£]?\d[\d.,]*\s?(?:[kmbt]\b|%|bn\b|billion|million)/i)?.[0] || "").trim();

  if (!art) return new Response("Not found", { status: 404 });
  const fonts = await ogFonts();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", color: "#fff", fontFamily: "Inter",
        backgroundImage: `linear-gradient(165deg, ${t.a} 0%, ${t.b} 100%)` }}>
        <div style={{ display: "flex", position: "relative", width: 1000, height: photoH }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} width={1000} height={photoH} style={{ objectFit: "cover" }} alt="" />
          ) : (
            <div style={{ display: "flex", width: 1000, height: photoH, alignItems: "center", justifyContent: "center",
              backgroundImage: `radial-gradient(circle at 70% 35%, ${t.accent}66, transparent 62%)` }}>
              <div style={{ display: "flex", position: "absolute", width: 520, height: 520, borderRadius: 260, border: `3px solid ${t.accent}33`, top: -120, right: -140 }} />
              <div style={{ display: "flex", position: "absolute", width: 300, height: 300, borderRadius: 150, background: `${t.accent}22`, bottom: -90, left: -60 }} />
              {hero ? (
                <div style={{ display: "flex", fontSize: hero.length <= 5 ? 230 : 160, fontWeight: 800, color: t.accent, letterSpacing: -6 }}>{hero}</div>
              ) : (
                <div style={{ display: "flex", width: 260, height: 260, borderRadius: 130, alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,.1)", border: `6px solid ${t.accent}`, fontSize: 140 }}>{ICON[site?.id ?? ""] ?? "★"}</div>
              )}
            </div>
          )}
          <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: 0, height: 220,
            backgroundImage: `linear-gradient(180deg, transparent, ${t.a})` }} />
          {tag ? (
            <div style={{ display: "flex", position: "absolute", top: 48, left: 56, background: t.accent, color: "#111", fontSize: 34,
              fontWeight: 800, padding: "10px 28px", borderRadius: 50, textTransform: "capitalize" }}>{tag.slice(0, 30)}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "8px 64px 0", flex: 1 }}>
          <div style={{ display: "flex", fontSize: fs, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>{title}</div>
          {rows.length ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 36, gap: 18 }}>
              {rows.map((r, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, marginBottom: 6 }}>
                    <span style={{ display: "flex", opacity: 0.92 }}>{`${i + 1}. ${r.label}`}</span>
                    <span style={{ display: "flex", fontWeight: 800, color: t.accent }}>{r.shown}</span>
                  </div>
                  <div style={{ display: "flex", height: 22, borderRadius: 11, background: "rgba(255,255,255,.12)" }}>
                    <div style={{ display: "flex", width: `${Math.max(6, Math.round((r.v / max) * 100))}%`, height: 22, borderRadius: 11, background: t.accent }} />
                  </div>
                </div>
              ))}
            </div>
          ) : sub ? (
            <div style={{ display: "flex", marginTop: 32, fontSize: 38, lineHeight: 1.35, opacity: 0.9 }}>{sub}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,.3)", padding: "40px 64px", marginTop: 24 }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>{site?.domain ?? ""}</div>
          <div style={{ display: "flex", fontSize: 32, color: t.accent, fontWeight: 800 }}>{rows.length ? "Full ranking →" : "Read more →"}</div>
        </div>
      </div>
    ),
    { width: 1000, height: 1500, emoji: "twemoji", fonts, headers: { "cache-control": "public, max-age=86400, s-maxage=604800", "x-og-fonts": String(fonts.length) } },
  );
}
