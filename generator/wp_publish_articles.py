"""Publish hand-written, fact-checked probashiinfo articles from articles/probashiinfo/*.json.

Each JSON file: {slug, title, description, focus_keyword, categories:[ids], tags:[names], content (HTML)}.
Only CREATES new posts: if a post with the slug already exists (any status) it is skipped, so existing
posts/slugs are never changed. Sets Rank Math title/description/focus keyword (meta keys exposed by the
"AutoBlog Rank Math REST meta" snippet, see wp_ctr.py), then pings IndexNow (modules/indexnow.py).

    python wp_publish_articles.py            # dry run: auth check + what would be created
    python wp_publish_articles.py --apply    # create + verify + IndexNow
"""
import glob
import json
import os
import sys
import time

import requests

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import base64  # noqa: E402

BASE = os.environ["PROBASHIINFO_WP_URL"].rstrip("/")
_AUTH = base64.b64encode(f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()).decode()
H = {"Authorization": f"Basic {_AUTH}", "User-Agent": "AutoBlog/1.0"}


def wp(method, path, **kw):
    r = None
    for i in range(3):
        try:
            r = requests.request(method, f"{BASE}/wp-json/{path}", headers=H, timeout=60, **kw)
            if r.status_code < 500:
                return r
        except requests.RequestException:
            pass
        time.sleep(3 * (i + 1))
    return r


def ensure_snippet():
    """Same Rank Math REST-meta snippet wp_ctr.py installs (no-op if already there)."""
    try:
        from wp_ctr import ensure_snippet as _e
        _e()
    except Exception as e:  # wp_ctr imports the LLM module; meta may already be registered
        print("ensure_snippet skipped:", e)

APPLY = "--apply" in sys.argv
SRC = os.path.join(HERE, "..", "articles", "probashiinfo", "*.json")
DOMAIN = "probashiinfo.com"


def tag_ids(names):
    ids = []
    for n in names:
        r = wp("GET", "wp/v2/tags", params={"search": n, "per_page": 100})
        hit = next((t["id"] for t in (r.json() if r.ok else []) if t["name"] == n), None)
        if not hit and APPLY:
            c = wp("POST", "wp/v2/tags", json={"name": n})
            hit = c.json().get("id") if c.ok else (c.json().get("data") or {}).get("term_id")
        if hit:
            ids.append(hit)
    return ids


def main():
    me = wp("GET", "wp/v2/users/me", params={"context": "edit"})
    print("auth check users/me:", me.status_code, "(200 = app password OK)")
    if me.status_code != 200:
        print("  ! WordPress credentials rejected:", me.text[:200])
        sys.exit(1)
    files = sorted(glob.glob(SRC))
    print(f"{len(files)} article file(s) ({'APPLY' if APPLY else 'dry run'})")
    if APPLY:
        ensure_snippet()
    published = []
    for f in files:
        a = json.load(open(f, encoding="utf-8"))
        ex = wp("GET", "wp/v2/posts", params={"slug": a["slug"], "status": "publish,draft,pending,private,future", "context": "edit"})
        if ex.ok and ex.json():
            print(f"  = exists, skipped: {a['slug']} (#{ex.json()[0]['id']})")
            continue
        print(f"  + {a['slug']} | {a['title']}")
        if not APPLY:
            continue
        body = {
            "title": a["title"], "slug": a["slug"], "status": "publish", "content": a["content"],
            "excerpt": a["description"], "categories": a.get("categories") or [], "tags": tag_ids(a.get("tags") or []),
            "meta": {"rank_math_title": a["title"], "rank_math_description": a["description"],
                     "rank_math_focus_keyword": a["focus_keyword"]},
        }
        r = wp("POST", "wp/v2/posts", json=body)
        if not r.ok:
            print("    ! create failed", r.status_code, r.text[:300])
            continue
        post = r.json()
        print(f"    created #{post['id']} {post['link']} slug={post['slug']}")
        published.append(post["link"])
        time.sleep(2)
    for url in published:
        try:
            g = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=60)
            print(f"  verify {g.status_code} {url} faq={'FAQPage' in g.text} article={'Article' in g.text}")
        except requests.RequestException as e:
            print("  verify error", url, e)
    if published:
        try:
            from modules.indexnow import submit_urls
            submit_urls(DOMAIN, published, log=print)
        except Exception as e:
            print("IndexNow skipped:", e)


if __name__ == "__main__":
    main()
