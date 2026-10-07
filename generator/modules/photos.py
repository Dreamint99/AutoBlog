"""Real stock photos for WordPress sites (no AI images).

find_photo(queries, used)  → (image_url, source_id) of a real, on-topic photo.
  1. Pixabay (free licence, no attribution) — needs PIXABAY_API_KEY.
  2. Openverse, restricted to CC0 / public-domain photos (no key, no attribution).
Queries are tried from most to least specific; `used` holds source ids already
placed on the site so the same photo isn't repeated across posts.

The returned URL is only used to DOWNLOAD the file once — callers re-host it in the
WordPress media library (wp_upload), so hotlink expiry never breaks a post.
"""
import re

import requests

from config.settings import PIXABAY_API_KEY

_UA = {"User-Agent": "AutoBlog/1.0 (real photos for probashiinfo.com)"}
_DROP = re.compile(r"\b(with|and|the|a|an|of|on|in|at|for|to|from|showing|website|screen|"
                   r"logo|text|sign|document|documents|form|application|official|"
                   r"bangladeshi|bangladesh)\b", re.IGNORECASE)


def variants(text: str) -> list[str]:
    """'Bangladeshi taka banknotes and coins on a table — রেমিট্যান্স' →
    ['Bangladeshi taka banknotes and coins on a table', 'taka banknotes coins', 'taka banknotes']"""
    eng = re.split(r"\s[—–-]\s", text or "")[0]
    eng = re.sub(r"[^A-Za-z ]+", " ", eng).strip()
    eng = re.sub(r"\s+", " ", eng)
    if not eng:
        return []
    core = [w for w in _DROP.sub(" ", eng).split() if len(w) > 2]
    out = [eng]
    for n in (3, 2, 1):
        q = " ".join(core[:n])
        if q and q not in out:
            out.append(q)
    return out


def _pixabay(q: str, used: set) -> tuple[str, str] | None:
    if not PIXABAY_API_KEY:
        return None
    try:
        r = requests.get("https://pixabay.com/api/", params={
            "key": PIXABAY_API_KEY, "q": q[:100], "image_type": "photo", "orientation": "horizontal",
            "safesearch": "true", "per_page": 30, "order": "popular", "min_width": 1200,
        }, timeout=20)
        for h in r.json().get("hits", []):
            sid = f"pixabay:{h['id']}"
            if sid not in used:
                return h.get("largeImageURL") or h.get("webformatURL"), sid
    except Exception:
        pass
    return None


def _openverse(q: str, used: set) -> tuple[str, str] | None:
    try:
        r = requests.get("https://api.openverse.org/v1/images/", params={
            "q": q[:100], "license": "cc0,pdm", "category": "photograph",
            "aspect_ratio": "wide", "size": "large", "page_size": 20, "mature": "false",
        }, headers=_UA, timeout=20)
        for h in r.json().get("results", []):
            sid = f"openverse:{h['id']}"
            if sid not in used and h.get("url"):
                return h["url"], sid
    except Exception:
        pass
    return None


def find_photo(queries: list[str], used: set) -> tuple[str, str] | None:
    qs = []
    for q in queries:
        for v in variants(q):
            if v not in qs:
                qs.append(v)
    for source in (_pixabay, _openverse):
        for q in qs:
            hit = source(q, used)
            if hit:
                used.add(hit[1])
                return hit
    return None


def wp_upload(base: str, headers: dict, url: str, name: str, alt: str = "", source_id: str = "") -> tuple[int, str] | None:
    """Download `url` and store it in the WP media library. Returns (media_id, wp_url)."""
    try:
        img = requests.get(url, headers=_UA, timeout=60)
        img.raise_for_status()
        ctype = img.headers.get("Content-Type", "image/jpeg").split(";")[0]
        if not ctype.startswith("image/") or len(img.content) < 15_000:
            return None
        ext = {"image/png": "png", "image/webp": "webp"}.get(ctype, "jpg")
        fname = (re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "photo")[:60]
        up = requests.post(f"{base}/wp-json/wp/v2/media", headers={
            **headers, "Content-Disposition": f'attachment; filename="{fname}.{ext}"', "Content-Type": ctype,
        }, data=img.content, timeout=120)
        up.raise_for_status()
        j = up.json()
        meta = {k: v for k, v in {"alt_text": alt, "title": alt,
                                  "description": f"photo-source:{source_id}" if source_id else ""}.items() if v}
        if meta:  # the photo-source tag lets later runs skip photos already on the site
            requests.post(f"{base}/wp-json/wp/v2/media/{j['id']}", headers={**headers, "Content-Type": "application/json"},
                          json=meta, timeout=60)
        return j["id"], j.get("source_url", "")
    except Exception:
        return None


_IMG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)


def rehost_inline(base: str, headers: dict, html: str, used: set, fallback_q: str, name: str,
                  only=lambda src: True) -> tuple[str, int]:
    """Replace each <img> (whose src passes `only`) with a real photo for its alt text,
    uploaded to WP. Returns (new_html, replaced_count). Images we can't replace stay."""
    count = 0

    def repl(m):
        nonlocal count
        tag = m.group(0)
        src = (re.search(r'src="([^"]*)"', tag) or [None, ""])[1]
        if not only(src):
            return tag
        alt = (re.search(r'alt="([^"]*)"', tag) or [None, ""])[1]
        hit = find_photo([alt, fallback_q], used)
        if not hit:
            return tag
        up = wp_upload(base, headers, hit[0], f"{name}-{count + 1}", alt=re.split(r"\s[—–-]\s", alt)[-1] or alt,
                       source_id=hit[1])
        if not up:
            return tag
        count += 1
        new = re.sub(r'\s(?:srcset|sizes|width|height)="[^"]*"', "", tag)
        return re.sub(r'src="[^"]*"', f'src="{up[1]}"', new, count=1)

    return _IMG.sub(repl, html), count
