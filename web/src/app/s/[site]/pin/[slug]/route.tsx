import { ImageResponse } from "next/og";
import { getArticle, getSite } from "@/lib/data";

// 1000×1500 (2:3) Pinterest pin for an article — the tall format Pinterest favours.
// /pins.xml lists these so a Pinterest business account can auto-publish every new article.
export const dynamic = "force-dynamic";

const THEME: Record<string, { a: string; b: string; accent: string }> = {
  "infkey-noir": { a: "#1e1b4b", b: "#7c3aed", accent: "#c4b5fd" },
  "walvi-atlas": { a: "#0b1f3a", b: "#134e4a", accent: "#2dd4bf" },
  "countly-data": { a: "#1e1b4b", b: "#4f46e5", accent: "#a5b4fc" },
  "ninetymins-pitch": { a: "#052e16", b: "#15803d", accent: "#bef264" },
  "gcc-night": { a: "#0c1222", b: "#7a1e3a", accent: "#fbbf24" },
};

export async function GET(_req: Request, { params }: { params: Promise<{ site: string; slug: string }> }) {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const art = site ? await getArticle(site.id, slug) : undefined;
  const t = THEME[site?.theme ?? ""] ?? { a: "#111827", b: "#1f2937", accent: "#fbbf24" };
  const title = (art?.title || site?.name || "").trim();
  const sub = (art?.meta_description || art?.excerpt || "").trim().slice(0, 150);
  const photo = art?.image_url && /^https:\/\//.test(art.image_url) && !art.image_url.includes("/card/") ? art.image_url : "";
  const fs = title.length <= 40 ? 88 : title.length <= 70 ? 74 : 62;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", color: "#fff",
        backgroundImage: `linear-gradient(160deg, ${t.a} 0%, ${t.b} 100%)` }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} width={1000} height={620} style={{ objectFit: "cover" }} alt="" />
        ) : (
          <div style={{ display: "flex", height: 180 }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "56px 64px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: fs, fontWeight: 800, lineHeight: 1.12 }}>{title}</div>
            {sub ? <div style={{ display: "flex", marginTop: 28, fontSize: 34, lineHeight: 1.35, opacity: 0.88 }}>{sub}</div> : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 36, fontWeight: 700 }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: t.accent, marginRight: 16 }} />
            {site?.domain ?? ""}
          </div>
        </div>
      </div>
    ),
    { width: 1000, height: 1500, headers: { "cache-control": "public, max-age=86400, s-maxage=604800" } },
  );
}
