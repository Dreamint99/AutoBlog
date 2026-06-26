"""Images — feature + inline. Pixabay first (real photos), then free fallbacks.

feature_image(title, site, query) → one wide hero image URL.
inline_image(keyword)            → one in-article image URL for a section.
"""
import re
from urllib.parse import quote

import requests

from config.settings import IMAGE_PROVIDER, PIXABAY_API_KEY

_STOP = set("the a an of for to in on and or with how what why best guide your you 2024 2025 "
            "from is are can do does requirements complete step by".split())


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


def _pollinations(prompt: str, w: int, h: int) -> str:
    return f"https://image.pollinations.ai/prompt/{quote(prompt)}?width={w}&height={h}&nologo=true"


def _pixabay_first(query: str, horizontal: bool = True) -> str | None:
    """Try the query, then progressively BROADER versions (fewer words), so a
    real Pixabay photo is found even when the original query is very specific
    (e.g. 'Toyota assembly line Japan' → 'Toyota assembly' → 'Toyota'). Returns a
    reliable static CDN URL, or None."""
    if not PIXABAY_API_KEY:
        return None
    words = [w for w in (query or "").split() if w]
    candidates: list[str] = []
    if query:
        candidates.append(query)
    if len(words) > 2:
        candidates.append(" ".join(words[:2]))
    if words:
        candidates.append(words[0])
    seen: set[str] = set()
    for c in candidates:
        c = c.strip()
        key = c.lower()
        if not c or key in seen:
            continue
        seen.add(key)
        url = _pixabay(c, horizontal)
        if url:
            return url
    return None


def feature_image(title: str, site: dict, query: str | None = None) -> str:
    """Reliable hero image. Real Pixabay photo first (progressively broadened so it
    almost always hits), then AI generation as a last resort."""
    niche = site.get("niche", "")
    primary = (niche.split(",")[0].strip() if niche else "") or "infographic"
    url = (
        _pixabay_first(query or "", True)
        or _pixabay_first(short_query(title, niche, n=2), True)
        or _pixabay_first(primary, True)
    )
    if url:
        return url
    # last resort — AI generation
    q = query or short_query(title, niche) or primary
    return _pollinations(f"editorial photo, {q}, no text", 1200, 630)


def inline_image(keyword: str) -> str:
    """Reliable in-article image — broadened Pixabay first, AI generation last."""
    url = _pixabay_first(keyword, True) or _pixabay_first(short_query(keyword, n=2), True)
    if url:
        return url
    return _pollinations(f"editorial photo, {keyword}, no text", 1000, 560)


def embed_inline_images(body_html: str, max_images: int = 4) -> str:
    """Replace `[[IMG: keyword]]` markers from the writer with real <figure> images
    (capped at max_images; extra markers are removed)."""
    import html as _html

    count = {"n": 0}

    def repl(m):
        if count["n"] >= max_images:
            return ""
        count["n"] += 1
        kw = m.group(1).strip()
        url = inline_image(kw)
        cap = _html.escape(kw[:90])
        return (f'<figure class="post-image"><img src="{url}" alt="{cap}" loading="lazy">'
                f'<figcaption>{cap}</figcaption></figure>')

    return re.sub(r"\[\[\s*IMG:\s*([^\]]+?)\s*\]\]", repl, body_html, flags=re.IGNORECASE)
