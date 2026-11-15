// Inter (500 + 800) for the generated card/pin images; the built-in OG font has no bold weight,
// so headlines rendered thin. Fetched once per isolate from Google Fonts and kept in memory.
// ogFonts({ tight: true }) also loads "Inter Tight" 800 (GCCGuide's headline face).
type Font = { name: string; data: ArrayBuffer; weight: 500 | 800; style: "normal" };

// An old-browser UA makes Google Fonts serve TTF (Satori cannot read WOFF2).
const UA = "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:20.0) Gecko/20100101 Firefox/20.0";

async function load(family: string, name: string, weights: (500 | 800)[]): Promise<Font[]> {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weights.join(";")}`, { headers: { "User-Agent": UA } })).text();
  const urls = [...css.matchAll(/url\((https:[^)]+\.(?:ttf|woff))\)/g)].map((m) => m[1]);
  if (urls.length < weights.length) throw new Error("font css");
  const data = await Promise.all(urls.slice(0, weights.length).map((u) => fetch(u).then((r) => r.arrayBuffer())));
  return weights.map((weight, i) => ({ name, data: data[i], weight, style: "normal" as const }));
}

let cache: Promise<Font[]> | null = null;
let tightCache: Promise<Font[]> | null = null;

function inter(): Promise<Font[]> {
  cache ??= load("Inter", "Inter", [500, 800]).catch(() => {
    cache = null; // retry on the next request; render with the default font meanwhile
    return [];
  });
  return cache;
}

function interTight(): Promise<Font[]> {
  tightCache ??= load("Inter+Tight", "Inter Tight", [800]).catch(() => {
    tightCache = null;
    return [];
  });
  return tightCache;
}

export async function ogFonts(opts?: { tight?: boolean }): Promise<Font[]> {
  if (!opts?.tight) return inter();
  const [a, b] = await Promise.all([inter(), interTight()]);
  return [...a, ...b];
}
