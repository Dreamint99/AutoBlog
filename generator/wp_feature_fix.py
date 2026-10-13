"""Give every probashiinfo post an on-topic feature image and drop off-topic stock photos.

For each published post whose featured image is missing or was a pipeline stock pick
(media tagged "photo-source:pixabay/openverse"), set a free-licence photo of the post's
country (Wikimedia Commons, credited) or a rendered title card. Stock photos inside the
body get the same treatment (or are removed). Images added by hand are never touched.

    python wp_feature_fix.py              # dry run: what would change
    python wp_feature_fix.py --apply [N]  # fix the first N posts (default all)

Progress is kept in data/feature_fix_probashiinfo.json so reruns skip finished posts.
"""
import json
import os
import re
import sys
import time

import requests

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import feature_image as fi  # noqa: E402
from modules import wp_images  # noqa: E402
from modules.wordpress import _creds, _headers  # noqa: E402

SITE = {"id": "probashiinfo", "domain": "probashiinfo.com"}
SITE_NAME = "প্রবাসী ইনফো"
APPLY = "--apply" in sys.argv
LIMIT = next((int(a) for a in sys.argv[1:] if a.isdigit()), 0)
DONE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "feature_fix_probashiinfo.json")


def posts(base, h):
    for page in range(1, 60):
        r = requests.get(f"{base}/wp-json/wp/v2/posts", headers=h, timeout=60, params={
            "per_page": 50, "page": page, "status": "publish", "context": "edit",
            "_fields": "id,slug,title,content,featured_media"})
        if r.status_code == 400 or not r.json():
            return
        r.raise_for_status()
        yield from r.json()


def media_url(base, h, mid):
    if not mid:
        return ""
    r = requests.get(f"{base}/wp-json/wp/v2/media/{mid}", headers=h, timeout=60, params={"_fields": "source_url"})
    return r.json().get("source_url", "") if r.ok else ""


def main():
    base, user, pw = _creds(SITE)
    h = _headers(user, pw)
    used, stock = wp_images.stock_library(base, h)
    print(f"{len(stock)} stock photos in the library, {len(used)} source ids used")
    done = json.load(open(DONE_FILE, encoding="utf-8")) if os.path.exists(DONE_FILE) else {}
    fixed = 0
    for p in posts(base, h):
        pid = str(p["id"])
        if pid in done:
            continue
        title = re.sub(r"<[^>]+>", "", p["title"]["raw"]).strip()
        html = p["content"]["raw"]
        feat = media_url(base, h, p.get("featured_media"))
        feat_stock = not feat or wp_images._stem(feat) in stock
        inline = [t for t in wp_images._IMG.findall(html) if wp_images._stem((re.search(r'src="([^"]*)"', t) or [None, ""])[1]) in stock]
        if not feat_stock and not inline:
            continue
        country = fi.detect_country(title, p["slug"])
        print(f"#{pid} {title[:60]} | country={country[0] if country else '-'} | feature={'stock/missing' if feat_stock else 'keep'} | inline stock={len(inline)}")
        if not APPLY:
            continue
        update, photos = {}, []
        name = f"pi-{pid}"
        if feat_stock:
            got = wp_images.featured(base, h, title, p["slug"], used, SITE_NAME, name)
            if got:
                update["featured_media"] = got[0]
                if got[2]:
                    photos.append(got[2])
        new_html, rep, rem, placed = wp_images.fix_inline(base, h, html, title, p["slug"], used, stock, name)
        photos += placed
        if photos or new_html != html or wp_images._CREDIT.search(html):
            update["content"] = wp_images.with_credit(new_html, photos)
        if update:
            r = requests.post(f"{base}/wp-json/wp/v2/posts/{pid}", headers={**h, "Content-Type": "application/json"}, json=update, timeout=90)
            print(f"   → {r.status_code} feature={'photo' if photos and feat_stock and got and got[2] else 'card' if 'featured_media' in update else 'kept'} inline +{rep} -{rem}")
            if not r.ok:
                continue
        done[pid] = {"title": title, "country": country[0] if country else "", "featured_media": update.get("featured_media")}
        json.dump(done, open(DONE_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        fixed += 1
        if LIMIT and fixed >= LIMIT:
            break
        time.sleep(1)  # be gentle with Commons and the WP host
    print(f"{fixed} posts fixed")


if __name__ == "__main__":
    main()
