"""On-topic images for the Next.js sites (D1 articles: image_url + body_html).

choose(title, slug, site, body_html, image_url, used) → (image_url, body_html)

* Feature: a free-licence Commons photo of the article's country (credited), or the
  site's own title card https://<domain>/card/<slug>. An existing Wikipedia picture is
  kept only when its file name shares a real word with the title (a named subject).
* Body: images from sources that gave off-topic or uncredited pictures (Openverse /
  Flickr / Rawpixel hotlinks, Pollinations — now paid, so broken) become more photos of
  the same country, or are removed. Wikipedia subject pictures stay.
"""
import re
from urllib.parse import unquote

from modules import feature_image as fi

_FIG = re.compile(r'<figure class="post-image">.*?</figure>', re.S)
_BAD_SRC = re.compile(r"staticflickr\.com|rawpixel\.com|pollinations\.ai|openverse|pd\.w\.org|wordpress\.org/photos", re.I)
_CREDIT = re.compile(r'\s*<p class="ab-photo-credit"[^>]*>.*?</p>', re.S)
_COMMONS_FILE = re.compile(r"/wikipedia/commons/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/?\"']+)")
_STOP = set("the a an of for to in on and or with how what why best guide top your 2024 2025 2026 2027 complete "
            "full new free live vs list ranked ranking stats cost price prices essential ultimate tips".split())


def _words(s: str) -> set:
    return {w for w in re.findall(r"[a-z0-9]{3,}", unquote(s or "").lower()) if w not in _STOP}


def _wiki_ok(url: str, title: str) -> bool:
    """A Wikipedia/Commons picture whose file name names something in the title."""
    if not re.search(r"wikimedia\.org", url or ""):
        return False
    fname = re.sub(r"\?.*$", "", url).rsplit("/", 1)[-1]
    fname = re.sub(r"^\d+px-", "", fname)
    return bool(_words(fname) & _words(title))


def card_url(site: dict, slug: str) -> str:
    return f"https://{site['domain']}/card/{slug}"


def choose(title: str, slug: str, site: dict, body_html: str, image_url: str, used: set) -> tuple[str, str, list]:
    """Returns (image_url, body_html, commons photos used)."""
    country = fi.detect_country(title, slug)
    # Commons photos picked under older, looser rules must still name this country's city/country.
    bad_commons = [n for n in _COMMONS_FILE.findall(image_url or "") + _COMMONS_FILE.findall(body_html or "")
                   if not fi.photo_fits(unquote(n).replace("_", " "), country)]
    if bad_commons:
        for n in bad_commons:
            body_html = re.sub(r'<figure class="post-image"><img src="[^"]*' + re.escape(n) + r'[^"]*"[^>]*>.*?</figure>', "", body_html, flags=re.S)
        if any(n in (image_url or "") for n in bad_commons):
            image_url = ""
    if "/card/" in (image_url or "") or "/wikipedia/commons/" in (image_url or "") and _CREDIT.search(body_html or ""):
        if not any(_BAD_SRC.search(m.group(0)) for m in _FIG.finditer(body_html or "")):
            return image_url, body_html, []  # already done by this module: stay stable across runs
    figs = [m.group(0) for m in _FIG.finditer(body_html) if _BAD_SRC.search(m.group(0))]
    # One country photo in the body at most: five skylines in a dress-code article read as filler.
    want = (0 if _wiki_ok(image_url, title) else 1) + min(len(figs), 1)
    pool = fi.country_photos(country, used, want) if country and want else []
    for p in pool:
        used.add(p["source_id"])
    placed = []

    if _wiki_ok(image_url, title):
        feature = image_url
    elif pool:
        p = pool.pop(0)
        feature, placed = p["url"], [p]
    else:
        feature = card_url(site, slug)

    def swap(m):
        tag = m.group(0)
        if not _BAD_SRC.search(tag):
            return tag
        if pool:
            p = pool.pop(0)
            placed.append(p)
            return (f'<figure class="post-image"><img src="{p["url"]}" alt="{title}" loading="lazy">'
                    f'<figcaption>{country[0] if country else ""}</figcaption></figure>')
        return ""

    body = _FIG.sub(swap, body_html)
    # Bare <img> from the same broken/uncredited sources (outside a post-image figure).
    body = re.sub(r"<img\b[^>]*>", lambda m: "" if _BAD_SRC.search(m.group(0)) else m.group(0), body)
    if placed or _CREDIT.search(body):
        body = _CREDIT.sub("", body).rstrip()
    if placed:
        links = "; ".join(f'<a href="{p["page"]}" rel="noopener" target="_blank">{p["credit"]}</a>' for p in placed)
        body += f'\n<p class="ab-photo-credit" style="font-size:12px;opacity:.7">Photos: {links}</p>'
    return feature, body, placed



def rebuild_credit(image_url: str, body_html: str) -> str:
    """Credit line listing every Commons photo the article shows (feature + body), read back
    from Commons — repairs credits lost when an earlier run swapped photos."""
    import requests
    names = list(dict.fromkeys(_COMMONS_FILE.findall(image_url or "") + _COMMONS_FILE.findall(body_html or "")))
    body = _CREDIT.sub("", body_html or "").rstrip()
    if not names:
        return body
    titles = "|".join("File:" + unquote(n).replace("_", " ") for n in names[:20])
    r = requests.get("https://commons.wikimedia.org/w/api.php", headers=fi._UA, timeout=30, params={
        "action": "query", "format": "json", "titles": titles, "prop": "imageinfo", "iiprop": "extmetadata|url"})
    links = []
    for p in (r.json().get("query", {}).get("pages") or {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        m = ii.get("extmetadata") or {}
        artist = re.sub(r"<[^>]+>", "", fi._html.unescape((m.get("Artist") or {}).get("value", ""))).strip() or "Unknown"
        lic = (m.get("LicenseShortName") or {}).get("value", "")
        if ii.get("descriptionurl"):
            links.append(f'<a href="{ii["descriptionurl"]}" rel="noopener" target="_blank">{artist[:80]} / Wikimedia Commons, {lic}</a>')
    return body + (f'\n<p class="ab-photo-credit" style="font-size:12px;opacity:.7">Photos: {"; ".join(links)}</p>' if links else "")
