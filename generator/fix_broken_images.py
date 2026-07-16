# -*- coding: utf-8 -*-
"""Replace broken article feature images (Supabase Storage / pollinations — both
dead) with REAL, HTTP-verified Wikimedia Commons images, in Cloudflare D1.

Subject per article: first tag, else keyword, else the salient word in the title.
Brands → "<subject> logo"; falls back to "<subject>". Every URL is fetched and
checked (200 + image/*) before use. Subjects are cached so shared brands hit the
API once. Updates D1 in batches via `wrangler d1 execute`.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import time

import requests

COMMONS = "https://commons.wikimedia.org/w/api.php"
HDRS = {"User-Agent": "AutoBlog/1.0 (fix feature images; contact@countly.net)"}
WEB = os.path.join(os.path.dirname(__file__), "..", "web")
DB = "autoblog-content"

STOP = {"how", "many", "users", "are", "there", "in", "2026", "2025", "global", "by",
        "country", "the", "world", "much", "does", "cost", "of", "a", "to", "is",
        "restaurants", "people", "what", "and", "for", "top", "best", "guide", "vs"}


def subject_of(title, tags, keyword):
    if tags:
        t = tags[0] if isinstance(tags, list) and tags else ""
        if t and t.lower() not in STOP and len(t) > 1:
            return t
    if keyword:
        w = [x for x in re.split(r"\W+", keyword) if x and x.lower() not in STOP]
        if w:
            return " ".join(w[:2])
    # from title: first capitalised token not in STOP
    for w in re.split(r"\W+", title):
        if w and w[0:1].isupper() and w.lower() not in STOP and len(w) > 1:
            return w
    return ""


def search_verified(term):
    for q in (f"{term} logo", term):
        params = {"action": "query", "format": "json", "generator": "search",
                  "gsrsearch": q, "gsrnamespace": "6", "gsrlimit": "6",
                  "prop": "imageinfo", "iiprop": "url|mime", "iiurlwidth": "1200"}
        try:
            r = requests.get(COMMONS, params=params, headers=HDRS, timeout=25)
            pages = (r.json().get("query", {}) or {}).get("pages", {}) or {}
        except Exception:
            continue
        cands = sorted(pages.values(), key=lambda p: p.get("index", 999))
        for p in cands:
            ii = (p.get("imageinfo") or [{}])[0]
            mime = ii.get("mime", "")
            if not mime.startswith("image/") or mime in ("image/svg+xml", "image/gif"):
                continue
            url = ii.get("thumburl") or ii.get("url")
            if not url:
                continue
            try:
                g = requests.get(url, headers=HDRS, timeout=20, stream=True)
                if g.status_code == 200 and g.headers.get("content-type", "").startswith("image/"):
                    return url
            except Exception:
                pass
    return None


def d1_json(sql):
    for npx in ("npx.cmd", "npx"):
        try:
            r = subprocess.run([npx, "wrangler", "d1", "execute", DB, "--remote",
                                "--command", sql, "--json"], cwd=WEB, capture_output=True,
                               text=True, timeout=120, encoding="utf-8", errors="replace")
            return json.loads(r.stdout)[0]["results"]
        except FileNotFoundError:
            continue
        except Exception:
            return []
    return []


def d1_exec_file(sql_text):
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f:
        f.write(sql_text)
        fn = f.name
    try:
        for npx in ("npx.cmd", "npx"):
            try:
                r = subprocess.run([npx, "wrangler", "d1", "execute", DB, "--remote",
                                    "--file", fn, "--yes"], cwd=WEB, capture_output=True,
                                   text=True, timeout=180, encoding="utf-8", errors="replace")
                out = (r.stdout or "") + (r.stderr or "")
                return "Executed" in out or "queries" in out
            except FileNotFoundError:
                continue
    finally:
        os.unlink(fn)
    return False


def main(site=None):
    where = "(image_url LIKE '%supabase.co/storage%' OR image_url LIKE '%pollinations%')"
    if site:
        where += f" AND site_id='{site}'"
    rows = d1_json(f"SELECT id, site_id, title, tags, keyword FROM articles WHERE {where}")
    print(f"broken articles: {len(rows)}")
    cache = {}
    updates = []
    fixed = miss = 0
    for i, r in enumerate(rows):
        try:
            tags = json.loads(r.get("tags") or "[]")
        except Exception:
            tags = []
        subj = subject_of(r.get("title", ""), tags, r.get("keyword", ""))
        if not subj:
            miss += 1
            continue
        key = subj.lower()
        if key not in cache:
            cache[key] = search_verified(subj)
            time.sleep(0.3)
        url = cache[key]
        if url:
            updates.append((r["id"], url))
            fixed += 1
        else:
            miss += 1
        if (i + 1) % 25 == 0:
            print(f"  {i+1}/{len(rows)}  fixed={fixed} miss={miss}")
        # flush in batches of 60
        if len(updates) >= 60:
            _flush(updates)
            updates = []
    if updates:
        _flush(updates)
    print(f"DONE: {fixed} fixed, {miss} unmatched (kept as-is)")


def _flush(updates):
    stmts = [f"UPDATE articles SET image_url='{u.replace(chr(39), chr(39)*2)}' WHERE id='{i}';"
             for i, u in updates]
    ok = d1_exec_file("\n".join(stmts) + "\n")
    print(f"    flushed {len(stmts)} updates -> {'ok' if ok else 'FAIL'}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
