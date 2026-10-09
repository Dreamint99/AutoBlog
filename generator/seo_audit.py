"""On-page SEO audit for the live sites — crawls each sitemap and checks every URL.

    python seo_audit.py                      # all 4 sites, up to 400 URLs each
    python seo_audit.py infkey.com 100

Checks: HTTP status, redirects, <title> length + duplicates, meta description
length + duplicates, exactly one <h1>, canonical (present, self, absolute),
robots noindex, og:title/og:image, JSON-LD types, word count (thin < 300),
images without alt, internal-link count, hreflang/lang, response time.
Writes output/seo_audit_<domain>.md and prints a summary.
"""
import collections
import concurrent.futures as cf
import os
import re
import sys
import time
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

UA = {"User-Agent": "Mozilla/5.0 (compatible; AutoBlogAudit/1.0; +https://visapoint.net)"}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
DOMAINS = ["infkey.com", "countly.net", "visapoint.net", "ninetymins.com"]


def sitemap_urls(domain: str) -> list[str]:
    """sitemap.xml, following a sitemap index (WordPress / Rank Math) one level down."""
    r = requests.get(f"https://{domain}/sitemap.xml", headers=UA, timeout=60, allow_redirects=True)
    locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", r.text)
    if "<sitemapindex" in r.text:
        out = []
        for sm in locs:
            if re.search(r"(post|page)-sitemap", sm):
                out += re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", requests.get(sm, headers=UA, timeout=60).text)
        return [u for u in out if not u.endswith((".jpg", ".png", ".webp"))]
    return locs


def audit(url: str, domain: str) -> dict:
    t0 = time.time()
    try:
        r = requests.get(url, headers=UA, timeout=40, allow_redirects=True)
    except Exception as e:
        return {"url": url, "issues": [f"fetch failed: {e.__class__.__name__}"], "status": 0}
    ms = int((time.time() - t0) * 1000)
    res = {"url": url, "status": r.status_code, "ms": ms, "issues": [], "warn": []}
    if r.history:
        res["issues"].append(f"sitemap URL redirects → {r.url}")
    if r.status_code != 200:
        res["issues"].append(f"HTTP {r.status_code}")
        return res
    s = BeautifulSoup(r.text, "html.parser")
    title = (s.title.string or "").strip() if s.title else ""
    res["title"] = title
    if not title:
        res["issues"].append("missing <title>")
    elif len(title) > 65:
        res["warn"].append(f"title long ({len(title)} chars)")
    elif len(title) < 25:
        res["warn"].append(f"title short ({len(title)} chars)")
    md = s.find("meta", attrs={"name": "description"})
    desc = (md.get("content") or "").strip() if md else ""
    res["desc"] = desc
    if not desc:
        res["issues"].append("missing meta description")
    elif len(desc) > 165:
        res["warn"].append(f"description long ({len(desc)})")
    elif len(desc) < 70:
        res["warn"].append(f"description short ({len(desc)})")
    h1s = s.find_all("h1")
    if len(h1s) != 1:
        res["issues"].append(f"{len(h1s)} <h1> tags")
    can = s.find("link", rel="canonical")
    href = can.get("href", "") if can else ""
    if not href:
        res["issues"].append("missing canonical")
    else:
        cu = urlparse(href)
        if not cu.netloc:
            res["issues"].append(f"relative canonical {href}")
        elif cu.netloc.replace("www.", "") != domain or cu.path.rstrip("/") != urlparse(r.url).path.rstrip("/"):
            res["warn"].append(f"canonical points elsewhere: {href}")
    rb = s.find("meta", attrs={"name": "robots"})
    if rb and "noindex" in (rb.get("content") or "").lower():
        res["issues"].append("noindex but in sitemap")
    if not s.find("meta", property="og:title"):
        res["warn"].append("no og:title")
    if not s.find("meta", property="og:image"):
        res["warn"].append("no og:image")
    types = re.findall(r'"@type"\s*:\s*"([A-Za-z]+)"', " ".join(x.get_text() for x in s.find_all("script", type="application/ld+json")))
    res["schema"] = sorted(set(types))
    if not types:
        res["warn"].append("no JSON-LD")
    main = s.find("main") or s.body or s
    for t in main.find_all(["script", "style", "nav", "footer", "header"]):
        t.decompose()
    words = len(re.findall(r"\w+", main.get_text(" ")))
    res["words"] = words
    if words < 300:
        res["warn"].append(f"thin page ({words} words)")
    noalt = [i for i in s.find_all("img") if not (i.get("alt") or "").strip() and i.get("aria-hidden") != "true"]
    if noalt:
        res["warn"].append(f"{len(noalt)} images without alt")
    internal = {a.get("href") for a in s.find_all("a", href=True) if a["href"].startswith("/") or domain in a["href"]}
    res["links"] = len(internal)
    if len(internal) < 5:
        res["warn"].append(f"few internal links ({len(internal)})")
    html = s.find("html")
    if not (html and html.get("lang")):
        res["warn"].append("no <html lang>")
    if ms > 2500:
        res["warn"].append(f"slow ({ms} ms)")
    return res


def run(domain: str, limit: int = 400) -> dict:
    urls = sitemap_urls(domain)[:limit]
    with cf.ThreadPoolExecutor(8) as ex:
        rows = list(ex.map(lambda u: audit(u, domain), urls))
    dup_t = collections.Counter(r.get("title") for r in rows if r.get("title"))
    dup_d = collections.Counter(r.get("desc") for r in rows if r.get("desc"))
    for r in rows:
        if r.get("title") and dup_t[r["title"]] > 1:
            r["issues"].append(f"duplicate title (x{dup_t[r['title']]})")
        if r.get("desc") and dup_d[r["desc"]] > 1:
            r["warn"].append(f"duplicate description (x{dup_d[r['desc']]})")
    counts = collections.Counter(re.sub(r"\(.*?\)|\d+", "", i).strip() for r in rows for i in r["issues"])
    wcounts = collections.Counter(re.sub(r"\(.*?\)|\d+|:.*", "", w).strip() for r in rows for w in r.get("warn", []))
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, f"seo_audit_{domain}.md"), "w", encoding="utf-8") as f:
        f.write(f"# SEO audit — {domain}\n\n{len(rows)} URLs from sitemap.xml\n\n## Errors\n")
        for k, v in counts.most_common():
            f.write(f"- {k}: {v}\n")
        f.write("\n## Warnings\n")
        for k, v in wcounts.most_common():
            f.write(f"- {k}: {v}\n")
        f.write("\n## Pages with errors\n")
        for r in rows:
            if r["issues"]:
                f.write(f"- {r['url']} — {'; '.join(r['issues'])}\n")
    avg = sum(r.get("ms", 0) for r in rows) // max(1, len(rows))
    return {"domain": domain, "urls": len(rows), "errors": counts, "warnings": wcounts, "avg_ms": avg, "rows": rows}


if __name__ == "__main__":
    for _s in (sys.stdout,):
        _s.reconfigure(encoding="utf-8", errors="replace")
    doms = [a for a in sys.argv[1:] if "." in a] or DOMAINS
    lim = next((int(a) for a in sys.argv[1:] if a.isdigit()), 400)
    for d in doms:
        rep = run(d, lim)
        print(f"\n=== {d}: {rep['urls']} URLs, avg {rep['avg_ms']} ms")
        print("  errors:", dict(rep["errors"].most_common(10)))
        print("  warnings:", dict(rep["warnings"].most_common(12)))
