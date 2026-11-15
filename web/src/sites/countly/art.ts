// Countly data-art: a small, deterministic SVG "chart" drawn from an article's own title —
// its headline figure (e.g. "$65.2B", "410M", "79%"), its shape (Top-N ranking, share,
// count, trend) and its desk colour. Replaces the bold text title cards on countly only.
// Pure string building: no I/O, ~2–4 KB, safe for the 10 ms Workers CPU budget.
//
// Two looks:
//   light (default) — the in-page card art: warm paper, one desk colour, ink figure.
//   dark            — the og:image background (the /card/ PNG route draws text on top).
// Chart shape is varied per title (hash) so a grid of cards never repeats the same picture.

type Kind = "ladder" | "rankcols" | "dots" | "ring" | "waffle" | "line" | "columns" | "bignum";
export interface Figure { text: string; value: number; pct?: number }

/* Desk colours. [dark-bg tone, light-bg tone] — the light tones pass 3:1 on paper. */
const ACCENTS: Array<[RegExp, string, string]> = [
  [/richest|billionaire|net worth|wealth|fortune|salary|gold|crypto|bitcoin/i, "#f5c451", "#c27803"],
  [/\b(ai|chatgpt|openai|gpt|llm|gemini|claude|nvidia|gpu)\b/i, "#a78bfa", "#6d4fd8"],
  [/social|facebook|instagram|tiktok|youtube|twitter|whatsapp|snapchat|telegram|roblox|users/i, "#f472b6", "#d0367f"],
  [/internet|website|online|broadband|apps?\b|digital|smartphone|mobile|speed/i, "#38bdf8", "#2563eb"],
  [/countr|population|gdp|tourist|cities|nation|world/i, "#2dd4bf", "#0e8a7e"],
];
const GREEN: [string, string] = ["#34d399", "#12a25f"];

