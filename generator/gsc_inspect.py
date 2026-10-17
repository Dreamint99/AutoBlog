"""Search Console URL Inspection + sitemap status (read-only, same gsc-reader auth as gsc_pull.py).

For each site: the sitemaps Google knows (errors, warnings, last download), then URL Inspection
of the home page and up to N sitemap URLs (newest first). Writes data/inspect_<site>.json with
coverageState / verdict / robots / indexing / fetch state / Google canonical / last crawl per URL,
plus a count by coverageState. The API allows 2,000 inspections per property per day.

Usage: python gsc_inspect.py [site ...] [--n 40]
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone

import google.auth
from google.auth.transport.requests import AuthorizedSession

from gsc_pull import SITES, HERE

API = "https://searchconsole.googleapis.com"


def sitemap_urls(prop):
    req = urllib.request.Request(prop.rstrip("/") + "/sitemap.xml", headers={"User-Agent": "Mozilla/5.0 gsc-inspect"})
    xml = urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")
    if "<sitemapindex" in xml:
        out = []
        for sm in re.findall(r"<loc>([^<]+)</loc>", xml):
            req = urllib.request.Request(sm, headers={"User-Agent": "Mozilla/5.0 gsc-inspect"})
            out += re.findall(r"<loc>([^<]+)</loc>", urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace"))
        return out
    return re.findall(r"<loc>([^<]+)</loc>", xml)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    n = int(sys.argv[sys.argv.index("--n") + 1]) if "--n" in sys.argv else 40
    args = [a for a in args if not a.isdigit()]
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
    sess = AuthorizedSession(creds)
    for sid in args or list(SITES):
        prop = SITES[sid]
        out = {"site": sid, "property": prop, "checked": datetime.now(timezone.utc).isoformat(timespec="seconds")}
        r = sess.get(f"{API}/webmasters/v3/sites/{urllib.parse.quote(prop, safe='')}/sitemaps", timeout=60)
        out["sitemaps"] = r.json().get("sitemap", []) if r.ok else {"error": r.status_code, "body": r.text[:300]}
        try:
            urls = sitemap_urls(prop)
        except Exception as e:
            print(f"{sid} sitemap: {e}")
            urls = [prop]
        out["sitemap_count"] = len(urls)
        pick = [prop] + [u for u in urls if u.rstrip("/") != prop.rstrip("/")][:n]
        rows = []
        for u in pick:
            r = sess.post(f"{API}/v1/urlInspection/index:inspect", json={"inspectionUrl": u, "siteUrl": prop}, timeout=60)
            if not r.ok:
                rows.append({"url": u, "error": r.status_code, "body": r.text[:200]})
                print(sid, u, r.status_code, r.text[:200])
                if r.status_code == 429:
                    break
                continue
            ix = r.json().get("inspectionResult", {}).get("indexStatusResult", {})
            rows.append({"url": u, **{k: ix.get(k) for k in (
                "verdict", "coverageState", "robotsTxtState", "indexingState", "pageFetchState",
                "googleCanonical", "userCanonical", "lastCrawlTime", "crawledAs", "referringUrls")}})
        out["byState"] = dict(Counter(x.get("coverageState") or f"error {x.get('error')}" for x in rows))
        out["urls"] = rows
        print(sid, out["sitemap_count"], "in sitemap;", out["byState"])
        json.dump(out, open(os.path.join(HERE, "data", f"inspect_{sid}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
