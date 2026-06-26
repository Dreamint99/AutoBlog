"""White-hat network SEO for the live sites (infkey, countly, walvi):

1. CONTEXTUAL cross-links — add ONE relevant link from each article to a strongly
   related article on a SISTER site (only when topics genuinely overlap, e.g. an
   InfKey AI-cost piece ↔ a Countly ChatGPT-stats piece). Sparse + relevance-gated
   = editorial, NOT a PBN. Skips weak matches entirely.
2. INDEXING — IndexNow ping (Bing/Yandex) for every live URL so new/updated pages
   get crawled fast.

Usage:  python network_seo.py [min_overlap]   (default 2 shared topic words)
"""
import os
import re
import sys
from datetime import datetime

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store, indexnow

LIVE = {"infkey": "infkey.com", "countly": "countly.net", "walvi": "walvi.io"}
MIN_OVERLAP = int(sys.argv[1]) if len(sys.argv) > 1 else 2

_STOP = set((
    "the a an of for to in on and or with how what why best guide your you from is are can do does "
    "complete top ten list lists world worlds rankings ranking richest people data statistics report "
    "2024 2025 2026 net worth billionaires country countries by update updated latest compared compare "
    "vs and the most largest biggest leading global"
).split())


def _tokens(a: dict) -> set:
    text = f"{a.get('keyword','')} {a.get('title','')}".lower()
    return {w for w in re.findall(r"[a-z]+", text) if len(w) >= 4 and w not in _STOP}


def crosslink(by_site: dict) -> int:
    items = [(sid, a, _tokens(a)) for sid in LIVE for a in by_site.get(sid, [])]
    added = 0
    for sid, a, toks in items:
        if not toks:
            continue
        body = a.get("body_html", "") or ""
        if 'class="cn-related-net"' in body:
            continue  # already linked
        best, best_score = None, 0
        for sid2, b, toks2 in items:
            if sid2 == sid:
                continue
            score = len(toks & toks2)
            if score > best_score:
                best, best_score = (sid2, b), score
        if not best or best_score < MIN_OVERLAP:
            continue
        sid2, b = best
        url = f"https://{LIVE[sid2]}/{b.get('slug','')}"
        if LIVE[sid2] in body:
            continue
        link = (f'<p class="cn-related-net"><strong>Related:</strong> '
                f'<a href="{url}">{b.get("title","")}</a></p>')
        store.update_article(a["id"], {"body_html": body + "\n" + link})
        added += 1
        print(f"  link {sid}:{a['title'][:32]} -> {sid2}:{b['title'][:32]} (score {best_score})")
    return added


def index_ping(by_site: dict) -> int:
    total = 0
    for sid, domain in LIVE.items():
        arts = by_site.get(sid, [])
        urls = [f"https://{domain}/{a.get('slug','')}" for a in arts if a.get("slug")]
        urls.append(f"https://{domain}/")
        urls.append(f"https://{domain}/sitemap.xml")
        if indexnow.submit_urls(domain, urls, log=lambda m: print("  " + m)):
            total += len(urls)
    return total


def main():
    # Cross-linking is OFF by default: the live sites are different niches, so
    # automated cross-links come out irrelevant (LLM-API ↔ work-visa) — junk that
    # reads as manipulative. Only enable with the explicit "crosslink" arg if/when
    # genuinely related content exists. Default run = IndexNow indexing only.
    do_cross = "crosslink" in sys.argv
    by_site = {sid: store.list_articles(sid) for sid in LIVE}
    print(f"[network-seo] {datetime.now():%Y-%m-%d %H:%M}")
    n = 0
    if do_cross:
        print("== contextual cross-links ==")
        n = crosslink(by_site)
        print(f"  added {n} cross-links")
        by_site = {sid: store.list_articles(sid) for sid in LIVE}
    print("== IndexNow ping ==")
    p = index_ping(by_site)
    print(f"=== done: {n} cross-links, {p} URLs pinged ===")


if __name__ == "__main__":
    main()
