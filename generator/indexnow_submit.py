"""Bulk-submit a site's published article URLs to IndexNow (one batch).

Usage:  python indexnow_submit.py [site_id]    (default: infkey)
Run AFTER the key file is live at https://<domain>/<key>.txt.
"""
import sys
import os

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store, indexnow

SITE_ID = sys.argv[1] if len(sys.argv) > 1 else "infkey"


def main():
    sites = [s for s in store.load_sites() if s["id"] == SITE_ID]
    if not sites:
        print(f"unknown site '{SITE_ID}'")
        return
    site = sites[0]
    domain = site.get("domain", "")
    arts = [a for a in store.list_articles(SITE_ID) if a.get("status") == "published"]
    urls = [indexnow.article_url(site, a) for a in arts]
    urls.append(f"https://{domain}/")  # homepage too
    print(f"Submitting {len(urls)} URL(s) for {domain} to IndexNow…")
    ok = indexnow.submit_urls(domain, urls, log=print)
    print("done" if ok else "FAILED (check key file is live + host in INDEXNOW_HOSTS)")


if __name__ == "__main__":
    main()
