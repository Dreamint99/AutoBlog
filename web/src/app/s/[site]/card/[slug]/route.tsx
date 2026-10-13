import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/ogFonts";
import { getArticle, getSite } from "@/lib/data";

// 1200×630 title card for an article, used as its feature/share image when there is no
// on-topic photo (generator/modules/site_images.py points image_url here). Built on request and
// cached at the edge, so it always matches the current title.
//
// Site layouts show it in boxes from 4:3 to 21:9 with object-fit: cover, which crops up to
// ~180px from each side or ~60px from top/bottom. All text therefore sits in a centred
// ~800×480 safe zone; the edges only carry decoration.
export const dynamic = "force-dynamic";

const THEME: Record<string, { a: string; b: string; accent: string }> = {
  "infkey-noir": { a: "#1e1b4b", b: "#7c3aed", accent: "#c4b5fd" },
  "walvi-atlas": { a: "#0b1f3a", b: "#134e4a", accent: "#2dd4bf" },
  "countly-data": { a: "#1e1b4b", b: "#4f46e5", accent: "#a5b4fc" },
  "ninetymins-pitch": { a: "#052e16", b: "#15803d", accent: "#bef264" },
  "gcc-night": { a: "#0c1222", b: "#7a1e3a", accent: "#fbbf24" },
};

export async function GET(req: Request, { params }: { params: Promise<{ site: string; slug: string }> }) {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const art = site ? await getArticle(site.id, slug.replace(/\.png$/, "")) : undefined;
  const t = THEME[site?.theme ?? ""] ?? { a: "#111827", b: "#1f2937", accent: "#fbbf24" };
  const title = (art?.title || site?.name || "").trim();
  const tag = art?.tags?.[0] || site?.niche?.split(/[,.]/)[0] || "";
  const fs = title.length <= 36 ? 64 : title.length <= 56 ? 54 : title.length <= 76 ? 46 : 40;
  if (!art) return new Response("Not found", { status: 404 });
  // ?w=600 renders the same card at half size for list thumbnails (~4x fewer bytes than 1200px)
  const k = new URL(req.url).searchParams.get("w") === "600" ? 0.5 : 1;
  const z = (n: number) => Math.round(n * k);
  const fonts = await ogFonts();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter",
        color: "#fff", backgroundImage: `linear-gradient(135deg, ${t.a} 0%, ${t.b} 100%)`, position: "relative" }}>
        {/* edge decoration — safe to crop */}
        <div style={{ display: "flex", position: "absolute", width: z(420), height: z(420), borderRadius: z(210), border: `${z(3)}px solid ${t.accent}40`, top: z(-160), left: z(-120) }} />
        <div style={{ display: "flex", position: "absolute", width: z(360), height: z(360), borderRadius: z(180), background: `${t.accent}1f`, bottom: z(-170), right: z(-90) }} />
        {/* safe zone */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: z(800), textAlign: "center" }}>
          {tag ? (
            <div style={{ display: "flex", background: t.accent, color: "#111", fontSize: z(24), fontWeight: 800, padding: `${z(7)}px ${z(20)}px`,
              borderRadius: z(40), textTransform: "capitalize", marginBottom: z(26) }}>{tag.slice(0, 36)}</div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "center", textAlign: "center", fontSize: z(fs), fontWeight: 800, lineHeight: 1.12, letterSpacing: -k }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: z(28), fontSize: z(24), fontWeight: 800, opacity: 0.9 }}>
            <div style={{ display: "flex", width: z(12), height: z(12), borderRadius: z(6), background: t.accent, marginRight: z(10) }} />
            {site?.domain ?? ""}
          </div>
        </div>
      </div>
    ),
    { width: z(1200), height: z(630), fonts, headers: { "cache-control": "public, max-age=86400, s-maxage=86400", "x-og-fonts": String(fonts.length) } },
  );
}
