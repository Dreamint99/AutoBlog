"""Build a permanent pool of free (CC0 / public-domain) wide photos per GCC country from Openverse.

    python build_image_pool.py            # writes data/image_pool_gccguide.json

Openverse rate-limits cloud IPs (GitHub runners get nothing back), so the pool is built from a
normal connection once and committed; the writer then picks unused photos from it by country.
"""
import json
import os
import re
import time

import requests

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "image_pool_gccguide.json")
UA = {"User-Agent": "AutoBlog/1.0 (https://gccguide.com; contact admin)"}
QUERIES = {
    "Qatar": ["Doha skyline", "Doha Qatar", "Qatar desert", "Souq Waqif", "Doha corniche", "Lusail", "Qatar mosque", "Doha street"],
    "UAE": ["Dubai skyline", "Dubai marina", "Abu Dhabi", "Sheikh Zayed Mosque", "Dubai street", "Sharjah", "Dubai desert", "Burj Khalifa"],
    "Saudi Arabia": ["Riyadh skyline", "Riyadh", "Jeddah", "Saudi Arabia desert", "Jeddah corniche", "Saudi Arabia city", "Mecca", "AlUla"],
    "Kuwait": ["Kuwait City", "Kuwait towers", "Kuwait skyline", "Kuwait", "Kuwait mosque", "Kuwait street"],
    "Oman": ["Muscat Oman", "Muscat", "Oman mountains", "Oman desert", "Sultan Qaboos Mosque", "Nizwa", "Oman coast", "Salalah"],
    "Bahrain": ["Manama Bahrain", "Bahrain", "Bahrain skyline", "Bahrain World Trade Center", "Manama", "Bahrain mosque"],
    "GCC": ["Arabian Gulf city", "Middle East skyline", "passport travel", "airport terminal", "office workers", "construction workers", "desert road", "money exchange"],
}
STD = (500, 960, 1280, 1920)


def thumb(url: str, w: int = 1280) -> str:
    """Wikimedia only serves standard thumbnail steps; others keep the original URL."""
    m = re.match(r"https://upload\.wikimedia\.org/wikipedia/commons/(?!thumb/)([0-9a-f])/([0-9a-f]{2})/(.+)$", url)
    if not m:
        return url
    w = min(STD, key=lambda s: abs(s - w))
    name = m.group(3)
    return f"https://upload.wikimedia.org/wikipedia/commons/thumb/{m.group(1)}/{m.group(2)}/{name}/{w}px-{name}"


def search(q: str) -> list[dict]:
    for attempt in range(4):
        r = requests.get("https://api.openverse.org/v1/images/", params={
            "q": q, "license": "cc0,pdm", "category": "photograph", "aspect_ratio": "wide",
            "page_size": 20, "mature": "false"}, headers=UA, timeout=30)
        if r.status_code == 429:
            time.sleep(20 * (attempt + 1))
            continue
        if not r.ok:
            return []
        return r.json().get("results", [])
    return []


def main():
    pool, seen = {}, set()
    for country, qs in QUERIES.items():
        words = {w.lower() for q in qs for w in q.split() if len(w) > 3} | {country.lower().split()[0]}
        items = []
        for q in qs:
            for h in search(q):
                url, wd = h.get("url") or "", h.get("width") or 0
                if not url or url in seen or wd < 1000:
                    continue
                text = ((h.get("title") or "") + " " + " ".join((t.get("name") or "") for t in h.get("tags") or [])).lower()
                if country != "GCC" and not any(w in text for w in words):
                    continue  # keep only photos that are really of this country
                seen.add(url)
                items.append({"url": thumb(url), "title": (h.get("title") or q)[:90]})
            time.sleep(3)
        pool[country] = items
        print(country, len(items))
    json.dump(pool, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
