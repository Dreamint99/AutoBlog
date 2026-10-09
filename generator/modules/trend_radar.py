"""Trend Radar — live, free, keyless trending-keyword discovery for title planning.

Sources (all public, no key, work from GitHub Actions IPs):
  - Google Trends daily RSS per country (term + approx. searches + news headlines)
  - Wikipedia most-viewed articles yesterday (entity interest, en.wikipedia)
  - Hacker News front page (AI / tech sites only)
  - Google Autocomplete on the site's own seeds (real query phrasings = real demand)

An LLM then keeps only what fits the site's niche or a closely related niche, and
turns each into a concrete search keyword + angle. Autocomplete validates that the
keyword is something people actually type. Every step fails soft to [].
"""
import json
import math
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import requests

UA = {"User-Agent": "Mozilla/5.0 (compatible; AutoBlogTrendRadar/1.0)"}
HT = "{https://trends.google.com/trending/rss}"

# Which countries' Google Trends matter for each site (its readers).
DEFAULT_GEOS = {
    "infkey": ["US", "GB", "IN", "CA", "AU", "DE", "SG"],
    "countly": ["US", "GB", "IN", "CA", "AU", "PH", "NG"],
    "ninetymins": ["US", "GB", "IN", "AU", "CA", "NG", "ZA", "PK"],
    "walvi": ["US", "GB", "IN", "PH", "NG", "PK", "AE", "CA"],
}
TECH_SITES = {"infkey", "countly"}


def _traffic(s: str) -> int:
    m = re.match(r"([\d,.]+)\s*([KkMm]?)", s or "")
    if not m:
        return 0
    n = float(m.group(1).replace(",", ""))
    return int(n * {"k": 1e3, "m": 1e6}.get(m.group(2).lower(), 1))


def google_trends(geo: str) -> list[dict]:
    try:
        r = requests.get(f"https://trends.google.com/trending/rss?geo={geo}", headers=UA, timeout=20)
        root = ET.fromstring(r.content)
    except Exception:
        return []
    out = []
    for it in root.iter("item"):
        title = (it.findtext("title") or "").strip()
        if not title:
            continue
        news = [n.findtext(f"{HT}news_item_title") or "" for n in it.findall(f"{HT}news_item")][:2]
        out.append({"term": title, "traffic": _traffic(it.findtext(f"{HT}approx_traffic") or ""), "source": f"google-trends-{geo}", "news": [n for n in news if n]})
    return out


def wikipedia_top(limit: int = 60) -> list[dict]:
    day = datetime.now(timezone.utc) - timedelta(days=1)
    url = f"https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/{day:%Y/%m/%d}"
    try:
        arts = requests.get(url, headers=UA, timeout=20).json()["items"][0]["articles"]
    except Exception:
        return []
    skip = re.compile(r"^(Main_Page|Special:|Wikipedia:|Portal:|File:|Help:|Talk:|Category:|Template:)")
    out = []
    for a in arts:
        if skip.match(a["article"]):
            continue
        # Wikipedia views are ~10x Google searches for the same entity on a busy day; keep scale comparable.
        out.append({"term": a["article"].replace("_", " "), "traffic": int(a["views"] / 40), "source": "wikipedia", "news": []})
        if len(out) >= limit:
            break
    return out


def hacker_news(limit: int = 30) -> list[dict]:
    try:
        hits = requests.get("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=50", headers=UA, timeout=20).json()["hits"]
    except Exception:
        return []
    hits.sort(key=lambda h: h.get("points") or 0, reverse=True)
    return [{"term": h["title"], "traffic": int((h.get("points") or 0) * 20), "source": "hackernews", "news": []} for h in hits[:limit] if h.get("title")]


def autocomplete(q: str, hl: str = "en") -> list[str]:
    try:
        r = requests.get(f"https://suggestqueries.google.com/complete/search?client=firefox&hl={hl}&q={quote(q)}", headers=UA, timeout=10)
        return [s for s in r.json()[1] if isinstance(s, str)]
    except Exception:
        return []


def seed_demand(site: dict, max_seeds: int = 8) -> list[dict]:
    """Autocomplete on the site's seeds: the long-tail queries Google itself suggests."""
    seeds = site.get("trend_seeds") or [s.strip() for s in re.split(r"[,;]", site.get("niche", "")) if 3 <= len(s.strip()) <= 40]
    out, seen = [], set()
    year = datetime.now(timezone.utc).year
    for s in seeds[:max_seeds]:
        for q in (s, f"{s} {year}"):
            for i, sug in enumerate(autocomplete(q)[:6]):
                k = sug.lower()
                if k in seen:
                    continue
                seen.add(k)
                # Higher-ranked suggestions are more-searched; this is a relative signal only.
                out.append({"term": sug, "traffic": 200 - i * 25, "source": "autocomplete", "news": []})
    return out


def gather(site: dict) -> list[dict]:
    geos = site.get("trend_geos") or DEFAULT_GEOS.get(site["id"], ["US", "GB", "IN"])
    cands: list[dict] = []
    for g in geos:
        cands += google_trends(g)
    cands += wikipedia_top()
    if site["id"] in TECH_SITES:
        cands += hacker_news()
    cands += seed_demand(site)
    # merge duplicates (same term trending in several countries → add up)
    merged: dict[str, dict] = {}
    for c in cands:
        k = c["term"].lower().strip()
        if k in merged:
            merged[k]["traffic"] += c["traffic"]
            merged[k]["source"] += f",{c['source']}"
        else:
            merged[k] = dict(c)
    return sorted(merged.values(), key=lambda c: c["traffic"], reverse=True)


