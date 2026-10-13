"""Real-web grounding for the research and competitor agents.

DuckDuckGo's HTML endpoint now answers bots with a captcha, so research_topic() had been
silently writing from model memory (how a 2024 "28 Schengen countries" fact reached a 2026
article). Sources, best first, all free:

  serp(query)  → top results [{title, url, snippet}]
     1. Google Programmable Search JSON API — GOOGLE_CSE_KEY + GOOGLE_CSE_CX (100 queries/day free)
     2. Brave Search API — BRAVE_API_KEY (free tier)
     3. DuckDuckGo HTML — works from some IPs, returns [] on the captcha
  wiki(query)  → [{title, url, snippet}] from Wikipedia search + intro extracts (no key; any
                 language edition via lang="bn")
Every call is best-effort and never raises.
"""
import os
import re

import requests

_UA = {"User-Agent": "AutoBlogResearch/1.0 (https://countly.net; research grounding)"}
_TAG = re.compile(r"<[^>]+>")


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", _TAG.sub(" ", s or "")).strip()


def _google(query: str, n: int) -> list[dict]:
    key, cx = os.getenv("GOOGLE_CSE_KEY"), os.getenv("GOOGLE_CSE_CX")
    if not (key and cx):
        return []
    try:
        j = requests.get("https://www.googleapis.com/customsearch/v1", params={"key": key, "cx": cx, "q": query, "num": min(n, 10)},
                         timeout=15).json()
        return [{"title": i.get("title", ""), "url": i.get("link", ""), "snippet": _clean(i.get("snippet", ""))} for i in j.get("items", [])]
    except Exception:
        return []


def _brave(query: str, n: int) -> list[dict]:
    key = os.getenv("BRAVE_API_KEY")
    if not key:
        return []
    try:
        j = requests.get("https://api.search.brave.com/res/v1/web/search", params={"q": query, "count": min(n, 20)},
                         headers={"X-Subscription-Token": key, "Accept": "application/json"}, timeout=15).json()
        return [{"title": i.get("title", ""), "url": i.get("url", ""), "snippet": _clean(i.get("description", ""))}
                for i in (j.get("web") or {}).get("results", [])]
    except Exception:
        return []


def _ddg(query: str, n: int) -> list[dict]:
    try:
        r = requests.get("https://html.duckduckgo.com/html/", params={"q": query},
                         headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}, timeout=12)
        if r.status_code != 200 or "bots use DuckDuckGo" in r.text:
            return []
        titles = re.findall(r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', r.text, re.S)
        snips = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', r.text, re.S)
        return [{"title": _clean(t), "url": u, "snippet": _clean(s)} for (u, t), s in zip(titles, snips)][:n]
    except Exception:
        return []


def serp(query: str, n: int = 8) -> list[dict]:
    """Top web results for the query from the first source that answers."""
    for source in (_google, _brave, _ddg):
        hits = source(query, n)
        if hits:
            return hits[:n]
    return []


def wiki(query: str, n: int = 3, lang: str = "en") -> list[dict]:
    """Wikipedia pages matching the query with their intro text (encyclopedic facts, no key)."""
    try:
        j = requests.get(f"https://{lang}.wikipedia.org/w/api.php", headers=_UA, timeout=20, params={
            "action": "query", "format": "json", "generator": "search", "gsrsearch": query, "gsrlimit": n,
            "prop": "extracts|info", "exintro": 1, "explaintext": 1, "exsentences": 6, "inprop": "url"}).json()
        pages = sorted(((j.get("query") or {}).get("pages") or {}).values(), key=lambda p: p.get("index", 99))
        return [{"title": p.get("title", ""), "url": p.get("fullurl", ""), "snippet": _clean(p.get("extract", ""))[:900]}
                for p in pages if p.get("extract")]
    except Exception:
        return []


def source_name() -> str:
    return "google" if os.getenv("GOOGLE_CSE_KEY") and os.getenv("GOOGLE_CSE_CX") else "brave" if os.getenv("BRAVE_API_KEY") else "duckduckgo"
