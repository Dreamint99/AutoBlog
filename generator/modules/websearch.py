"""Real-web grounding for the research and competitor agents.

DuckDuckGo's HTML endpoint now answers bots with a captcha, so research_topic() had been
silently writing from model memory (how a 2024 "28 Schengen countries" fact reached a 2026
article). Sources, best first, all free:

  serp(query)  → top results [{title, url, snippet}]
     1. Google Programmable Search JSON API — GOOGLE_CSE_KEY + GOOGLE_CSE_CX (100 queries/day free)
     2. serper.dev Google results — SERPER_API_KEY (2,500 free queries)
     3. Brave Search API — BRAVE_API_KEY (free tier)
     4. DuckDuckGo HTML — works from some IPs, returns [] on the captcha
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


def _serper(query: str, n: int) -> list[dict]:
    """Google results via serper.dev — SERPER_API_KEY (2,500 free queries, no card)."""
    key = os.getenv("SERPER_API_KEY")
    if not key:
        return []
    try:
        j = requests.post("https://google.serper.dev/search", json={"q": query, "num": min(n, 10)},
                          headers={"X-API-KEY": key}, timeout=15).json()
        return [{"title": i.get("title", ""), "url": i.get("link", ""), "snippet": _clean(i.get("snippet", ""))}
                for i in j.get("organic", [])]
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
    for source in (_serper, _google, _brave, _ddg):
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
    return "google (serper)" if os.getenv("SERPER_API_KEY") else "google" if os.getenv("GOOGLE_CSE_KEY") and os.getenv("GOOGLE_CSE_CX") else "brave" if os.getenv("BRAVE_API_KEY") else "duckduckgo"


def suggest(query: str, lang: str = "en", n: int = 15) -> list[str]:
    """Real Google searches around the topic (Google autocomplete — free, no key).
    The base query plus question/cost expansions, so the writer covers what people actually type."""
    q = re.sub(r"\b20\d\d\b|[:–—|].*$", "", query).strip().lower()  # drop the year and the title's tail
    q = re.sub("২০[০-৯]{2}", "", q)
    words = q.split()
    q = " ".join(words[:6])
    tails = ["", " how", " what", " cost"] if lang == "en" else ["", " কত", " কিভাবে", " খরচ"]
    out, seen = [], set()
    for t in tails:
        try:
            r = requests.get("https://suggestqueries.google.com/complete/search",
                             params={"client": "firefox", "q": q + t, "hl": lang}, headers=_UA, timeout=10)
            for s in r.json()[1]:
                if s.lower() not in seen and s.lower() != q:
                    seen.add(s.lower())
                    out.append(s)
        except Exception:
            continue
    if len(out) < 4 and len(words) > 3:  # a long title gets few completions: widen to its first 3 words
        return (out + [x for x in suggest(" ".join(words[:3]), lang, n) if x not in out])[:n]
    return out[:n]


_SKIP = ("youtube.com", "facebook.com", "wikipedia.org", "reddit.com", "quora.com", "x.com", "twitter.com",
         "instagram.com", "tiktok.com", "pinterest.")


def competitors(hits: list[dict], own_domain: str = "", n: int = 3) -> list[dict]:
    """Read the top-ranking competitor articles: their headings and length, so the writer can cover
    everything they cover and beat them on depth and freshness. [{url, words, headings}]"""
    out = []
    for h in hits:
        u = h.get("url", "")
        if not u.startswith("http") or any(d in u for d in _SKIP) or (own_domain and own_domain in u):
            continue
        try:
            r = requests.get(u, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                                                       "(KHTML, like Gecko) Chrome/128.0 Safari/537.36"}, timeout=12)
            if r.status_code != 200 or "html" not in r.headers.get("content-type", ""):
                continue
            html = re.sub(r"(?is)<(script|style|nav|footer|header|aside)[^>]*>.*?</\1>", " ", r.text)
            heads = [_clean(x) for x in re.findall(r"(?is)<h[23][^>]*>(.*?)</h[23]>", html)]
            heads = [x for x in heads if 3 < len(x) < 120][:25]
            words = len(_clean(html).split())
            if len(heads) >= 3:
                out.append({"url": u, "words": words, "headings": heads})
        except Exception:
            continue
        if len(out) >= n:
            break
    return out
