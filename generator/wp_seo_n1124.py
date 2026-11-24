"""Nightly 2026-11-24: fact correction on the Bulgaria minimum-wage post.
  python wp_seo_n1124.py --dump    # print raw content (for building exact replacements)
  python wp_seo_n1124.py           # dry run: report which replacements match
  python wp_seo_n1124.py --apply   # write
Replacements live in data/n1124_replace.json: [{"url":..,"title":..,"replace":[[old,new],..],"prepend":..}]
Idempotent via marker."""
import json, os, sys
import wp_seo_t124 as t
MARK = "<!-- pbd-seo-n1124 -->"
HERE = os.path.dirname(os.path.abspath(__file__))
APPLY = "--apply" in sys.argv
rows = json.load(open(os.path.join(HERE, "data", "n1124_replace.json"), encoding="utf-8"))
bad = 0
for p in rows:
    post = t.find_post(p["url"])
    if not post: print("no post", p["url"]); bad += 1; continue
    raw = post["content"]["raw"]
    print("#", post["id"], "title:", post["title"]["raw"], "len", len(raw), "modified", post.get("modified"))
    if "--dump" in sys.argv:
        print("=====RAW BEGIN=====\n" + raw + "\n=====RAW END====="); continue
    if MARK in raw: print("= already applied"); continue
    new = raw
    for old, rep in p.get("replace", []):
        n = new.count(old)
        print(("  ok x%d " % n if n else "  MISSING ") + old[:70])
        if not n: bad += 1
        new = new.replace(old, rep)
    if p.get("prepend"): new = MARK + "\n" + p["prepend"] + "\n" + new
    else: new = MARK + "\n" + new
    body = {"content": new}
    if p.get("title"): body["title"] = p["title"]
    if APPLY:
        if bad: print("abort: missing replacements"); sys.exit(1)
        r = t.wp("POST", f"wp/v2/posts/{post['id']}", json=body)
        print("  write", r.status_code)
        if not r.ok: print(r.text[:300]); sys.exit(1)
print("done", "APPLY" if APPLY else "dry", "missing", bad)
