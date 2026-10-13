// Smaller image URLs for list thumbnails (mobile Lighthouse flagged 200-400 KB images in card grids).
//   /card/<slug>?v=2            → same card rendered at 600x315 (&w=600)
//   upload.wikimedia.org thumbs → the 640px rendition instead of 1280px
//   ESPN team logos (500px PNG) → ESPN's own resizer at the displayed size
export function thumb(url: string | null | undefined, w: 600 | 320 = 600): string {
  if (!url) return "";
  if (/\/card\/[^/?#]+/.test(url) && !/[?&]w=/.test(url)) return url + (url.includes("?") ? "&" : "?") + "w=600";
  const wm = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/.+\/)(\d+)px-([^/]+)$/);
  if (wm && Number(wm[2]) > w) return `${wm[1]}${w === 600 ? 640 : 320}px-${wm[3]}`;
  const espn = url.match(/^https:\/\/a\.espncdn\.com(\/i\/teamlogos\/.+\.png)$/);
  if (espn) return `https://a.espncdn.com/combiner/i?img=${espn[1]}&w=96&h=96`;
  return url;
}
