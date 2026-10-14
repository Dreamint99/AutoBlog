import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/ogFonts";
import type { ReactNode } from "react";
import { getArticle, getSite } from "@/lib/data";

// 1000×1500 (2:3) Pinterest pin for an article — graphics only (owner's call: no photos).
// Pins that all look alike get ignored on Pinterest, so each article gets one of six layouts and
// one of three colour schemes, picked from what the article actually contains and a hash of its slug:
//   podium    — #1 big, #2-#5 below          (article has a ranking table)
//   bars      — horizontal bar chart          (ranking table)
//   tiles     — 2×2 grid of the top four      (ranking table)
//   bigstat   — huge headline number + 3 key facts   (number in the title + takeaways)
//   checklist — "N things to know" from key takeaways / FAQ questions
//   steps     — numbered sections from the article's H2s (guides)
// /pins.xml lists these so Pinterest auto-publishes every new article.
export const dynamic = "force-dynamic";

type Pal = { bg: string; bg2: string; fg: string; sub: string; accent: string; chip: string; chipFg: string; track: string; card: string };
const BASE: Record<string, { a: string; b: string; accent: string; light: string; ink: string }> = {
  "infkey-noir": { a: "#1e1b4b", b: "#7c3aed", accent: "#c4b5fd", light: "#f5f3ff", ink: "#4c1d95" },
  "walvi-atlas": { a: "#0b1f3a", b: "#134e4a", accent: "#2dd4bf", light: "#ecfeff", ink: "#0f766e" },
  "countly-data": { a: "#1e1b4b", b: "#4f46e5", accent: "#a5b4fc", light: "#eef2ff", ink: "#3730a3" },
  "ninetymins-pitch": { a: "#052e16", b: "#15803d", accent: "#bef264", light: "#f7fee7", ink: "#166534" },
  "gcc-night": { a: "#0c1222", b: "#7a1e3a", accent: "#fbbf24", light: "#fffbeb", ink: "#9a3412" },
};
function palettes(theme: string): Pal[] {
  const t = BASE[theme] ?? { a: "#111827", b: "#1f2937", accent: "#fbbf24", light: "#f9fafb", ink: "#111827" };
  return [
    // dark gradient
    { bg: t.a, bg2: t.b, fg: "#ffffff", sub: "rgba(255,255,255,.82)", accent: t.accent, chip: t.accent, chipFg: "#111111", track: "rgba(255,255,255,.14)", card: "rgba(255,255,255,.08)" },
    // light paper
    { bg: t.light, bg2: "#ffffff", fg: "#111827", sub: "#4b5563", accent: t.ink, chip: t.ink, chipFg: "#ffffff", track: "rgba(17,24,39,.08)", card: "#ffffff" },
    // bold accent
    { bg: t.ink, bg2: t.a, fg: "#ffffff", sub: "rgba(255,255,255,.85)", accent: "#fde047", chip: "#fde047", chipFg: "#111111", track: "rgba(255,255,255,.18)", card: "rgba(0,0,0,.18)" },
  ];
}

const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#?\w+;/g, " ").replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
const MULT: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

type Row = { label: string; shown: string; v: number };
/** Top rows of the article's first ranking table: a name paired with its main number. */
function topRows(html: string): Row[] {
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!table) return [];
  const rows: Row[] = [];
  for (const tr of table.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    if (tr.includes("<th")) continue;
    const cells = (tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []).map(text);
    const label = cells.find((c) => /[A-Za-zঀ-৿]{2}/.test(c) && !/^\$?[\d.,]+\s*[kmbt%]?$/i.test(c));
    // Skip change columns ("+1.5", "-3%") and the bare rank column; prefer currency/units/thousands.
    const nums = cells.filter((c) => c !== label && /\d/.test(c) && !/^[+\-−]/.test(c.trim()) &&
      /^[^A-Za-z]*[\d.,]+\s*(k|m|b|t|bn|million|billion|%)?\b/i.test(c));
    const numCell = nums.find((c) => /[$€£]|\d\s*(k|m|b|t|bn|million|billion)\b|\d,\d{3}/i.test(c)) ||
      nums.find((c) => !/^\d{1,3}$/.test(c.trim()));
    if (!label || !numCell) continue;
    const m = numCell.replace(/,/g, "").match(/([\d.]+)\s*(k|m|b|t|bn|million|billion)?/i);
    if (!m) continue;
    const unit = (m[2] || "").toLowerCase().replace("million", "m").replace(/^(billion|bn)$/, "b");
    rows.push({ label: label.slice(0, 30), shown: numCell.slice(0, 13), v: parseFloat(m[1]) * (MULT[unit] || 1) });
    if (rows.length === 5) break;
  }
  return rows.length >= 3 && rows.some((r) => r.v > 0) ? rows : [];
}
const listItems = (html: string, cls: string) =>
  ((html.match(new RegExp(`<div class="${cls}"[\\s\\S]*?</ul>`, "i"))?.[0] || "").match(/<li[^>]*>[\s\S]*?<\/li>/gi) || []).map(text);
