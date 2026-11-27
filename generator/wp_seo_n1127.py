"""Nightly 2026-11-27: Rank Math title/description + post title (H1) on 4 probashiinfo posts.
  python wp_seo_n1127.py             # dry run: print current values (rollback source)
  python wp_seo_n1127.py --apply     # write new values; saves originals to data/n1127_backup.json (printed too)
  python wp_seo_n1127.py --rollback  # restore values from data/n1127_backup.json"""
import json, os, sys
import wp_ctr as c
HERE = os.path.dirname(os.path.abspath(__file__))
rows = json.load(open(os.path.join(HERE, "data", "n1127.json"), encoding="utf-8"))
BK = os.path.join(HERE, "data", "n1127_backup.json")
mode = "apply" if "--apply" in sys.argv else "rollback" if "--rollback" in sys.argv else "dry"
c.ensure_snippet()
backup = json.load(open(BK, encoding="utf-8")) if mode == "rollback" else []
for p in rows:
    post = c.find_post(p["url"])
    if not post: print("no post", p["url"]); sys.exit(1)
    m = post.get("meta") or {}
    cur = {"url": p["url"], "id": post["id"], "post_title": post["title"]["raw"],
           "rank_math_title": m.get("rank_math_title", ""), "rank_math_description": m.get("rank_math_description", "")}
    print("CUR", json.dumps(cur, ensure_ascii=False))
    if mode == "dry": continue
    if mode == "apply":
        body = {"meta": {"rank_math_title": p["title"], "rank_math_description": p["description"]}}
        if p.get("h1"): body["title"] = p["h1"]
    else:
        b = next(x for x in backup if x["url"] == p["url"])
        body = {"meta": {"rank_math_title": b["rank_math_title"], "rank_math_description": b["rank_math_description"]}, "title": b["post_title"]}
    r = c.wp("POST", f"wp/v2/posts/{post['id']}", json=body)
    print("  write", mode, r.status_code)
    if not r.ok: print(r.text[:300]); sys.exit(1)
print("done", mode)
