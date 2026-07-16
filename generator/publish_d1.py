# -*- coding: utf-8 -*-
"""Publish articles to Cloudflare D1 (autoblog-content) — the drop-in replacement
for insert_walvi_articles.py now that Supabase is paused. Same JSON input:
  { "articles": [ {slug,title,meta_title,meta_description,excerpt,body_html,
                   tags,faq,keyword,secondary_keywords,image_url,word_count}, ... ] }

Usage:  python publish_d1.py <articles.json> <site_id>

Writes via `wrangler d1 execute` (uses the wrangler OAuth login already on this PC).
Sites read D1 with a 30-min edge cache, so new posts appear within ~30 minutes.
"""
import json
import os
import subprocess
import sys
import tempfile
import uuid
from datetime import datetime, timezone

DB = "autoblog-content"
WEB_DIR = os.path.join(os.path.dirname(__file__), "..", "web")

COLS = ["id", "site_id", "title", "slug", "meta_title", "meta_description", "excerpt",
        "body_html", "tags", "faq", "keyword", "secondary_keywords", "image_url",
        "schema", "word_count", "reading_time", "status", "is_mock", "created_at"]
JSON_COLS = {"tags", "faq", "secondary_keywords", "schema"}
INT_COLS = {"word_count", "reading_time"}


def sql_val(col, v):
    if v is None:
        return "NULL"
    if col == "is_mock":
        return "1" if v else "0"
    if col in INT_COLS:
        try:
            return str(int(v))
        except Exception:
            return "0"
    if col in JSON_COLS:
        v = json.dumps(v, ensure_ascii=False)
    else:
        v = str(v)
    return "'" + v.replace("'", "''") + "'"


def row_for(a, site):
    wc = int(a.get("word_count") or 0) or max(1700, len(a.get("body_html", "")) // 6)
    return {
        "id": a.get("id") or uuid.uuid4().hex,
        "site_id": site,
        "title": a["title"],
        "slug": a["slug"],
        "meta_title": (a.get("meta_title") or a["title"])[:70],
        "meta_description": a.get("meta_description", a.get("excerpt", "")),
        "excerpt": a.get("excerpt", ""),
        "body_html": a["body_html"],
        "tags": a.get("tags", []),
        "faq": a.get("faq", []),
        "keyword": a.get("keyword", ""),
        "secondary_keywords": a.get("secondary_keywords", []),
        "image_url": a.get("image_url", ""),
        "schema": a.get("schema", []),
        "word_count": wc,
        "reading_time": max(4, round(wc / 210)),
        "status": a.get("status", "published"),
        "is_mock": False,
        "created_at": a.get("created_at") or datetime.now(timezone.utc).isoformat(),
    }


def wrangler(args):
    for npx in ("npx.cmd", "npx"):
        try:
            return subprocess.run([npx, "wrangler", *args], cwd=WEB_DIR,
                                  capture_output=True, text=True, timeout=180,
                                  encoding="utf-8", errors="replace")
        except FileNotFoundError:
            continue
    raise RuntimeError("npx/wrangler not found")


def main(path, site):
    arts = json.load(open(path, encoding="utf-8")).get("articles", [])
    if not arts:
        print("no articles")
        return
    stmts = []
    collist = ", ".join(COLS)
    for a in arts:
        r = row_for(a, site)
        vals = ", ".join(sql_val(c, r.get(c)) for c in COLS)
        stmts.append(f"INSERT OR REPLACE INTO articles ({collist}) VALUES ({vals});")

    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f:
        f.write("\n".join(stmts) + "\n")
        sqlfile = f.name
    try:
        res = wrangler(["d1", "execute", DB, "--remote", "--file", sqlfile, "--yes"])
        out = (res.stdout or "") + (res.stderr or "")
        ok = "Executed" in out or "queries" in out
        print(f"{'OK' if ok else 'FAIL'}: {len(stmts)} article(s) -> D1 {DB} (site={site})")
        if not ok:
            print(out[-400:])
            sys.exit(1)
    finally:
        os.unlink(sqlfile)


if __name__ == "__main__":
    p = sys.argv[1] if len(sys.argv) > 1 else "data/walvi_articles.json"
    s = sys.argv[2] if len(sys.argv) > 2 else "walvi"
    main(p, s)