const h2s = (html: string) =>
  (html.match(/<h2[^>]*>[\s\S]*?<\/h2>/gi) || []).map(text)
    .filter((h) => h.length > 6 && h.length < 70 && !/key takeaways|faq|frequently|conclusion|sources|references/i.test(h));
const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");

export async function GET(_req: Request, { params }: { params: Promise<{ site: string; slug: string }> }) {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const art = site ? await getArticle(site.id, slug) : undefined;
  if (!art || !site) return new Response("Not found", { status: 404 });

  const body = art.body_html || "";
  const title = art.title.trim();
  const tag = art.tags?.[0] || site.niche?.split(/[,.]/)[0] || "";
  const rows = topRows(body);
  const facts = listItems(body, "key-takeaways").filter((f) => f.length > 12).map((f) => clip(f, 92));
  const questions = (art.faq || []).map((f) => clip(text(String(f.q || "")), 70)).filter(Boolean);
  const sections = h2s(body).map((h) => clip(h, 58));
  const subline = clip(text(art.meta_description || art.excerpt || ""), 150);
  const hero = (title.match(/[$€£]?\d[\d.,]*\s?(?:[kmbt]\b|%|bn\b|billion|million|lakh|crore)/i)?.[0] || "").trim();

  const h = hash(slug);
  const pal = palettes(site.theme)[h % 3];
  const options: string[] = [];
  if (rows.length >= 4) options.push("podium", "bars", "tiles");
  else if (rows.length >= 3) options.push("podium", "bars");
  if (hero && facts.length >= 3) options.push("bigstat");
  if (facts.length >= 4 || questions.length >= 4) options.push("checklist");
  if (sections.length >= 4) options.push("steps");
  if (!options.length) options.push(hero ? "bigstat" : "checklist");
  const layout = options[Math.floor(h / 3) % options.length];

  const fonts = await ogFonts();
  const fs = title.length <= 40 ? 78 : title.length <= 70 ? 66 : 56;
  const max = Math.max(...rows.map((r) => r.v), 1);

  const Chip = () =>
    tag ? (
      <div style={{ display: "flex", alignSelf: "flex-start", background: pal.chip, color: pal.chipFg, fontSize: 30, fontWeight: 800,
        padding: "10px 26px", borderRadius: 50, textTransform: "capitalize" }}>{clip(tag, 28)}</div>
    ) : <div style={{ display: "flex" }} />;
  const Title = ({ size = fs }: { size?: number }) => (
    <div style={{ display: "flex", fontSize: size, fontWeight: 800, lineHeight: 1.06, letterSpacing: -1.5, color: pal.fg, marginTop: 28 }}>{title}</div>
  );
  const Footer = ({ cta }: { cta: string }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", padding: "34px 64px",
      background: pal.card, borderTop: `2px solid ${pal.track}` }}>
      <div style={{ display: "flex", alignItems: "center", fontSize: 38, fontWeight: 800, color: pal.fg }}>
        <div style={{ display: "flex", width: 18, height: 18, borderRadius: 9, background: pal.accent, marginRight: 14 }} />
        {site.domain}
      </div>
      <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: pal.accent }}>{cta}</div>
    </div>
  );

  let content: ReactNode;
  const onAccent = pal.fg === "#ffffff" ? "#111111" : "#ffffff"; // text colour on an accent-filled block
  let cta = "Read the guide →";
  if (layout === "podium") {
    const [first, ...rest] = rows;
    cta = "See the full ranking →";
    content = (
      <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", background: pal.accent, color: onAccent,
          borderRadius: 32, padding: "34px 40px" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, opacity: 0.75 }}>#1</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 54, fontWeight: 800, maxWidth: 520 }}>{first.label}</div>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>{first.shown}</div>
          </div>
        </div>
        {rest.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "26px 36px",
            background: pal.card, borderRadius: 24, color: pal.fg }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 500 }}>
              <div style={{ display: "flex", width: 64, fontWeight: 800, color: pal.accent }}>{`#${i + 2}`}</div>{r.label}
            </div>
            <div style={{ display: "flex", fontSize: 42, fontWeight: 800 }}>{r.shown}</div>
          </div>
        ))}
      </div>
    );
  } else if (layout === "bars") {
    cta = "See the full ranking →";
    content = (
      <div style={{ display: "flex", flexDirection: "column", marginTop: 44 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", marginBottom: 34 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 40, marginBottom: 10, color: pal.fg }}>
              <span style={{ display: "flex", fontWeight: 500 }}>{`${i + 1}. ${r.label}`}</span>
              <span style={{ display: "flex", fontWeight: 800, color: pal.accent }}>{r.shown}</span>
            </div>
            <div style={{ display: "flex", height: 40, borderRadius: 20, background: pal.track }}>
              <div style={{ display: "flex", width: `${Math.max(7, Math.round((r.v / max) * 100))}%`, height: 40, borderRadius: 20, background: pal.accent }} />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (layout === "tiles") {
    cta = "See all the numbers →";
    content = (
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", marginTop: 44 }}>
        {rows.slice(0, 4).map((r, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", width: 424, height: 330, marginBottom: 24, padding: "30px 32px",
            borderRadius: 30, background: i === 0 ? pal.accent : pal.card, color: i === 0 ? onAccent : pal.fg }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 800, opacity: 0.7 }}>{`#${i + 1}`}</div>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 800, marginTop: "auto", letterSpacing: -1 }}>{r.shown}</div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 500, marginTop: 6 }}>{r.label}</div>
          </div>
        ))}
      </div>
    );
  } else if (layout === "bigstat") {
    cta = "Get the full picture →";
    content = (
      <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
        {facts.slice(0, 3).map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", marginTop: 30, fontSize: 40, lineHeight: 1.3, color: pal.fg }}>
            <div style={{ display: "flex", width: 46, height: 46, borderRadius: 23, background: pal.accent, color: onAccent,
              alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, marginRight: 22, flexShrink: 0 }}>✓</div>
            <div style={{ display: "flex", flex: 1 }}>{f}</div>
          </div>
        ))}
      </div>
    );
  } else if (layout === "steps") {
    cta = /\?$/.test(sections[0] || "") ? "Get the answers →" : "Read the full guide →";
    content = (
      <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
        {sections.slice(0, 5).map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 22, padding: "26px 32px", borderRadius: 28, background: pal.card, color: pal.fg }}>
            <div style={{ display: "flex", width: 70, height: 70, borderRadius: 35, border: `4px solid ${pal.accent}`, color: pal.accent,
              alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 800, marginRight: 26, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ display: "flex", flex: 1, fontSize: 40, fontWeight: 500, lineHeight: 1.2 }}>{s}</div>
          </div>
        ))}
      </div>
    );
  } else {
    // checklist: key takeaways, else the FAQ questions people actually ask
    const items = (facts.length >= 4 ? facts : questions).slice(0, 5);
    cta = facts.length >= 4 ? "Save this checklist →" : "Get the answers →";
    content = (
      <div style={{ display: "flex", flexDirection: "column", marginTop: 34, padding: "34px 36px", borderRadius: 32, background: pal.card }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: pal.accent, marginBottom: 14, textTransform: "uppercase", letterSpacing: 2 }}>
          {facts.length >= 4 ? `${items.length} things to know` : "Questions answered"}
        </div>
        {items.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", marginTop: 22, fontSize: 38, lineHeight: 1.3, color: pal.fg }}>
            <div style={{ display: "flex", width: 34, height: 34, borderRadius: 8, border: `4px solid ${pal.accent}`, marginRight: 20, marginTop: 4, flexShrink: 0 }} />
            <div style={{ display: "flex", flex: 1 }}>{f}</div>
          </div>
        ))}
      </div>
    );
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", fontFamily: "Inter", position: "relative",
        backgroundImage: `linear-gradient(165deg, ${pal.bg} 0%, ${pal.bg2} 100%)` }}>
        {/* soft decoration, kept to the corners */}
        <div style={{ display: "flex", position: "absolute", width: 560, height: 560, borderRadius: 280, border: `3px solid ${pal.track}`, top: -220, right: -200 }} />
        <div style={{ display: "flex", position: "absolute", width: 340, height: 340, borderRadius: 170, background: pal.track, bottom: 120, left: -170 }} />
        <div style={{ display: "flex", flexDirection: "column", padding: "64px 64px 0", flex: 1 }}>
          <Chip />
          {layout === "bigstat" && hero ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: hero.length <= 5 ? 250 : hero.length <= 9 ? 190 : 140, fontWeight: 800, color: pal.accent,
                letterSpacing: -8, lineHeight: 1, marginTop: 36 }}>{hero}</div>
              <Title size={Math.min(fs, 60)} />
            </div>
          ) : (
            <Title />
          )}
          {layout !== "bigstat" && subline ? (
            <div style={{ display: "flex", fontSize: 34, lineHeight: 1.35, color: pal.sub, marginTop: 22 }}>{subline}</div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingBottom: 36 }}>{content}</div>
        </div>
        <Footer cta={cta} />
      </div>
    ),
    { width: 1000, height: 1500, emoji: "twemoji", fonts,
      headers: { "cache-control": "public, max-age=86400, s-maxage=86400", "x-og-fonts": String(fonts.length), "x-pin-layout": `${layout}/${h % 3}` } },
  );
}
