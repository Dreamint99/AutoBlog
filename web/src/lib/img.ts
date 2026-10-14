import sitesJson from "@/data/sites.json";

// Client-safe (no server-only data layer): the active site comes from SITE_ID + the static config.
type SiteLite = { id: string; theme: string; domain: string };
const SITES: SiteLite[] = (Array.isArray(sitesJson) ? sitesJson : (sitesJson as { sites: SiteLite[] }).sites) as SiteLite[];
const activeSite = (): SiteLite => SITES.find((s) => s.id === process.env.SITE_ID) ?? SITES[0];

// Faster images for article cards (mobile Lighthouse: the card grid was the LCP element and each
// /card/ PNG is rendered on demand by the Worker, 200+ KB and ~1 s before it can paint).
//   /card/<slug> + title → the same title card as an inline SVG data URI: ~1 KB, no request at all
//   /card/<slug> alone   → the PNG rendered at 600x315 (&w=600)
//   upload.wikimedia.org → the 640px rendition instead of 1280px
//   ESPN team logos      → ESPN's own resizer at the displayed size
// The PNG card URL stays the article's og:image for social previews.
const THEME: Record<string, { a: string; b: string; accent: string }> = {
  "infkey-noir": { a: "#1e1b4b", b: "#7c3aed", accent: "#c4b5fd" },
  "walvi-atlas": { a: "#0b1f3a", b: "#134e4a", accent: "#2dd4bf" },
  "countly-data": { a: "#1e1b4b", b: "#4f46e5", accent: "#a5b4fc" },
  "ninetymins-pitch": { a: "#052e16", b: "#15803d", accent: "#bef264" },
  "gcc-night": { a: "#0c1222", b: "#7a1e3a", accent: "#fbbf24" },
};

const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** Greedy word wrap to at most `maxLines` lines of ~`width` characters. */
function wrap(title: string, width: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of title.split(/\s+/)) {
    if ((cur + " " + w).trim().length > width && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else cur = (cur + " " + w).trim();
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  else if (lines.length === maxLines && cur && !lines[maxLines - 1].endsWith(cur)) lines[maxLines - 1] += "…";
  return lines;
}

export function cardSvg(title: string): string {
  const t = THEME[activeSite().theme] ?? { a: "#111827", b: "#1f2937", accent: "#fbbf24" };
  const n = title.length;
  const [fs, width] = n <= 36 ? [70, 20] : n <= 60 ? [60, 24] : [52, 28];
  const lines = wrap(title, width, 4);
  const lh = fs * 1.15;
  const y0 = 315 - ((lines.length - 1) * lh) / 2 - 20;
  const tx = lines.map((l, i) => `<text x="600" y="${Math.round(y0 + i * lh)}">${xml(l)}</text>`).join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="600" height="315">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.a}"/><stop offset="1" stop-color="${t.b}"/></linearGradient></defs>` +
    `<rect width="1200" height="630" fill="url(#g)"/>` +
    `<circle cx="90" cy="50" r="210" fill="none" stroke="${t.accent}" stroke-opacity=".25" stroke-width="3"/>` +
    `<circle cx="1110" cy="640" r="180" fill="${t.accent}" fill-opacity=".12"/>` +
    `<g fill="#fff" font-family="Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="${fs}" text-anchor="middle">${tx}</g>` +
    `<g font-family="Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="24" text-anchor="middle" fill="#fff" fill-opacity=".9">` +
    `<circle cx="${600 - 8 - activeSite().domain.length * 7}" cy="${Math.round(y0 + lines.length * lh + 22)}" r="6" fill="${t.accent}"/>` +
    `<text x="600" y="${Math.round(y0 + lines.length * lh + 30)}">${xml(activeSite().domain)}</text></g></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

export function thumb(url: string | null | undefined, title?: string, w: 600 | 320 = 600): string {
  if (!url) return "";
  if (/\/card\/[^/?#]+/.test(url)) {
    if (title) return cardSvg(title);
    if (!/[?&]w=/.test(url)) return url + (url.includes("?") ? "&" : "?") + "w=600";
    return url;
  }
  const wm = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/.+\/)(\d+)px-([^/]+)$/);
  if (wm && Number(wm[2]) > w) return `${wm[1]}${w === 600 ? 640 : 320}px-${wm[3]}`;
  const espn = url.match(/^https:\/\/a\.espncdn\.com(\/i\/teamlogos\/.+\.png)$/);
  if (espn) return `https://a.espncdn.com/combiner/i?img=${espn[1]}&w=96&h=96`;
  return url;
}

/** Hero/lead image: a title card becomes the inline SVG; real photos stay full size. */
export function heroSrc(url: string | null | undefined, title: string): string {
  if (!url) return "";
  return /\/card\/[^/?#]+/.test(url) ? cardSvg(title) : url;
}
