"""Images — feature + inline. Pixabay first (real photos), then free fallbacks.

feature_image(title, site, query) → one wide hero image URL.
inline_image(keyword)            → one in-article image URL for a section.
"""
import re
from urllib.parse import quote

import requests

from config.settings import IMAGE_PROVIDER, PIXABAY_API_KEY

_STOP = set("the a an of for to in on and or with how what why best guide your you 2024 2025 2026 "
            "from is are can do does requirements complete step by top ten largest biggest ranked "
            "ranking rankings list lists world worlds vs review reviews near me most".split())

# Subjects that are sparse or ambiguous on stock libraries → map to a richer,
# still-relevant search term (keeps the photo ON TOPIC).
IMG_SYNONYMS = {
    "hypermarket": "supermarket", "hypermarkets": "supermarket",
    "grocery": "grocery store", "groceries": "grocery store",
    "bank": "bank building", "banks": "bank building",
    "university": "university campus", "universities": "university campus",
    "college": "university campus", "colleges": "university campus",
    "travel agency": "airport travel", "travel agencies": "airport travel",
    "hospital": "hospital building", "hospitals": "hospital building",
    "company": "office building", "companies": "office building",
    "startup": "startup office", "startups": "startup office",
    "airline": "airplane", "airlines": "airplane",
    "hotel": "hotel building", "hotels": "hotel building",
    "restaurant": "restaurant interior", "restaurants": "restaurant interior",
    "school": "school building", "schools": "school building",
    "gym": "gym fitness", "gyms": "gym fitness",
    "car brand": "car", "car brands": "car",
    "real estate company": "real estate", "real estate companies": "real estate",
    "insurance company": "insurance office", "insurance companies": "insurance office",
    "richest people": "luxury wealth", "billionaires": "luxury wealth",
    "shopping mall": "shopping mall", "shopping malls": "shopping mall",
}


def short_query(text: str, niche: str = "", n: int = 3) -> str:
    words = re.findall(r"[A-Za-z]+", text.lower())
    keep = [w for w in words if w not in _STOP and len(w) > 2]
    q = " ".join(keep[:n])
    if not q:
        q = (niche.split(",")[0] if niche else text)[:40]
    return q


def _pixabay(query: str, horizontal: bool) -> str | None:
    if not PIXABAY_API_KEY:
        return None
    try:
        r = requests.get("https://pixabay.com/api/", params={
            "key": PIXABAY_API_KEY, "q": query, "image_type": "photo",
            "orientation": "horizontal" if horizontal else "all",
            "safesearch": "true", "per_page": 8, "order": "popular",
        }, timeout=15)
        hits = r.json().get("hits", [])
        if hits:
            h = hits[0]
            return h.get("largeImageURL") or h.get("webformatURL")
    except Exception:
        pass
    return None


def _pollinations(subject: str, w: int, h: int) -> str:
    """Tuned free AI image (Pollinations / FLUX). Builds an editorial, photorealistic
    prompt and a stable seed (same subject → same image, so it never re-rolls) and
    asks for the flux model with prompt enhancement. Returns a permanent URL."""
    subject = (subject or "").strip().strip(",")
    prompt = (f"professional editorial photograph, {subject}, photorealistic, natural lighting, "
              "high detail, sharp focus, magazine quality, 35mm, no text, no watermark, no logo")
    seed = abs(hash(subject)) % 1_000_000
    q = (f"width={w}&height={h}&model=flux&enhance=true&nologo=true&private=true&seed={seed}")
    return f"https://image.pollinations.ai/prompt/{quote(prompt)}?{q}"


_USED: set = set()  # images already handed out in this run (no duplicate heroes)


def _commons_thumb(url: str, w: int) -> str:
    """upload.wikimedia.org original → a sized thumbnail (originals can be 20 MB)."""
    m = re.match(r"https://upload\.wikimedia\.org/wikipedia/commons/(\w)/(\w\w)/([^/?#]+)$", url)
    if not m or url.lower().endswith(".svg"):
        return url
    # Wikimedia only serves its standard thumbnail steps (others → HTTP 400)
    step = next((x for x in (500, 960, 1280, 1920) if x >= w), 1920)
    return f"https://upload.wikimedia.org/wikipedia/commons/thumb/{m[1]}/{m[2]}/{m[3]}/{step}px-{m[3]}"


