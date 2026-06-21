"""Google Trends keyword discovery — best-effort, free, unofficial (pytrends).

Pulls *rising* + *top* related queries for the site's niche seeds in Bangladesh,
so title planning can prioritise terms that have real, current search interest
(the "viral / high-rank keyword" goal) instead of pure LLM guesses.

Google Trends has no official API; pytrends scrapes it and is rate-limited
(HTTP 429), and cloud IPs (e.g. GitHub Actions) are often blocked outright.
Every failure degrades gracefully to [] so generation never breaks — the title
planner then falls back to its LLM keyword ideas.
"""
import re

# Split a niche string on commas, Bengali danda (।), and semicolons.
_SEED_SPLIT = re.compile(r"[,।;]")


def _seeds(site: dict, limit: int = 6) -> list:
    # Prefer curated short, high-interest seeds (site config); else fall back to
    # the niche string. Long multi-word phrases rarely have Trends data, so keep
    # seeds to ~1-2 words.
    curated = site.get("trend_seeds")
    if isinstance(curated, list) and curated:
        return [s.strip() for s in curated if s.strip()][:limit]
    raw = _SEED_SPLIT.split(site.get("niche", ""))
    seeds = [s.strip() for s in raw if len(s.strip()) >= 3]
    return seeds[:limit]


def hot_keywords(site: dict, max_terms: int = 12, geo: str = "BD") -> list:
    """Return up to max_terms trending/related search queries for the niche, or []."""
    try:
        from pytrends.request import TrendReq
    except Exception:
        return []
    seeds = _seeds(site)
    if not seeds:
        return []

    out: list[str] = []
    seen: set[str] = set()
    try:
        py = TrendReq(hl="bn-BD", tz=360, timeout=(10, 25))
    except Exception:
        return []

    for seed in seeds:
        if len(out) >= max_terms:
            break
        try:
            py.build_payload([seed], geo=geo, timeframe="today 3-m")
            related = py.related_queries().get(seed) or {}
            for kind in ("rising", "top"):
                df = related.get(kind)
                if df is None:
                    continue
                for q in df["query"].tolist()[:6]:
                    q = str(q).strip()
                    k = q.lower()
                    if q and k not in seen:
                        seen.add(k)
                        out.append(q)
        except Exception:
            continue  # this seed failed (429/empty) — try the next one
    return out[:max_terms]
