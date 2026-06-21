"""SEO post-processing — agent 4. Pure code, no API.

Builds slug, meta title/description, JSON-LD Article+FAQ schema, reading time,
and appends a Key-Takeaways box + FAQ section to the body HTML.
"""
import html
import re

try:
    from slugify import slugify as _slugify
except Exception:
    _slugify = None


def make_slug(title: str, fallback_id: str = "") -> str:
    if _slugify:
        s = _slugify(title, max_length=70)
    else:
        s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return s or f"post-{fallback_id}"[:70]


def meta_title(title: str, site_name: str) -> str:
    t = title.strip()
    suffix = f" | {site_name}"
    if len(t) + len(suffix) <= 60:
        return t + suffix
    return t[:60]


def meta_description(excerpt: str, body_html: str) -> str:
    text = (excerpt or "").strip()
    if not text:
        text = re.sub(r"<[^>]+>", " ", body_html)
        text = re.sub(r"\s+", " ", text).strip()
    return (text[:152] + "…") if len(text) > 155 else text


def reading_time(body_html: str) -> int:
    words = len(re.sub(r"<[^>]+>", " ", body_html).split())
    return max(1, round(words / 220))


def word_count(body_html: str) -> int:
    return len(re.sub(r"<[^>]+>", " ", body_html).split())


def takeaways_html(takeaways: list) -> str:
    if not takeaways:
        return ""
    items = "".join(f"<li>{html.escape(str(t))}</li>" for t in takeaways)
    return f'<div class="key-takeaways"><h2>Key takeaways</h2><ul>{items}</ul></div>'


def faq_html(faq: list) -> str:
    if not faq:
        return ""
    blocks = []
    for item in faq:
        q = html.escape(str(item.get("q", "")))
        a = html.escape(str(item.get("a", "")))
        blocks.append(f"<div class='faq-item'><h3>{q}</h3><p>{a}</p></div>")
    return f"<section class='faq'><h2>Frequently asked questions</h2>{''.join(blocks)}</section>"


def assemble_body(article: dict) -> str:
    """Body + takeaways box (top) + FAQ section (bottom)."""
    parts = []
    tk = takeaways_html(article.get("key_takeaways"))
    if tk:
        parts.append(tk)
    parts.append(article.get("body_html", ""))
    fq = faq_html(article.get("faq"))
    if fq:
        parts.append(fq)
    return "\n".join(parts)


def json_ld(article: dict, site: dict) -> dict:
    """Schema.org Article + (optional) FAQPage, ready to drop in a <script type=application/ld+json>."""
    graph = [{
        "@type": "Article",
        "headline": article["title"],
        "description": article["meta_description"],
        "image": article.get("image_url", ""),
        "datePublished": article["created_at"],
        "dateModified": article["created_at"],
        "author": {"@type": "Organization", "name": site["name"]},
        "publisher": {"@type": "Organization", "name": site["name"]},
        "keywords": ", ".join(article.get("tags", [])),
    }]
    faq = article.get("faq") or []
    if faq:
        graph.append({
            "@type": "FAQPage",
            "mainEntity": [{
                "@type": "Question",
                "name": item.get("q", ""),
                "acceptedAnswer": {"@type": "Answer", "text": item.get("a", "")},
            } for item in faq],
        })
    return {"@context": "https://schema.org", "@graph": graph}
