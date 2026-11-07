"""Crawl each site like a search bot and report what blocks indexing.

From the home page, follows internal links breadth-first (up to 6 clicks) and compares
with sitemap.xml:
  - orphans      : sitemap URLs no internal link reaches (Google leaves these "Discovered")
  - depth        : clicks from home for every sitemap URL (> 3 is weak)
  - redirect_links: internal hrefs that answer 3xx (each one a wasted crawl)
  - broken_links : internal hrefs that answer 4xx/5xx, with a page that links them
  - noindex / canonical mismatches / duplicate titles

    python seo_crawl.py                   # all 5 Next sites
    python seo_crawl.py countly infkey    # some
Writes data/seo_crawl.json; problems print as ::warning:: lines on GitHub Actions.
"""
import collections
import concurrent.futures as cf
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
SITES = {"countly": "countly.net", "walvi": "visapoint.net", "infkey": "infkey.com",
         "gccguide": "gccguide.com", "ninetymins": "ninetymins.com"}
UA = "Mozilla/5.0 (compatible; AutoBlogSeoCrawl/1.0; +https://github.com/Dreamint99/AutoBlog)"
SKIP = re.compile(r"/(_next|card|pin|api|search)\b|\.(xml|txt|png|jpe?g|webp|svg|ico|css|js|pdf)$", re.I)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


OPEN = urllib.request.build_opener(NoRedirect)


def fetch(url: str):
    try:
        r = OPEN.open(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30)
        return r.status, r.read().decode("utf-8", "replace"), None
    except urllib.error.HTTPError as e:
        return e.code, "", e.headers.get("Location")
    except Exception:
        return 0, "", None


def crawl(domain: str) -> dict:
    base = f"https://{domain}"
    st, sm, _ = fetch(base + "/sitemap.xml")
    smurls = set(re.findall(r"<loc>([^<]+)</loc>", sm))
    depth = {base + "/": 0}
    linked_from: dict = {}
    frontier = [base + "/"]
    pages = {}
    redirects, broken = {}, {}
    d = 0
    while frontier and d < 6:
        with cf.ThreadPoolExecutor(10) as ex:
            res = list(ex.map(fetch, frontier))
        nxt = []
        for url, (code, html, loc) in zip(frontier, res):
            if 300 <= code < 400:
                redirects[url] = (loc, linked_from.get(url))
                # keep crawling through the hop so the rest of the audit still works
                tgt = urllib.parse.urljoin(url, loc or "")
                tgt = tgt.rstrip("/") if tgt != base + "/" else tgt
                if tgt.startswith(base) and tgt not in depth:
                    depth[tgt] = d + 1
                    linked_from[tgt] = linked_from.get(url)
                    nxt.append(tgt)
                continue
            if code != 200:
                broken[url] = (code, linked_from.get(url))
                continue
            main = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", "", html)
            pages[url] = {
                "title": (re.findall(r"<title>([^<]*)", html) or [""])[0],
                "canon": (re.findall(r'<link rel="canonical" href="([^"]+)"', html) or [""])[0],
                "robots": (re.findall(r'<meta name="robots" content="([^"]+)"', html) or [""])[0],
            }
            for href in set(re.findall(r'href="([^"#]+)"', main)):
                if href.startswith("/") and not href.startswith("//"):
                    href = base + href
                if not href.startswith(base):
                    continue
                href = href.split("?")[0]
                href = href.rstrip("/") if href != base + "/" else href
                href = href or base + "/"
                if href == base:
                    href = base + "/"
                if SKIP.search(href[len(base):]):
                    continue
                if href not in depth:
                    depth[href] = d + 1
                    linked_from[href] = url
                    nxt.append(href)
        frontier = nxt
        d += 1
    titles = collections.Counter(p["title"] for p in pages.values())
    hist = collections.Counter(min(depth.get(u, 9), 9) for u in smurls)
    return {
        "sitemap_urls": len(smurls),
        "crawled_ok": len(pages),
        "orphans": sorted(u for u in smurls if u not in depth)[:200],
        "depth_histogram": {("not reached" if k == 9 else str(k)): v for k, v in sorted(hist.items())},
        "redirect_links": [{"url": u, "to": t, "on": on} for u, (t, on) in list(redirects.items())[:100]],
        "redirect_link_count": len(redirects),
        "broken_links": [{"url": u, "status": s, "on": on} for u, (s, on) in list(broken.items())[:100]],
        "broken_link_count": len(broken),
        "noindex": [u for u, p in pages.items() if "noindex" in p["robots"]][:50],
        "canonical_mismatch": [{"url": u, "canonical": p["canon"]} for u, p in pages.items()
                               if p["canon"] and p["canon"].rstrip("/") != u.rstrip("/")][:50],
        "duplicate_titles": [t for t, c in titles.items() if c > 1 and t][:50],
    }


def main():
    ids = [a for a in sys.argv[1:] if a in SITES] or list(SITES)
    out_path = os.path.join(HERE, "data", "seo_crawl.json")
    try:
        out = json.load(open(out_path, encoding="utf-8"))
    except Exception:
        out = {}
    for sid in ids:
        r = crawl(SITES[sid])
        r["checked"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        out[sid] = r
        print(f"{sid}: {r['sitemap_urls']} in sitemap, {len(r['orphans'])} orphans, depth {r['depth_histogram']}, "
              f"{r['redirect_link_count']} redirecting links, {r['broken_link_count']} broken links")
        if os.getenv("GITHUB_ACTIONS"):
            if r["orphans"]:
                print(f"::warning::{sid}: {len(r['orphans'])} sitemap URLs have no internal link")
            if r["redirect_link_count"]:
                print(f"::warning::{sid}: {r['redirect_link_count']} internal links redirect")
            if r["broken_link_count"]:
                print(f"::warning::{sid}: {r['broken_link_count']} internal links are broken")
    json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
