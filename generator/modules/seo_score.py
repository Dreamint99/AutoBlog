"""Deterministic SEO scorer — the 'SEO score' agent.

Rank-Math-style on-page checks, scored 0-100 with the exact list of failing
checks so the quality-boost agent knows what to fix. No LLM, so it's fast,
free and reproducible. The pipeline loops boost→score until score >= target
(default 95) or it runs out of tries.
"""
import re

_TAG = re.compile(r"<[^>]+>")


def _text(html: str) -> str:
    return _TAG.sub(" ", html or "")


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").lower()).strip()


def _count(needle: str, hay: str) -> int:
    needle = _norm(needle)
    if not needle:
        return 0
    return len(re.findall(re.escape(needle), _norm(hay)))


# check_id → (weight, human description). Weights sum to 100.
CHECKS = {
    "kw_in_title":        (12, "focus keyword in the title"),
    "kw_title_start":     (6,  "title starts with (or near-front) the focus keyword"),
    "kw_in_meta_title":   (8,  "focus keyword in the meta title"),
    "kw_in_meta_desc":    (8,  "focus keyword in the meta description"),
    "kw_in_first_para":   (10, "focus keyword in the first sentence/paragraph"),
    "kw_in_heading":      (10, "focus keyword in at least one H2/H3"),
    "kw_in_slug":         (5,  "focus keyword in the URL slug"),
    "kw_in_image_alt":    (5,  "focus keyword in an image alt text"),
    "kw_density_ok":      (6,  "keyword density between 0.4% and 3%"),
    "word_count_ok":      (10, "at least 1500 words"),
    "has_outbound_link":  (5,  "at least one outbound authority link"),
    "has_internal_link":  (4,  "at least one internal link"),
    "has_table":          (4,  "at least one comparison table"),
    "has_faq":            (4,  "an FAQ section"),
    "enough_headings":    (5,  "at least 3 H2 headings"),
    "title_len_ok":       (4,  "title length 30-65 chars"),
    "meta_desc_len_ok":   (4,  "meta description 120-160 chars"),
}


def evaluate(article: dict) -> dict:
    """Return {'score': int, 'passed': [...], 'failed': [(id, desc), ...]}."""
    kw = _norm(article.get("keyword", ""))
    title = article.get("title", "") or ""
    body = article.get("body_html", "") or ""
    body_text = _text(body)
    words = len(body_text.split())
    meta_title = article.get("meta_title", "") or ""
    meta_desc = article.get("meta_description", "") or ""
    slug = article.get("slug", "") or ""

    headings = re.findall(r"<h[23][^>]*>(.*?)</h[23]>", body, re.I | re.S)
    first_chunk = " ".join(body_text.split()[:60])
    alts = " ".join(re.findall(r'alt="([^"]*)"', body, re.I))
    kw_hits = _count(kw, body_text)
    density = (kw_hits / words * 100) if words else 0
    slug_kw = re.sub(r"[^a-z0-9]+", "-", kw)
    # A long exact-match phrase (e.g. "coffee consumption by country") naturally
    # repeats far less than a 1-2 word keyword, so scale the density floor by phrase
    # length; also accept a healthy raw count as a pass for long-tail keywords.
    kw_words = len(kw.split()) if kw else 1
    density_floor = 0.4 if kw_words <= 2 else 0.12
    density_ok = (density_floor <= density <= 3.5) or (kw_hits >= max(3, words // 400))

    results = {
        "kw_in_title":       bool(kw) and _count(kw, title) > 0,
        "kw_title_start":    bool(kw) and _norm(title).find(kw) >= 0 and _norm(title).find(kw) <= 15,
        "kw_in_meta_title":  bool(kw) and _count(kw, meta_title) > 0,
        "kw_in_meta_desc":   bool(kw) and _count(kw, meta_desc) > 0,
        "kw_in_first_para":  bool(kw) and _count(kw, first_chunk) > 0,
        "kw_in_heading":     bool(kw) and any(_count(kw, h) > 0 for h in headings),
        "kw_in_slug":        bool(kw) and (slug_kw in slug or kw.replace(" ", "-") in slug),
        "kw_in_image_alt":   bool(kw) and _count(kw, alts) > 0,
        "kw_density_ok":     density_ok,
        "word_count_ok":     words >= 1500,
        "has_outbound_link": bool(re.search(r'<a[^>]+href="https?://(?!(?:[^"]*\b)?(?:localhost|countly\.net|walvi\.io|infkey\.com|ninetymins\.com))', body, re.I)),
        "has_internal_link": bool(re.search(r'<a[^>]+href="(/|https?://[^"]*/s/)', body, re.I)),
        "has_table":         "<table" in body.lower(),
        "has_faq":           len(article.get("faq") or []) > 0,
        "enough_headings":   len(re.findall(r"<h2", body, re.I)) >= 3,
        "title_len_ok":      30 <= len(title) <= 65,
        "meta_desc_len_ok":  120 <= len(meta_desc) <= 160,
    }

    total = sum(w for w, _ in CHECKS.values())
    raw = sum(w for cid, (w, _) in CHECKS.items() if results.get(cid))
    score = round(raw / total * 100)
    failed = [(cid, CHECKS[cid][1]) for cid in CHECKS if not results.get(cid)]
    passed = [cid for cid in CHECKS if results.get(cid)]
    return {"score": score, "passed": passed, "failed": failed,
            "words": words, "density": round(density, 2)}