def _openverse(query: str, w: int = 1200) -> str | None:
    """Free, keyless CC0 / public-domain photos (Openverse: Flickr, Wikimedia, Rawpixel…).
    Permanent source URLs; no attribution needed for CC0/PDM. Prefers tag/title matches."""
    q = (query or "").strip()
    if not q:
        return None
    try:
        r = requests.get("https://api.openverse.org/v1/images/", params={
            "q": q[:100], "license": "cc0,pdm", "category": "photograph", "aspect_ratio": "wide",
            "page_size": 20, "mature": "false"}, headers={"User-Agent": _WIKI_UA}, timeout=20)
        words = {x for x in re.findall(r"[a-z]{3,}", q.lower()) if x not in _STOP}
        best, best_score = None, -1
        for h in r.json().get("results", []):
            url = h.get("url") or ""
            if not url or url in _USED or (h.get("width") or 0) < 900:
                continue
            text = (h.get("title", "") + " " + " ".join(t.get("name", "") for t in h.get("tags") or [])).lower()
            score = sum(1 for x in words if x[:5] in text)
            if score > best_score:
                best, best_score = url, score
        if best and best_score >= max(1, (len(words) + 1) // 2):
            _USED.add(best)
            return _commons_thumb(best, w)
    except Exception:
        pass
    return None


_WIKI_UA = "AutoBlog/1.0 (https://countly.net; contact admin)"
# Drop these words before a Wikipedia lookup — they hurt the entity match.
_WIKI_DROP = re.compile(r"\b(logo|building|exterior|interior|office|headquarters|hq|campus|"
                        r"photo|image|picture|aerial|view|sign|signage)\b", re.IGNORECASE)


def _wikimedia(query: str) -> str | None:
    """Real, on-topic image for a NAMED entity (a bank, university, company, place)
    from Wikipedia's page image — e.g. 'Bangladesh Bank logo' → the actual
    Bangladesh Bank logo/building. Returns an upload.wikimedia.org URL, or None."""
    q = _WIKI_DROP.sub(" ", query or "").strip()
    q = re.sub(r"\s+", " ", q)
    if len(q) < 3:
        return None
    try:
        r = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query", "format": "json", "prop": "pageimages",
                "piprop": "thumbnail", "pithumbsize": 1000,
                "generator": "search", "gsrsearch": q, "gsrlimit": 4,
            },
            headers={"User-Agent": _WIKI_UA},
            timeout=15,
        )
        pages = (r.json().get("query") or {}).get("pages") or {}
        for p in sorted(pages.values(), key=lambda x: x.get("index", 99)):
            thumb = (p.get("thumbnail") or {}).get("source")
            if thumb:
                return thumb
    except Exception:
        pass
    return None


def _subject_terms(title: str) -> list[str]:
    """For listicle titles 'Top N <subject> in <place>' / 'Best <subject> in <place>'
    return ON-TOPIC search terms for the subject (with a richer synonym first).
    e.g. 'Top 10 Hypermarkets in Qatar 2026' → ['supermarket', 'hypermarket']."""
    m = re.search(r"(?:top|best)\s*\d*\s+(.+?)\s+in\s+", title, re.IGNORECASE)
    if not m:
        return []
    subj = re.sub(r"[^a-z &]", "", m.group(1).strip().lower()).strip()
    if not subj:
        return []
    sing = subj[:-1] if subj.endswith("s") and len(subj) > 3 else subj
    out: list[str] = []
    for key in (subj, sing):
        syn = IMG_SYNONYMS.get(key)
        if syn and syn not in out:
            out.append(syn)
    for term in (subj, sing):
        if term and term not in out:
            out.append(term)
    return out


def _first_hit(candidates: list[str], horizontal: bool = True) -> str | None:
    if not PIXABAY_API_KEY:
        return None
    seen: set[str] = set()
    for c in candidates:
        c = (c or "").strip()
        key = c.lower()
        if len(c) < 3 or key in seen:
            continue
        seen.add(key)
        url = _pixabay(c, horizontal)
        if url:
            return url
    return None


