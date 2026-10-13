"""WordPress side of on-topic images (modules/feature_image.py picks them).

featured(...)   → media id + credit for a post: a free-licence photo of the post's country,
                  else a rendered title card.
fix_inline(...) → replaces the stock photos the pipeline once placed inside a post (media
                  tagged "photo-source:" in the library) with more photos of the same country,
                  or removes them when there is no on-topic photo. Hand-added images stay.
with_credit(...) keeps one "ছবি: …" credit line at the end of the post for CC photos.
"""
import os
import re
import tempfile

import requests

from modules import feature_image as fi
from modules.photos import wp_upload

_TIMEOUT = 60
_CREDIT = re.compile(r'\s*<p class="ab-photo-credit"[^>]*>.*?</p>', re.S)
_IMG = re.compile(r"<img\b[^>]*>", re.I)
_FIG = re.compile(r"<figure\b[^>]*>\s*(?:<a\b[^>]*>\s*)?(<img\b[^>]*>)\s*(?:</a>\s*)?(?:<figcaption\b.*?</figcaption>\s*)?</figure>", re.I | re.S)


def _stem(url: str) -> str:
    """'…/uploads/2026/10/photo-3-1024x576.jpg' → 'photo-3' (size variants share a stem)."""
    name = (url or "").split("?")[0].rsplit("/", 1)[-1]
    return re.sub(r"(-\d+x\d+|-scaled|-e\d+)*\.(jpe?g|png|webp)$", "", name, flags=re.I).lower()


def stock_library(base: str, headers: dict) -> tuple[set, set]:
    """(source ids already used, file stems of every pipeline-placed stock photo)."""
    used, stems = set(), set()
    for page in range(1, 40):
        try:
            r = requests.get(f"{base}/wp-json/wp/v2/media", headers=headers, timeout=_TIMEOUT,
                             params={"per_page": 100, "page": page, "search": "photo-source:", "_fields": "description,source_url"})
        except requests.RequestException:
            break
        if r.status_code >= 400 or not r.json():
            break
        for m in r.json():
            ids = re.findall(r"photo-source:(\S+?)(?:<|\s|$)", (m.get("description") or {}).get("rendered", ""))
            used.update(ids)
            if any(not i.startswith("commons:") and not i.startswith("card:") for i in ids):
                stems.add(_stem(m.get("source_url", "")))
    return used, stems


def upload_file(base: str, headers: dict, path: str, name: str, alt: str, source_id: str) -> tuple[int, str] | None:
    data = open(path, "rb").read()
    fname = (re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "card")[:60]
    try:
        up = requests.post(f"{base}/wp-json/wp/v2/media", headers={
            **headers, "Content-Disposition": f'attachment; filename="{fname}.png"', "Content-Type": "image/png"},
            data=data, timeout=120)
        up.raise_for_status()
        j = up.json()
        requests.post(f"{base}/wp-json/wp/v2/media/{j['id']}", headers={**headers, "Content-Type": "application/json"},
                      json={"alt_text": alt, "title": alt, "description": f"photo-source:{source_id}"}, timeout=_TIMEOUT)
        return j["id"], j.get("source_url", "")
    except Exception:
        return None


def _set_caption(base: str, headers: dict, media_id: int, caption: str):
    try:
        requests.post(f"{base}/wp-json/wp/v2/media/{media_id}", headers={**headers, "Content-Type": "application/json"},
                      json={"caption": caption}, timeout=_TIMEOUT)
    except requests.RequestException:
        pass


def featured(base: str, headers: dict, title: str, slug: str, used: set, site_name: str, name: str) -> tuple[int, str, dict | None] | None:
    """(media_id, url, photo-or-None). Photo dicts carry the CC credit."""
    country = fi.detect_country(title, slug)
    if country:
        for p in fi.country_photos(country, used, 3):
            up = wp_upload(base, headers, p["url"], name, alt=title, source_id=p["source_id"])
            if up:
                used.add(p["source_id"])
                _set_caption(base, headers, up[0], f'ছবি: <a href="{p["page"]}">{p["credit"]}</a>')
                return up[0], up[1], p
    with tempfile.TemporaryDirectory() as d:
        path = fi.text_card(title, site_name, os.path.join(d, "card.png"), country[1] if country else "", fi.kicker_for(title))
        up = upload_file(base, headers, path, name, alt=title, source_id=f"card:{slug[:60]}")
    return (up[0], up[1], None) if up else None


def fix_inline(base: str, headers: dict, html: str, title: str, slug: str, used: set, stock_stems: set | None, name: str) -> tuple[str, int, int, list]:
    """Returns (html, replaced, removed, photos used). stock_stems=None targets every <img>
    (a freshly generated article, whose images are only prompts)."""
    country = fi.detect_country(title, slug)
    src = lambda tag: (re.search(r'src="([^"]*)"', tag) or [None, ""])[1]
    targets = [m for m in _IMG.finditer(html) if stock_stems is None or _stem(src(m.group(0))) in stock_stems]
    if not targets:
        return html, 0, 0, []
    pool = fi.country_photos(country, used, min(len(targets), 1)) if country else []  # one photo, not five skylines
    replaced, removed, placed = 0, 0, []

    def swap(tag: str) -> str | None:
        nonlocal replaced
        while pool:
            p = pool.pop(0)
            up = wp_upload(base, headers, p["url"], f"{name}-{replaced + 2}", alt=title, source_id=p["source_id"])
            if up:
                used.add(p["source_id"])
                placed.append(p)
                replaced += 1
                new = re.sub(r'\s(?:srcset|sizes|width|height|class)="[^"]*"', "", tag)
                new = re.sub(r'alt="[^"]*"', f'alt="{title}"', new) if "alt=" in new else new.replace("<img", f'<img alt="{title}"', 1)
                return re.sub(r'src="[^"]*"', f'src="{up[1]}"', new, count=1)
        return None

    target_tags = {m.group(0) for m in targets}

    def fig(m):
        nonlocal removed
        if m.group(1) not in target_tags:
            return m.group(0)
        new = swap(m.group(1))
        if new:  # the old caption described the stock photo, not the new one
            return re.sub(r"<figcaption.*?</figcaption>", "", m.group(0).replace(m.group(1), new), flags=re.S)
        removed += 1
        return ""

    html = _FIG.sub(fig, html)

    def bare(m):
        nonlocal removed
        if m.group(0) not in target_tags:
            return m.group(0)
        new = swap(m.group(0))
        if new:
            return new
        removed += 1
        return ""

    html = _IMG.sub(bare, html)
    return html, replaced, removed, placed


def with_credit(html: str, photos: list) -> str:
    """One credit line for every Commons photo in the post (CC BY / BY-SA need it)."""
    html = _CREDIT.sub("", html).rstrip()
    if not photos:
        return html
    seen, parts = set(), []
    for p in photos:
        if p["page"] not in seen:
            seen.add(p["page"])
            parts.append(f'<a href="{p["page"]}" rel="noopener" target="_blank">{p["credit"]}</a>')
    return html + f'\n<p class="ab-photo-credit" style="font-size:12px;opacity:.7">ছবি: {"; ".join(parts)}</p>'
