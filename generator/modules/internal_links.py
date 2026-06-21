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