_POOLS: dict = {}


def pool_image(site_id: str, text: str) -> str:
    """Pick an unused photo from a committed per-site pool (data/image_pool_<site>.json), matched
    to the country named in `text` (country regexes from data/coverage_<site>.json). Used where the
    live image APIs are unreachable from CI (Openverse rate-limits GitHub runners)."""
    import json as _json
    import os as _os
    base = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), "data")
    if site_id not in _POOLS:
        try:
            pool = _json.load(open(_os.path.join(base, f"image_pool_{site_id}.json"), encoding="utf-8"))
            cov = _json.load(open(_os.path.join(base, f"coverage_{site_id}.json"), encoding="utf-8"))
            _POOLS[site_id] = (pool, {c: re.compile(v[0], re.I) for c, v in cov.get("countries", {}).items()})
        except Exception:
            _POOLS[site_id] = None
    if not _POOLS[site_id]:
        return ""
    pool, rx = _POOLS[site_id]
    order = [c for c, r in rx.items() if r.search(text or "")] + ["GCC"]
    for c in order:
        for it in pool.get(c, []):
            if it["url"] not in _USED:
                _USED.add(it["url"])
                return it["url"]
    return ""


def feature_image(title: str, site: dict, query: str | None = None) -> str:
    """PERMANENT, on-topic hero image. Pixabay hotlink URLs EXPIRE (start 400-ing),
    so we use Wikipedia's permanent image (upload.wikimedia.org) first — matched to
    the article's real subject — then Pollinations AI (also a permanent URL) as a
    relevant fallback. Both render in browsers and never break later."""
    niche = site.get("niche", "")
    primary = (niche.split(",")[0].strip() if niche else "") or "infographic"
    candidates = _subject_terms(title)
    if query:
        candidates.append(query)
    sq = short_query(title, niche, n=2)
    if sq:
        candidates.append(sq)
    candidates.append(primary)
    # Sites can opt out of Wikipedia matching (`"wiki_images": false` in sites_config):
    # it is great for named entities but picks wrong photos for generic topics
    # (VisaPoint got club crests and a 1941 flag as visa-guide heroes).
    if site.get("wiki_images", True):
        for c in candidates:
            w = _wikimedia(c)
            if w:
                return w
    # Pollinations now needs a paid key (HTTP 402) — use free CC0 photos instead.
    for c in candidates + [site.get("image_fallback_q") or ""]:
        o = _openverse(c, 1200)
        if o:
            return o
    return pool_image(site.get("id", ""), title)


def inline_image(keyword: str, use_wiki: bool = True) -> str:
    """PERMANENT, on-topic in-article image. Wikipedia's real image first (great for
    named entities), Pollinations AI as a permanent fallback. No Pixabay — its
    hotlink URLs expire and start returning 400."""
    wiki = _wikimedia(keyword) if use_wiki else None
    if wiki:
        return wiki
    return _openverse(keyword, 1000) or ""


def embed_inline_images(body_html: str, max_images: int = 4, use_wiki: bool = True, site_id: str = "", context: str = "") -> str:
    """Replace `[[IMG: keyword]]` markers from the writer with real <figure> images
    (capped at max_images; extra markers are removed)."""
    import html as _html

    count = {"n": 0}

    def repl(m):
        if count["n"] >= max_images:
            return ""
        count["n"] += 1
        kw = m.group(1).strip()
        url = inline_image(kw, use_wiki) or (pool_image(site_id, kw + " " + context) if site_id else "")
        if not url:  # no free photo found: drop the marker rather than a broken image
            count["n"] -= 1
            return ""
        cap = _html.escape(kw[:90])
        return (f'<figure class="post-image"><img src="{url}" alt="{cap}" loading="lazy">'
                f'<figcaption>{cap}</figcaption></figure>')

    return re.sub(r"\[\[\s*IMG:\s*([^\]]+?)\s*\]\]", repl, body_html, flags=re.IGNORECASE)
