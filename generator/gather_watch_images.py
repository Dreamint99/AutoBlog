"""Fetch REAL, verified Wikimedia Commons images for the luxury-watch article.

For each watch we search Commons (namespace 6 = files), take candidate images,
and keep only URLs that actually return HTTP 200. Hallucinated URLs = broken
images, so every URL here is fetched and checked before we use it.
"""
import json
import sys
import requests

COMMONS = "https://commons.wikimedia.org/w/api.php"
HDRS = {"User-Agent": "AutoBlog/1.0 (luxury watch article; contact@countly.net)"}

# (key, search terms) — ordered top 10 + a couple of extras/brand shots
QUERIES = [
    ("rolex-submariner", "Rolex Submariner watch"),
    ("rolex-daytona", "Rolex Daytona"),
    ("patek-nautilus", "Patek Philippe Nautilus"),
    ("ap-royal-oak", "Audemars Piguet Royal Oak"),
    ("omega-speedmaster", "Omega Speedmaster Moonwatch"),
    ("vacheron-overseas", "Vacheron Constantin watch"),
    ("jlc-reverso", "Jaeger-LeCoultre Reverso"),
    ("lange-1", "A. Lange Söhne Lange 1"),
    ("cartier-tank", "Cartier Tank watch"),
    ("richard-mille", "Richard Mille watch"),
    ("breguet", "Breguet wristwatch"),
    ("hero-watches", "luxury wristwatch collection"),
]


def search_images(term, limit=8):
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": term, "gsrnamespace": "6", "gsrlimit": str(limit),
        "prop": "imageinfo", "iiprop": "url|extmetadata|mime", "iiurlwidth": "1280",
    }
    r = requests.get(COMMONS, params=params, headers=HDRS, timeout=30)
    pages = (r.json().get("query", {}) or {}).get("pages", {}) or {}
    out = []
    for p in pages.values():
        ii = (p.get("imageinfo") or [{}])[0]
        mime = ii.get("mime", "")
        if not mime.startswith("image/") or mime in ("image/svg+xml", "image/gif"):
            continue
        thumb = ii.get("thumburl") or ii.get("url")
        if not thumb:
            continue
        meta = ii.get("extmetadata", {}) or {}
        artist = (meta.get("Artist", {}) or {}).get("value", "")
        # strip html tags from artist credit
        import re
        artist = re.sub(r"<[^>]+>", "", artist).strip()[:60]
        lic = (meta.get("LicenseShortName", {}) or {}).get("value", "")
        out.append({
            "title": p.get("title", "").replace("File:", ""),
            "url": thumb, "artist": artist, "license": lic,
            "index": p.get("index", 999),
        })
    out.sort(key=lambda x: x["index"])
    return out


def verify(url):
    try:
        h = requests.head(url, headers=HDRS, timeout=20, allow_redirects=True)
        if h.status_code == 200 and h.headers.get("content-type", "").startswith("image/"):
            return True
        g = requests.get(url, headers=HDRS, timeout=20, stream=True)
        return g.status_code == 200 and g.headers.get("content-type", "").startswith("image/")
    except Exception:
        return False


def main():
    result = {}
    for key, term in QUERIES:
        picked = None
        for cand in search_images(term):
            if verify(cand["url"]):
                picked = cand
                break
        if picked:
            result[key] = picked
            print(f"OK   {key:20} {picked['url'][:80]}")
        else:
            print(f"MISS {key:20} (no verified image for '{term}')")
    with open("data/watch_images.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(result)}/{len(QUERIES)} verified images to data/watch_images.json")


if __name__ == "__main__":
    main()
