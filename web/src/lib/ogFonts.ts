// Inter (500 + 800) for the generated card/pin images; the built-in OG font has no bold weight,
// so headlines rendered thin. Fetched once per isolate from Google Fonts and kept in memory.
type Font = { name: string; data: ArrayBuffer; weight: 500 | 800; style: "normal" };

let cache: Promise<Font[]> | null = null;

export function ogFonts(): Promise<Font[]> {
  cache ??= (async () => {
    try {
      const css = await (await fetch("https://fonts.googleapis.com/css2?family=Inter:wght@500;800", {
        // An old-browser UA makes Google Fonts serve TTF (Satori cannot read WOFF2).
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:20.0) Gecko/20100101 Firefox/20.0" },
      })).text();
      const urls = [...css.matchAll(/url\((https:[^)]+\.(?:ttf|woff))\)/g)].map((m) => m[1]);
      if (urls.length < 2) {
        cache = null;
        return [];
      }
      const [regular, bold] = await Promise.all(urls.slice(0, 2).map((u) => fetch(u).then((r) => r.arrayBuffer())));
      return [
        { name: "Inter", data: regular, weight: 500, style: "normal" },
        { name: "Inter", data: bold, weight: 800, style: "normal" },
      ];
    } catch {
      cache = null; // retry on the next request; render with the default font meanwhile
      return [];
    }
  })();
  return cache;
}
