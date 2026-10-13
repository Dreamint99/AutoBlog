import { ImageResponse } from "next/og";
import { getArticle, getSite } from "@/lib/data";

// 1200×630 title card for an article, used as its feature/share image when there is no
// on-topic photo (generator/modules/image.py points image_url here). Built on request and
// cached at the edge, so it always matches the current title.
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
  const art = site ? await getArticle(site.id, slug.replace(/\.png$/, "")) : undefined;
  const t = THEME[site?.theme ?? ""] ?? { a: "#111827", b: "#1f2937", accent: "#fbbf24" };
  const title = (art?.title || site?.name || "").trim();
  const tag = art?.tags?.[0] || site?.niche?.split(/[,.]/)[0] || "";
  const fs = title.length <= 40 ? 76 : title.length <= 60 ? 64 : title.length <= 80 ? 56 : 48;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "70px 80px", color: "#fff", backgroundImage: `linear-gradient(135deg, ${t.a} 0%, ${t.b} 100%)` }}>
        <div style={{ display: "flex" }}>
          {tag ? <div style={{ display: "flex", background: t.accent, color: "#111", fontSize: 28, fontWeight: 700,
            padding: "8px 22px", borderRadius: 40, textTransform: "capitalize" }}>{tag.slice(0, 40)}</div> : null}
        </div>
        <div style={{ display: "flex", fontSize: fs, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 700, opacity: 0.92 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: t.accent, marginRight: 14 }} />
          {site?.domain ?? ""}
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "cache-control": "public, max-age=86400, s-maxage=604800" } },
  );
}