def _covered(term: str, avoid: list[str]) -> bool:
    words = {w for w in re.findall(r"[a-z0-9]+", term.lower()) if len(w) > 3}
    if not words:
        return False
    for a in avoid:
        aw = set(re.findall(r"[a-z0-9]+", (a or "").lower()))
        if len(words & aw) >= max(2, math.ceil(len(words) * 0.8)):
            return True
    return False


def _heuristic(site: dict, cands: list[dict], max_out: int, avoid: list[str]) -> list[dict]:
    """No-LLM fallback: keep terms sharing words with the niche/seeds."""
    vocab = set(re.findall(r"[a-z0-9]{4,}", (site.get("niche", "") + " " + " ".join(site.get("trend_seeds") or [])).lower()))
    out = []
    for c in cands:
        hits = len(set(re.findall(r"[a-z0-9]{4,}", c["term"].lower())) & vocab)
        if hits and not _covered(c["term"], avoid):
            out.append({"keyword": c["term"], "angle": "", "why": c["term"], "traffic": c["traffic"], "source": c["source"],
                        "relevance": min(10, 5 + hits), "validated": c["source"] == "autocomplete", "suggest": [],
                        "score": round(hits * math.log10(c["traffic"] + 10), 2)})
    out.sort(key=lambda x: x["score"], reverse=True)
    return out[:max_out]


def hot_topics(site: dict, max_out: int = 8, avoid: list[str] | None = None, log=print) -> list[dict]:
    """Trending topics that fit this site, best first:
    [{keyword, angle, why, traffic, source, score}]"""
    try:
        from modules.llm import have_llm, chat
        from modules.json_utils import parse_llm_json
    except Exception:
        return []
    allc = gather(site)
    if not allc:
        return []
    if not have_llm():
        return _heuristic(site, allc, max_out, avoid or [])
    # Balanced shortlist: the top of EACH source, so one loud feed (Wikipedia
    # entertainment) can't crowd out the niche's own trends and autocomplete demand.
    quota = {"google-trends": 60, "wikipedia": 30, "hackernews": 25, "autocomplete": 60}
    used: dict[str, int] = {}
    cands = []
    for c in allc:
        src = c["source"].split(",")[0].rsplit("-", 1)[0] if c["source"].startswith("google-trends") else c["source"].split(",")[0]
        if used.get(src, 0) < quota.get(src, 20):
            used[src] = used.get(src, 0) + 1
            cands.append(c)
    lines = []
    for i, c in enumerate(cands):
        news = f" — news: {' | '.join(c['news'])}" if c["news"] else ""
        lines.append(f"{i}. {c['term']} (~{c['traffic']} searches, {c['source']}){news}")
    system = (
        "You are a newsroom SEO editor. From a list of terms trending RIGHT NOW, pick the ones a specific "
        "website can credibly cover — its exact niche OR a closely related niche its readers also care about. "
        "Reject celebrity gossip, crime, deaths, politics and anything off-topic. Never invent facts. Return ONLY JSON."
    )
    user = (
        f"Website: {site['name']} — niche: {site['niche']}\nAudience: {site['audience']}\n\n"
        "Trending now:\n" + "\n".join(lines) + "\n\n"
        f"Pick up to {max_out * 2} items. For each return: index, relevance 0-10 (10 = core niche, 6 = related niche "
        "readers search too), keyword (the exact query people type on Google about this, in English, 2-7 words), "
        'angle (one specific article idea for this site). JSON: {"picks": [{"i": 0, "relevance": 9, "keyword": "...", "angle": "..."}]}'
    )
    try:
        data = parse_llm_json(chat(system, user, temperature=0.3, max_tokens=1800, json_mode=True))
        picks = data.get("picks", []) if isinstance(data, dict) else []
    except Exception as e:
        log(f"trend_radar: LLM pick failed ({e})")
        return []
    avoid = avoid or []
    out = []
    for p in picks:
        try:
            c = cands[int(p["i"])]
            rel = float(p.get("relevance", 0))
            kw = str(p.get("keyword") or c["term"]).strip()
        except Exception:
            continue
        if rel < 6 or not kw or _covered(kw, avoid):
            continue
        sugg = autocomplete(kw)
        validated = any(kw.lower() in s.lower() or s.lower().startswith(kw.lower()[: max(6, len(kw) // 2)]) for s in sugg)
        # Fresh, measured trends beat evergreen autocomplete ideas (news spikes go viral).
        src = c["source"].split(",")[0]
        fresh = 1.6 if src.startswith("google-trends") else 1.3 if src == "hackernews" else 1.2 if src == "wikipedia" else 1.0
        score = rel * math.log10(c["traffic"] + 10) * fresh * (1.15 if validated else 1.0)
        out.append({
            "keyword": kw,
            "angle": str(p.get("angle") or "").strip(),
            "why": c["term"],
            "traffic": c["traffic"],
            "source": c["source"],
            "relevance": rel,
            "validated": validated,
            "suggest": sugg[:5],
            "score": round(score, 2),
        })
    out.sort(key=lambda x: x["score"], reverse=True)
    return out[:max_out]


if __name__ == "__main__":
    import os
    import sys

    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from modules import store

    sid = sys.argv[1] if len(sys.argv) > 1 else "infkey"
    site = next(s for s in store.load_sites() if s["id"] == sid)
    if "--raw" in sys.argv:
        for c in gather(site)[:40]:
            print(c["traffic"], c["source"], c["term"])
    else:
        print(json.dumps(hot_topics(site), indent=1, ensure_ascii=False))
