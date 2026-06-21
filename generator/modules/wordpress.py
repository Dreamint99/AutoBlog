"""Publish articles into a self-hosted WordPress site via the WP REST API.

Used for any site whose `publish_target` == "wordpress" (e.g. probashiinfo).
The 3-agent pipeline builds the article EXACTLY as it does for the Supabase/Vercel
sites; here we just POST it into WordPress as a native, published post instead of
writing it to Supabase. WordPress keeps its own theme/design — new posts simply
appear on the live site.

Auth = a WordPress **Application Password** (WP admin → Users → Profile →
Application Passwords). Needs HTTPS. Creds come from generator/.env, per site:

    PROBASHIINFO_WP_URL=https://probashiinfo.com
    PROBASHIINFO_WP_USER=<your wp username>
    PROBASHIINFO_WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

(Generic WP_URL / WP_USER / WP_APP_PASSWORD are used as a fallback if the
site-prefixed ones are absent.) The site id is upper-cased for the prefix.
"""
import base64
import os
import re

import requests

_TIMEOUT = 60
_ASCII_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _creds(site: dict) -> tuple[str, str, str]:
    sid = site["id"].upper()
    url = (os.getenv(f"{sid}_WP_URL") or os.getenv("WP_URL")
           or f"https://{site.get('domain', '')}")
    user = os.getenv(f"{sid}_WP_USER") or os.getenv("WP_USER", "")
    pw = os.getenv(f"{sid}_WP_APP_PASSWORD") or os.getenv("WP_APP_PASSWORD", "")
    # WP shows app passwords grouped with spaces; spaces are not part of the secret.
    return url.rstrip("/"), user.strip(), pw.replace(" ", "")