export function accentOf(title: string): string {
  for (const [re, c] of ACCENTS) if (re.test(title)) return c;
  return GREEN[0];
}
function accentLight(title: string): string {
  for (const [re, , c] of ACCENTS) if (re.test(title)) return c;
  return GREEN[1];
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MULT: Record<string, number> = { t: 1e12, trillion: 1e12, b: 1e9, billion: 1e9, m: 1e6, million: 1e6, k: 1e3, thousand: 1e3 };
const SHORT: Record<string, string> = { trillion: "T", billion: "B", million: "M", thousand: "K" };

/** The headline figure of a title, e.g. "$65.2B", "410M", "35%". Bare years are skipped. */
export function figureOf(title: string): Figure | null {
  const re = /([$€£₹])?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(?:(trillion|billion|million|thousand|[TBMK])(?![a-z]))?\s?(%)?/gi;
  let best: (Figure & { score: number }) | null = null;
  for (const m of title.matchAll(re)) {
    const [, cur, num, sfx, pct] = m;
    const n = Number(num.replace(/,/g, ""));
    if (!isFinite(n)) continue;
    if (!cur && !sfx && !pct && /^(19|20)\d\d$/.test(num)) continue; // a year
    if (!cur && !sfx && /top\s*$/i.test(title.slice(0, m.index))) continue; // "Top 10" is the list size, not the figure
    const s = (sfx || "").toLowerCase();
    const value = n * (MULT[s] || 1);
    const score = (cur ? 3 : 0) + (sfx ? 3 : 0) + (pct ? 4 : 0) + (num.includes(",") ? 2 : 0) + (n >= 10 ? 1 : 0);
    if (!best || score > best.score) {
      const suffix = sfx ? (SHORT[s] || sfx.toUpperCase()) : "";
      best = { text: `${cur || ""}${num}${suffix}${pct ? "%" : ""}`, value, pct: pct ? Math.min(100, n) : undefined, score };
    }
  }
  if (!best || best.score < 1) return null;
  return { text: best.text, value: best.value, pct: best.pct };
}

function kindOf(title: string, fig: Figure | null, seed: number): Kind {
  const pick = <T,>(xs: T[]) => xs[(seed >>> 3) % xs.length];
  if (/\btop\s*\d+|ranked|ranking|largest|biggest|richest|most\b|best\b|leading|highest|lowest/i.test(title))
    return pick<Kind>(["ladder", "rankcols", "dots", "ladder", "rankcols"]);
  if (fig?.pct !== undefined) return pick<Kind>(["ring", "ring", "waffle"]);
  if (/users|population|people|subscribers|visitors|tourist|students|employees|billionaires|count|members|downloads/i.test(title))
    return pick<Kind>(["waffle", "bignum", "columns"]);
  if (/growth|rise|vs\b|trend|forecast|since|history|shift|gain|loss|drop|decline|slower|faster|jump/i.test(title)) return pick<Kind>(["line", "line", "columns"]);
  return pick<Kind>(["columns", "line", "bignum"]);
}

const f1 = (n: number) => Math.round(n * 10) / 10;

/**
 * SVG markup (1200×630 viewBox). `label: false` leaves out the figure text (the OG renderer
 * draws it itself because SVG text inside an <img> has no fonts there).
 * `theme: "dark"` is the og:image look; the default is the light in-page look.
 */
export function artSvg(title: string, opts: { label?: boolean; w?: number; h?: number; theme?: "light" | "dark" } = {}): string {
  const { label = true, w = 600, h = 315, theme = "light" } = opts;
  const dark = theme === "dark";
  const seed = hash(title);
  const r = rng(seed);
  const fig = figureOf(title);
  const kind = kindOf(title, fig, seed);
  const c = dark ? accentOf(title) : accentLight(title);
  const ink = dark ? "#ffffff" : "#101714";
  const track = dark ? "#fff" : "#101714";
  const trackOp = dark ? ".05" : ".06";
  const id = "c" + (seed % 1e6).toString(36);
  let body = "";

  const shown = fig?.text ?? (/top\s*\d+/i.test(title) ? "Top " + title.match(/top\s*(\d+)/i)![1] : "");
  const hasLabel = label && !!shown;
  // Side-by-side kinds put the figure on the left, chart on the right.
  const side = kind === "ring" || kind === "waffle" || kind === "dots";
  const X0 = 170, X1 = 1030;
  const Y0 = hasLabel && !side ? 260 : 150, Y1 = 500;
  const CX0 = hasLabel && side ? 640 : X0; // chart left edge for side kinds

  if (kind === "ladder") {
    const n = Math.max(4, Math.min(7, Number(title.match(/top\s*(\d+)/i)?.[1]) || 6));
    const gap = 12, bh = (Y1 - Y0 - gap * (n - 1)) / n;
    let v = 1;
    for (let i = 0; i < n; i++) {
      const y = Y0 + i * (bh + gap);
      const wv = (X1 - X0) * v;
      body += `<rect x="${X0}" y="${f1(y)}" width="${X1 - X0}" height="${f1(bh)}" rx="${f1(bh / 2)}" fill="${track}" fill-opacity="${trackOp}"/>`;
      body += `<rect x="${X0}" y="${f1(y)}" width="${f1(wv)}" height="${f1(bh)}" rx="${f1(bh / 2)}" fill="${c}" fill-opacity="${i === 0 ? 1 : f1(0.55 - i * 0.05)}"/>`;
      v *= 0.7 + r() * 0.2;
    }
  } else if (kind === "rankcols") {
    // Ranked columns, tallest first, with a baseline.
    const n = 7, g = 26, bw = (X1 - X0 - g * (n - 1)) / n;
    let v = 1;
    for (let i = 0; i < n; i++) {
      const bh = (Y1 - Y0) * v;
      body += `<rect x="${f1(X0 + i * (bw + g))}" y="${f1(Y1 - bh)}" width="${f1(bw)}" height="${f1(bh)}" rx="10" fill="${c}" fill-opacity="${i === 0 ? 1 : f1(0.5 - i * 0.04)}"/>`;
      v *= 0.68 + r() * 0.22;
    }
    body += `<rect x="${X0 - 10}" y="${Y1 + 6}" width="${X1 - X0 + 20}" height="4" rx="2" fill="${ink}" fill-opacity=".18"/>`;
  } else if (kind === "dots") {
    // Dot plot: one row per rank, a dot on a thin rule.
    const n = 6, x0 = CX0, x1 = X1;
    const step = (Y1 - 150) / (n - 1);
    let v = 0.95;
    for (let i = 0; i < n; i++) {
      const y = 150 + i * step;
      const x = x0 + (x1 - x0) * v;
      body += `<line x1="${x0}" x2="${x1}" y1="${f1(y)}" y2="${f1(y)}" stroke="${track}" stroke-opacity="${dark ? ".1" : ".12"}" stroke-width="3" stroke-linecap="round"/>`;
      body += `<line x1="${x0}" x2="${f1(x)}" y1="${f1(y)}" y2="${f1(y)}" stroke="${c}" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>`;
      body += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${i === 0 ? 22 : 17}" fill="${c}" fill-opacity="${i === 0 ? 1 : 0.7}"/>`;
      v *= 0.74 + r() * 0.16;
    }
  } else if (kind === "ring") {
    const p = (fig?.pct ?? 40 + r() * 50) / 100;
    const cx = hasLabel ? 830 : 600, cy = 325, R = 150, L = 2 * Math.PI * R;
    body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${track}" stroke-opacity="${dark ? ".08" : ".07"}" stroke-width="56"/>`;
    body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${c}" stroke-width="56" stroke-dasharray="${f1(L * p)} ${f1(L)}" transform="rotate(-90 ${cx} ${cy})"/>`;
  } else if (kind === "waffle") {
    const cols = 10, rows = 7, s = 30, g = 10;
    const gw = cols * (s + g) - g, gh = rows * (s + g) - g;
    const gx = hasLabel ? X1 - gw : 600 - gw / 2;
    const gy = 325 - gh / 2;
    const filled = fig?.pct !== undefined ? Math.round((cols * rows * fig.pct) / 100) : Math.round(cols * rows * (0.3 + r() * 0.5));
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const on = row * cols + col >= cols * rows - filled; // fills from the bottom row up
      body += `<circle cx="${gx + col * (s + g) + s / 2}" cy="${gy + row * (s + g) + s / 2}" r="${s / 2}" fill="${on ? c : track}" fill-opacity="${on ? 0.9 : dark ? 0.07 : 0.08}"/>`;
    }
  } else if (kind === "line" || kind === "bignum") {
    const down = /drop|decline|loss|slower|fall|lower|shrink|cut/i.test(title);
    const n = kind === "bignum" ? 12 : 9;
    const ly0 = kind === "bignum" ? (hasLabel ? 380 : 220) : Y0;
    const pts: Array<[number, number]> = [];
    let v = down ? 0.85 : 0.2;
    for (let i = 0; i < n; i++) {
      pts.push([X0 + ((X1 - X0) * i) / (n - 1), Y1 - (Y1 - ly0) * Math.max(0.05, Math.min(0.95, v))]);
      v += (down ? -1 : 1) * (0.04 + r() * 0.1) + (r() - 0.5) * 0.12;
    }
    const d = pts.map((p, i) => `${i ? "L" : "M"}${f1(p[0])} ${f1(p[1])}`).join("");
    if (kind === "line")
      for (let i = 0; i < 4; i++) body += `<line x1="${X0}" x2="${X1}" y1="${f1(Y0 + ((Y1 - Y0) * i) / 3)}" y2="${f1(Y0 + ((Y1 - Y0) * i) / 3)}" stroke="${track}" stroke-opacity="${dark ? ".07" : ".08"}" stroke-width="2"/>`;
    body += `<path d="${d}L${X1} ${Y1}L${X0} ${Y1}Z" fill="url(#${id}a)"/>`;
    body += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${kind === "bignum" ? 6 : 8}" stroke-linejoin="round" stroke-linecap="round"/>`;
    const [lx, ly] = pts[n - 1];
    body += `<circle cx="${f1(lx)}" cy="${f1(ly)}" r="24" fill="${c}" fill-opacity=".18"/><circle cx="${f1(lx)}" cy="${f1(ly)}" r="11" fill="${c}"/>`;
  } else {
    const n = 10, g = 18, bw = (X1 - X0 - g * (n - 1)) / n;
    let v = 0.3 + r() * 0.2;
    for (let i = 0; i < n; i++) {
      const bh = (Y1 - Y0) * Math.min(1, v);
      body += `<rect x="${f1(X0 + i * (bw + g))}" y="${f1(Y1 - bh)}" width="${f1(bw)}" height="${f1(bh)}" rx="8" fill="${c}" fill-opacity="${i === n - 1 ? 1 : f1(0.22 + i * 0.05)}"/>`;
      v += 0.03 + r() * 0.09;
    }
  }

  const big = kind === "bignum";
  // Shrink long figures ("$1,406,585,000") so they never run into the chart.
  const room = side ? 440 : 860;
  const fs = Math.round(Math.min(side ? 104 : big ? 150 : 76, room / (Math.max(3, shown.length) * 0.6)));
  const ty = side ? 350 : big ? 300 : 200;
  const text = hasLabel
    ? `<text x="${X0}" y="${ty}" font-family="Inter Tight,Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="${fs}" letter-spacing="-3" fill="${ink}">${shown.replace(/[<>&]/g, "")}</text>` +
      `<rect x="${X0 + 2}" y="${ty + (side ? 34 : big ? 30 : 24)}" width="64" height="8" rx="4" fill="${c}"/>`
    : "";

  const bg = dark
    ? `<defs><linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#0f1d1a"/></linearGradient>` +
      `<linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>` +
      `<radialGradient id="${id}g" cx=".85" cy=".1" r=".7"><stop offset="0" stop-color="${c}" stop-opacity=".22"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="1200" height="630" fill="url(#${id}b)"/><rect width="1200" height="630" fill="url(#${id}g)"/>`
    : `<defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".22"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>` +
      `<pattern id="${id}d" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#101714" fill-opacity=".07"/></pattern></defs>` +
      `<rect width="1200" height="630" fill="#f6f5f0"/><rect width="1200" height="630" fill="${c}" fill-opacity=".06"/><rect width="1200" height="630" fill="url(#${id}d)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="${w}" height="${h}">` + bg + body + text + `</svg>`;
}

export const artUri = (title: string, opts?: { label?: boolean; w?: number; h?: number; theme?: "light" | "dark" }) =>
  "data:image/svg+xml," + encodeURIComponent(artSvg(title, opts));
