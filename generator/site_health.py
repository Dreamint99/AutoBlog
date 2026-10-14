"""Weekly site health for every network site (free, open source, runs in GitHub Actions):

  Lighthouse (GoogleChrome/lighthouse) on the homepage + the newest article, mobile:
      performance / SEO / accessibility / best-practices scores + Core Web Vitals (LCP, CLS, TBT)
  Linkinator (JustinBeckwith/linkinator) crawl of each site's own pages:
      broken internal links (404/5xx) with the page they were found on

Writes data/site_health.json (history of the last 12 runs) and prints a summary; a score
under the floor or any broken link is raised as a GitHub warning so it shows on the run.
Run by .github/workflows/site-health.yml. Needs node (npx) and Chrome (both on ubuntu-latest).
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
from datetime import date

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
SITES = {
    "countly": "https://countly.net/",
    "walvi": "https://visapoint.net/",
    "infkey": "https://infkey.com/",
    "gccguide": "https://gccguide.com/",
    "ninetymins": "https://ninetymins.com/",
    "probashiinfo": "https://probashiinfo.com/",
    "cob": "https://coloursofbangladesh.com/",
}
FLOOR = {"performance": 50, "seo": 90}
MAX_PAGES = int(os.getenv("HEALTH_MAX_PAGES", "300"))


def newest_article(home: str) -> str:
    """First article URL from the site's RSS feed (Next sites: /rss.xml, WordPress: /feed/)."""
    for path in ("rss.xml", "feed/"):
        try:
            xml = urllib.request.urlopen(urllib.request.Request(home + path, headers={"User-Agent": "Mozilla/5.0"}),
                                         timeout=20).read().decode("utf-8", "replace")
            links = re.findall(r"<item>.*?<link>([^<]+)</link>", xml, re.S)
            if links:
                return links[0].strip()
        except Exception:
            continue
    return ""


def lighthouse(url: str, desktop: bool = False) -> dict:
    out = tempfile.mktemp(suffix=".json")
    cmd = ["npx", "-y", "lighthouse@12", url] + (["--preset=desktop"] if desktop else []) + [ "--quiet", "--output=json", f"--output-path={out}",
           "--chrome-flags=--headless=new --no-sandbox", "--only-categories=performance,seo,accessibility,best-practices"]
    try:
        subprocess.run(cmd, timeout=240, capture_output=True)
        r = json.load(open(out, encoding="utf-8"))
    except Exception as e:
        return {"url": url, "error": str(e)[:200]}
    cat = {k: round((v.get("score") or 0) * 100) for k, v in r.get("categories", {}).items()}
    au = r.get("audits", {})
    failed_seo = [au[a["id"]]["title"] for a in r["categories"].get("seo", {}).get("auditRefs", [])
                  if a.get("weight") and au.get(a["id"], {}).get("score") == 0]
    return {"url": url, "form": "desktop" if desktop else "mobile", **cat,
            "lcp_s": round((au.get("largest-contentful-paint", {}).get("numericValue") or 0) / 1000, 2),
            "cls": round(au.get("cumulative-layout-shift", {}).get("numericValue") or 0, 3),
            "tbt_ms": round(au.get("total-blocking-time", {}).get("numericValue") or 0),
            "seo_fails": failed_seo}


def broken_links(home: str) -> list:
    host = re.escape(home.split("/")[2])
    out = tempfile.mktemp(suffix=".json")
    cmd = ["npx", "-y", "linkinator@6", home, "--recurse", "--format", "json", "--concurrency", "10", "--timeout", "15000",
           "--retry", "--skip", f"^(?!https?://(www\\.)?{host})", "--skip", r"/wp-admin|/wp-json|/cdn-cgi/|\?replytocom="]
    try:
        p = subprocess.run(cmd, timeout=1500, capture_output=True, text=True)
        data = json.loads(p.stdout or "{}")
    except Exception as e:
        return [{"error": str(e)[:200]}]
    bad = [{"url": l["url"], "status": l.get("status"), "on": l.get("parent")}
           for l in data.get("links", []) if l.get("state") == "BROKEN"]
    return bad[:200]


def main():
    only = sys.argv[1:] or list(SITES)
    path = os.path.join(HERE, "data", "site_health.json")
    try:
        hist = json.load(open(path, encoding="utf-8"))
    except Exception:
        hist = {"runs": []}
    run = {"date": date.today().isoformat(), "sites": {}}
    for sid in only:
        home = SITES[sid]
        art = newest_article(home)
        urls = [home] + ([art] if art else [])
        pages = [lighthouse(u) for u in urls] + [lighthouse(u, desktop=True) for u in urls]
        # HEALTH_LINKS=0 skips the (slow) broken-link crawl for a quick speed check
        broken = broken_links(home) if os.getenv("HEALTH_LINKS", "1") != "0" else []
        run["sites"][sid] = {"lighthouse": pages, "broken": broken}
        for p in pages:
            if "error" in p:
                print(f"::warning::{sid} lighthouse failed on {p['url']}: {p['error']}")
                continue
            print(f"{sid} [{p['form']}]: perf {p.get('performance')} seo {p.get('seo')} a11y {p.get('accessibility')} "
                  f"bp {p.get('best-practices')} LCP {p['lcp_s']}s CLS {p['cls']} TBT {p['tbt_ms']}ms  {p['url']}")
            for k, floor in FLOOR.items():
                if (p.get(k) or 0) < floor:
                    print(f"::warning::{sid} {k} score {p.get(k)} < {floor} on {p['url']}")
            if p["seo_fails"]:
                print(f"::warning::{sid} SEO audits failing: {', '.join(p['seo_fails'])}")
        real = [b for b in broken if "url" in b]
        print(f"{sid}: {len(real)} broken internal links")
        for b in real[:10]:
            print(f"::warning::{sid} broken link {b['status']} {b['url']} (on {b['on']})")
    hist["runs"] = (hist.get("runs", []) + [run])[-12:]
    json.dump(hist, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
