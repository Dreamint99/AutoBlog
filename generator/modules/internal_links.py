"""Internal linking (the SEO-safe form of 'backlinks').

Links keyword phrases in a new article to existing articles on the SAME site,
using clean production URLs (/slug). Only touches text, never inside tags/anchors.

NOTE on external backlinks: automated external backlink building = Google "link
scheme" risk and is deliberately NOT done here. Internal linking is the safe,
effective play; earn external links with outreach/quality, not automation.
"""
import re


def apply_internal_links(body_html: str, candidates: list, max_links: int = 4,
                         explicit_phrases: list | None = None) -> str:
    """candidates: [{slug, title, keyword}] of other posts on the same site."""
    used = 0
    # Prefer linking the optimizer's suggested phrases, then candidate keywords.
    ranked = sorted(candidates, key=lambda c: -len((c.get("keyword") or c.get("title") or "")))
    for c in ranked:
        if used >= max_links:
            break
        kw = (c.get("keyword") or c.get("title") or "").strip()
        if len(kw) < 4:
            continue
        # match kw inside a text node (between '>' and '<'), not already linked
        pat = re.compile(r"(>[^<]*?)(" + re.escape(kw) + r")", re.IGNORECASE)
        new, n = pat.subn(lambda m: f'{m.group(1)}<a href="/{c["slug"]}">{m.group(2)}</a>',
                          body_html, count=1)
        if n:
            body_html = new
            used += 1
    return body_html


# First path segments the Next sites serve besides article slugs (web/src/app/s/[site]/*, feeds, public/).
SITE_ROUTES = {
    "about", "api", "bangladesh-map", "best-ai-tools", "calculators", "card", "compare", "contact",
    "countries", "country", "cricket", "crypto", "currency-converter", "disclaimer", "guides", "jobs",
    "match", "models", "passport", "passport-index", "pin", "privacy", "scores", "search", "terms",
    "tools", "top10", "topic", "travel-map", "visa-check", "visa-checker", "visit-bangladesh",
    "s", "og", "brand", "geo", "coxsbazar", "tanguar", "icon", "rss.xml", "pins.xml", "llms.txt",
    "sitemap.xml", "robots.txt",
}


def drop_dead_internal_links(body_html: str, valid_slugs, domain: str = "") -> str:
    """Unwrap <a> tags that point at this site but at no page it has (the writer model sometimes
    invents /blog/..., /statistics/... or slugs of articles that were never written). The anchor
    text stays; only the link goes, so readers and crawlers never hit a 404."""
    valid = set(valid_slugs)
    dom = re.escape(domain.lower().removeprefix("www.")) if domain else None

    def dead(href: str) -> bool:
        if href.startswith("/") and not href.startswith("//"):
            path = href
        elif dom and re.match(rf"https?://(www\.)?{dom}(/|$)", href, re.I):
            path = re.sub(r"^https?://[^/]+", "", href)
        else:
            return False
        path = path.split("#")[0].split("?")[0].strip("/")
        if not path:
            return False
        first = path.split("/")[0]
        return first not in valid and first not in SITE_ROUTES

    return re.sub(r'<a\b[^>]*\bhref="([^"]*)"[^>]*>(.*?)</a>',
                  lambda m: m.group(2) if dead(m.group(1)) else m.group(0), body_html, flags=re.S | re.I)