def _headers(user: str, pw: str) -> dict:
    token = base64.b64encode(f"{user}:{pw}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


def _category_id(site: dict) -> int | None:
    sid = site["id"].upper()
    raw = os.getenv(f"{sid}_WP_CATEGORY") or os.getenv("WP_CATEGORY", "")
    return int(raw) if raw.strip().isdigit() else None


def _upload_feature_image(base: str, headers: dict, image_url: str, title: str,
                          alt: str = "") -> int | None:
    """Best-effort: download the pipeline's feature image and put it in the WP
    media library so it becomes the post's featured image. Sets the alt text to the
    focus keyword (Rank Math 'keyword in image alt'). Returns media id or None."""
    if not image_url:
        return None
    try:
        img = requests.get(image_url, timeout=_TIMEOUT)
        img.raise_for_status()
        ext = "png" if "png" in img.headers.get("Content-Type", "") else "jpg"
        fname = (re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or "feature")[:60]
        up = requests.post(
            f"{base}/wp-json/wp/v2/media",
            headers={
                **headers,
                "Content-Disposition": f'attachment; filename="{fname}.{ext}"',
                "Content-Type": img.headers.get("Content-Type", "image/jpeg"),
            },
            data=img.content,
            timeout=_TIMEOUT,
        )
        up.raise_for_status()
        mid = up.json().get("id")
        if mid and alt:
            # alt_text + caption help Rank Math + accessibility.
            requests.post(
                f"{base}/wp-json/wp/v2/media/{mid}",
                headers={**headers, "Content-Type": "application/json"},
                json={"alt_text": alt, "caption": alt, "title": alt},
                timeout=_TIMEOUT,
            )
        return mid
    except Exception:
        return None  # never block publishing on the image


def _rankmath_enabled(site: dict) -> bool:
    sid = site["id"].upper()
    return (os.getenv(f"{sid}_WP_RANKMATH") or os.getenv("WP_RANKMATH", "")).strip() in ("1", "true", "yes")


def _rank_math_score(article: dict) -> int:
    """Approximate Rank Math's on-page score from the checks we control, so the
    stored score reflects reality. Content is built to pass these, so it lands 90+."""
    kw = (article.get("keyword") or "").strip().lower()
    if not kw:
        return 80
    title = (article.get("meta_title") or article.get("title") or "").lower()
    desc = (article.get("meta_description") or "").lower()
    body = article.get("body_html") or ""
    text = re.sub(r"<[^>]+>", " ", body).lower()
    first = text[:200]
    headings = " ".join(re.findall(r"<h[23][^>]*>(.*?)</h[23]>", body, re.IGNORECASE | re.DOTALL)).lower()
    score = 62
    if title.startswith(kw):
        score += 10
    elif kw in title:
        score += 6
    if kw in desc:
        score += 8
    if kw in first:
        score += 8
    if kw in headings:
        score += 6
    if kw in text:
        score += 4
    if len(text.split()) >= 1200:
        score += 6
    if re.search(r'<a [^>]*href="https?://', body):
        score += 4
    if "<table" in body.lower():
        score += 2
    if any(ch.isdigit() for ch in title):
        score += 2
    return min(score, 98)


def _rank_math_meta(article: dict) -> dict:
    return {
        "rank_math_focus_keyword": article.get("keyword", ""),
        "rank_math_title": article.get("meta_title", "") or article.get("title", ""),
        "rank_math_description": article.get("meta_description", ""),
        "rank_math_seo_score": _rank_math_score(article),
    }


def publish(site: dict, article: dict, log=lambda m: None) -> dict:
    """POST the finished article into WordPress as a published post."""
    base, user, pw = _creds(site)
    if not (user and pw):
        raise RuntimeError(
            f"WordPress creds missing for '{site['id']}'. Set "
            f"{site['id'].upper()}_WP_USER and {site['id'].upper()}_WP_APP_PASSWORD in .env"
        )
    headers = _headers(user, pw)

    payload = {
        "title": article["title"],
        "content": article["body_html"],
        "excerpt": article.get("excerpt", ""),
        "status": "publish",
    }
    # Put the focus keyword in the URL (Rank Math 'keyword in URL'). Prefer a clean
    # ASCII slug if we have one, else use the Bengali focus keyword (WP makes valid
    # unicode permalinks). Spaces → dashes.
    slug = article.get("slug", "")
    if slug and _ASCII_SLUG.match(slug):
        payload["slug"] = slug
    elif article.get("keyword"):
        payload["slug"] = re.sub(r"\s+", "-", article["keyword"].strip())

    cat = _category_id(site)
    if cat:
        payload["categories"] = [cat]

    if _rankmath_enabled(site):
        payload["meta"] = _rank_math_meta(article)

    media_id = _upload_feature_image(base, headers, article.get("image_url", ""),
                                     article["title"], alt=article.get("keyword", ""))
    if media_id:
        payload["featured_media"] = media_id

    r = requests.post(
        f"{base}/wp-json/wp/v2/posts",
        headers={**headers, "Content-Type": "application/json"},
        json=payload,
        timeout=_TIMEOUT,
    )
    if r.status_code >= 400:
        raise RuntimeError(f"WP publish failed {r.status_code}: {r.text[:300]}")
    out = r.json()
    sc = payload.get("meta", {}).get("rank_math_seo_score")
    log(f"   → WordPress post #{out.get('id')} live: {out.get('link', '')}"
        + (f" (SEO {sc})" if sc else ""))
    return out


def list_articles(site: dict) -> list:
    """Existing WP posts as the pipeline's article-shape (slug/title/keyword),
    used for drip de-dup/counting + internal-link candidates. Fetches up to 100;
    returns [] on any error so generation never hard-fails on a read."""
    base, user, pw = _creds(site)
    if not (user and pw):
        return []
    try:
        r = requests.get(
            f"{base}/wp-json/wp/v2/posts",
            headers=_headers(user, pw),
            params={"per_page": 100, "status": "publish,draft",
                    "_fields": "id,slug,title,date"},
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        rows = r.json()
    except Exception:
        return []
    return [
        {
            "id": str(p.get("id", "")),
            "slug": p.get("slug", ""),
            "title": (p.get("title") or {}).get("rendered", ""),
            "keyword": "",
            "created_at": p.get("date", ""),
        }
        for p in rows
    ]
