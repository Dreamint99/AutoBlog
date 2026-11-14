// Countly data-art: a small, deterministic SVG "chart" drawn from an article's own title —
// its headline figure (e.g. "$65.2B", "410M", "79%"), its shape (Top-N ranking, share,
// count, trend) and its desk colour. Replaces the bold text title cards on countly only.
// Pure string building: no I/O, ~2–4 KB, safe for the 10 ms Workers CPU budget.

type Kind = "ladder" | "ring" | "waffle" | "line" | "columns";
export interface Figure { text: string; value: number; pct?: number }

const ACCENTS: Array<[RegExp, string]> = [
  [/richest|billionaire|net worth|wealth|fortune|salary|gold|crypto|bitcoin/i, "#f5c451"],
  [/\b(ai|chatgpt|openai|gpt|llm|gemini|claude|nvidia|gpu)\b/i, "#a78bfa"],
  [/social|facebook|instagram|tiktok|youtube|twitter|whatsapp|snapchat|telegram|roblox|users/i, "#f472b6"],
  [/internet|website|online|broadband|apps?\b|digital|smartphone|mobile|speed/i, "#38bdf8"],
  [/countr|population|gdp|tourist|cities|nation|world/i, "#2dd4bf"],
];
const GREEN = "#34d399";

export function accentOf(title: string): string {
  for (const [re, c] of ACCENTS) if (re.test(title)) return c;
  return GREEN;
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
  const re = /([$€£₹])?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(trillion|billion|million|thousand|[TBMK](?![a-z]))?\s?(%)?/gi;
  let best: (Figure & { score: number }) | null = null;
  for (const m of title.matchAll(re)) {
    const [, cur, num, sfx, pct] = m;
    const n = Number(num.replace(/,/g, ""));
    if (!isFinite(n)) continue;
    if (!cur && !sfx && !pct && /^(19|20)\d\d$/.test(num)) continue; // a year
    if (/top\s*$/i.test(title.slice(0, m.index))) continue; // "Top 10" is the list size, not the figure
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

function kindOf(title: string, fig: Figure | null, r: () => number): Kind {
  if (/\btop\s*\d+|ranked|ranking|largest|biggest|richest|most\b|best\b|leading|highest|lowest/i.test(title)) return "ladder";
  if (fig?.pct !== undefined) return "ring";
  if (/users|population|people|subscribers|visitors|tourist|students|employees|billionaires|count|members|downloads/i.test(title)) return "waffle";
  if (/growth|rise|vs\b|trend|forecast|since|history|shift|gain|loss|drop|decline|slower|faster|jump/i.test(title)) return "line";
  return r() < 0.5 ? "columns" : "line";
}

const f1 = (n: number) => Math.round(n * 10) / 10;

/**
 * SVG markup (1200×630 viewBox). `label: false` leaves out the figure text (the OG renderer
 * draws it itself because SVG text inside an <img> has no fonts there).
 */
export function artSvg(title: string, opts: { label?: boolean; w?: number; h?: number } = {}): string {
  const { label = true, w = 600, h = 315 } = opts;
  const seed = hash(title);
  const r = rng(seed);
  const fig = figureOf(title);
  const kind = kindOf(title, fig, r);
  const c = accentOf(title);
  const id = "c" + (seed % 1e6).toString(36);
  let body = "";

  // Chart area — kept inside the ~800×480 centre safe zone (cards crop with object-fit: cover).
  const hasLabel = label && (!!fig || (kind === "ladder" && /top\s*\d+/i.test(title)));
  const X0 = 210, X1 = 990, Y0 = hasLabel ? 250 : 170, Y1 = 500;

  if (kind === "ladder") {
    const n = Math.max(3, Math.min(8, Number(title.match(/top\s*(\d+)/i)?.[1]) || 6));
    const gap = 10, bh = (Y1 - Y0 - gap * (n - 1)) / n;
    let v = 1;
    for (let i = 0; i < n; i++) {
      const y = Y0 + i * (bh + gap);
      const wv = (X1 - X0 - 40) * v;
      body += `<rect x="${X0}" y="${f1(y)}" width="${X1 - X0 - 40}" height="${f1(bh)}" rx="${f1(bh / 2.4)}" fill="#fff" fill-opacity=".05"/>`;
      body += `<rect x="${X0}" y="${f1(y)}" width="${f1(wv)}" height="${f1(bh)}" rx="${f1(bh / 2.4)}" fill="${c}" fill-opacity="${i === 0 ? 1 : f1(0.62 - i * 0.05)}"/>`;
      body += `<circle cx="${f1(X0 + wv - bh / 2)}" cy="${f1(y + bh / 2)}" r="${f1(bh / 5)}" fill="#0b1220" fill-opacity="${i === 0 ? 0.55 : 0.25}"/>`;
      v *= 0.72 + r() * 0.2;
    }
  } else if (kind === "ring") {
    const p = (fig?.pct ?? 40 + r() * 50) / 100;
    const cx = hasLabel ? 800 : 600, cy = 330, R = 150, L = 2 * Math.PI * R;
    body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="44"/>`;
    body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${c}" stroke-width="44" stroke-linecap="round" stroke-dasharray="${f1(L * p)} ${f1(L)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    body += `<circle cx="${cx}" cy="${cy}" r="${R - 58}" fill="${c}" fill-opacity=".08"/>`;
  } else if (kind === "waffle") {
    const cols = 10, rows = 6, s = 36, g = 11;
    const gx = hasLabel ? 990 - cols * (s + g) + g : 600 - (cols * (s + g) - g) / 2;
    const gy = hasLabel ? 190 : 170;
    const filled = Math.round(cols * rows * (0.35 + r() * 0.5));
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const on = col * rows + (rows - 1 - row) < filled; // fills column by column, bottom-up
      body += `<rect x="${gx + col * (s + g)}" y="${gy + row * (s + g)}" width="${s}" height="${s}" rx="10" fill="${on ? c : "#fff"}" fill-opacity="${on ? f1(0.55 + 0.45 * ((col + row) % 3 === 0 ? 1 : 0.6)) : 0.06}"/>`;
    }
  } else if (kind === "line") {
    const down = /drop|decline|loss|slower|fall|lower|shrink|cut/i.test(title);
    const n = 9;
    const pts: Array<[number, number]> = [];
    let v = down ? 0.85 : 0.2;
    for (let i = 0; i < n; i++) {
      pts.push([X0 + ((X1 - X0) * i) / (n - 1), Y1 - (Y1 - Y0) * Math.max(0.05, Math.min(0.95, v))]);
      v += (down ? -1 : 1) * (0.04 + r() * 0.1) + (r() - 0.5) * 0.12;
    }
    const d = pts.map((p, i) => `${i ? "L" : "M"}${f1(p[0])} ${f1(p[1])}`).join("");
    for (let i = 0; i < 4; i++) body += `<line x1="${X0}" x2="${X1}" y1="${f1(Y0 + ((Y1 - Y0) * i) / 3)}" y2="${f1(Y0 + ((Y1 - Y0) * i) / 3)}" stroke="#fff" stroke-opacity=".07" stroke-width="2"/>`;
    body += `<path d="${d}L${X1} ${Y1}L${X0} ${Y1}Z" fill="url(#${id}a)"/>`;
    body += `<path d="${d}" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`;
    const [lx, ly] = pts[n - 1];
    body += `<circle cx="${f1(lx)}" cy="${f1(ly)}" r="26" fill="${c}" fill-opacity=".18"/><circle cx="${f1(lx)}" cy="${f1(ly)}" r="11" fill="${c}"/>`;
  } else {
    const n = 10, g = 18, bw = (X1 - X0 - g * (n - 1)) / n;
    let v = 0.3 + r() * 0.2;
    for (let i = 0; i < n; i++) {
      const bh = (Y1 - Y0) * Math.min(1, v);
      body += `<rect x="${f1(X0 + i * (bw + g))}" y="${f1(Y1 - bh)}" width="${f1(bw)}" height="${f1(bh)}" rx="8" fill="${c}" fill-opacity="${i === n - 1 ? 1 : f1(0.25 + i * 0.05)}"/>`;
      v += 0.03 + r() * 0.09;
    }
  }

  const shown = fig?.text ?? (kind === "ladder" && /top\s*\d+/i.test(title) ? "Top " + title.match(/top\s*(\d+)/i)![1] : "");
  const text =
    label && shown
      ? `<text x="${X0}" y="${kind === "ring" || kind === "waffle" ? 360 : 205}" font-family="Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-weight="700" font-size="${kind === "ring" || kind === "waffle" ? 92 : 64}" letter-spacing="-2" fill="#fff">${shown.replace(/[<>&]/g, "")}</text>` +
        `<rect x="${X0}" y="${kind === "ring" || kind === "waffle" ? 392 : 228}" width="56" height="6" rx="3" fill="${c}"/>`
      : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="${w}" height="${h}">` +
    `<defs><linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#0f1d1a"/></linearGradient>` +
    `<linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="${id}g" cx=".85" cy=".1" r=".7"><stop offset="0" stop-color="${c}" stop-opacity=".22"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>` +
    `<pattern id="${id}d" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#fff" fill-opacity=".07"/></pattern></defs>` +
    `<rect width="1200" height="630" fill="url(#${id}b)"/><rect width="1200" height="630" fill="url(#${id}d)"/><rect width="1200" height="630" fill="url(#${id}g)"/>` +
    body +
    text +
    `</svg>`
  );
}

export const artUri = (title: string, opts?: { label?: boolean; w?: number; h?: number }) =>
  "data:image/svg+xml," + encodeURIComponent(artSvg(title, opts));
