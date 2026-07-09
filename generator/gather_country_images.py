"""Fetch REAL, verified Wikimedia Commons images for the safest-countries article.
Every URL is HTTP-checked (200 + image/*) before we keep it — no broken images.
"""
import json
import re
import requests

COMMONS = "https://commons.wikimedia.org/w/api.php"
HDRS = {"User-Agent": "AutoBlog/1.0 (safest countries article; contact@walvi.io)"}

# key -> ordered search terms (scenic city / landmark shots preferred)
QUERIES = {
    "iceland": ["Reykjavik cityscape", "Reykjavik Iceland", "Iceland landscape Hallgrimskirkja"],
    "ireland": ["Dublin Ireland city", "Cliffs of Moher Ireland", "Dublin cityscape"],
    "austria": ["Vienna Austria cityscape", "Vienna skyline", "Hallstatt Austria"],
    "new-zealand": ["Auckland New Zealand skyline", "Wellington New Zealand", "New Zealand landscape Milford"],
    "singapore": ["Singapore skyline Marina Bay", "Singapore cityscape", "Marina Bay Sands"],
    "switzerland": ["Zurich Switzerland city", "Swiss Alps Matterhorn", "Lucerne Switzerland"],
    "portugal": ["Lisbon Portugal cityscape", "Porto Portugal", "Lisbon skyline"],
    "denmark": ["Copenhagen Denmark Nyhavn", "Copenhagen cityscape", "Copenhagen skyline"],
    "slovenia": ["Ljubljana Slovenia", "Lake Bled Slovenia", "Ljubljana cityscape"],
    "japan": ["Tokyo Japan skyline", "Kyoto Japan temple", "Mount Fuji Japan"],
    "hero-safe": ["peaceful city skyline Europe", "safe modern city street", "Copenhagen Nyhavn"],
}


def search_images(term, limit=8):
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": term, "gsrnamespace": "6", "gsrlimit": str(limit),
        "prop": "imageinfo", "iiprop": "url|extmetadata|mime", "iiurlwidth": "1280",
    }
    try:
        r = requests.get(COMMONS, params=params, headers=HDRS, timeout=30)
        pages = (r.json().get("query", {}) or {}).get("pages", {}) or {}
    except Exception:
        return []
    out = []
    for p in pages.values():
        ii = (p.get("imageinfo") or [{}])[0]
        mime = ii.get("mime", "")
        if not mime.startswith("image/") or mime in ("image/svg+xml", "image/gif"):
            continue
        thumb = ii.get("thumburl") or ii.get("url")
        if not thumb:
            continue
        title = p.get("title", "").lower()
        if any(bad in title for bad in ("logo", "map", "flag", "coat_of_arms", "location", "seal", "emblem")):
            continue
        meta = ii.get("extmetadata", {}) or {}
        artist = re.sub(r"<[^>]+>", "", (meta.get("Artist", {}) or {}).get("value", "")).strip()[:60]
        lic = (meta.get("LicenseShortName", {}) or {}).get("value", "")
        out.append({"title": p.get("title", "").replace("File:", ""), "url": thumb,
                    "artist": artist, "license": lic, "index": p.get("index", 999)})
    out.sort(key=lambda x: x["index"])
    return out


def verify(url):
    try:
        g = requests.get(url, headers=HDRS, timeout=25, stream=True)
        return g.status_code == 200 and g.headers.get("content-type", "").startswith("image/")
    except Exception:
        return False


def main():
    result = {}
    for key, terms in QUERIES.items():
        picked = None
        for t in terms:
            for cand in search_images(t):
                if verify(cand["url"]):
                    picked = cand
                    break
            if picked:
                break
        if picked:
            result[key] = picked
            print(f"OK   {key:14} {picked['title'][:50]}")
        else:
            print(f"MISS {key:14} (none for {terms})")
    with open("data/country_images.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(result)}/{len(QUERIES)} verified images.")


if __name__ == "__main__":
    main()
