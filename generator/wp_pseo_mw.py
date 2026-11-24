"""probashiinfo minimum-wage batch 1 (approved by Ahmed 2026-11-24): create 7 posts from
data/pseo_mw/*.html with Rank Math title/description/focus keyword, and apply the Greece
minimum-wage fact fix (data/pseo_greece.json). Slugs of existing posts are never changed.
  python wp_pseo_mw.py           # dry run
  python wp_pseo_mw.py --apply   # write
Idempotent: new posts are skipped if the slug exists; Greece is skipped if its marker is present."""
import json, os, sys
import wp_seo_t124 as t
HERE = os.path.dirname(os.path.abspath(__file__))
APPLY = "--apply" in sys.argv
GMARK = "<!-- pbd-seo-pseo-greece -->"
bad = 0
pages = json.load(open(os.path.join(HERE, "data", "pseo_mw", "pages.json"), encoding="utf-8"))
for p in pages:
    html = open(os.path.join(HERE, "data", "pseo_mw", p["slug"] + ".html"), encoding="utf-8").read()
    r = t.wp("GET", "wp/v2/posts", params={"slug": p["slug"], "status": "publish,draft,pending,future,private", "context": "edit"})
    if not r.ok: print("lookup fail", p["slug"], r.status_code, r.text[:200]); bad += 1; continue
    if r.json(): print("= exists", p["slug"], r.json()[0]["id"], r.json()[0]["status"]); continue
    print("+ create", p["slug"], "len", len(html), "cats", p["categories"])
    if APPLY:
        body = {"title": p["title"], "slug": p["slug"], "status": "publish", "content": html,
                "excerpt": p["excerpt"], "categories": p["categories"], "meta": p["meta"]}
        w = t.wp("POST", "wp/v2/posts", json=body)
        print("  write", w.status_code, (w.json().get("link") if w.ok else w.text[:300]))
        if not w.ok: bad += 1; continue
        got = w.json()
        if got.get("slug") != p["slug"]: print("  SLUG MISMATCH", got.get("slug")); bad += 1
        m = got.get("meta", {})
        print("  meta ok" if all(m.get(k) == v for k, v in p["meta"].items()) else f"  META MISMATCH {m}")
for p in json.load(open(os.path.join(HERE, "data", "pseo_greece.json"), encoding="utf-8")):
    post = t.find_post(p["url"])
    if not post: print("no post", p["url"]); bad += 1; continue
    raw = post["content"]["raw"]
    print("# greece", post["id"], post["slug"], "modified", post.get("modified"))
    if p.get("meta") and APPLY:
        w = t.wp("POST", f"wp/v2/posts/{post['id']}", json={"meta": p["meta"]})
        print("  greece meta", w.status_code, all(w.json().get("meta", {}).get(k) == v for k, v in p["meta"].items()) if w.ok else w.text[:200])
        if not w.ok: bad += 1
    if GMARK in raw: print("= greece already applied"); continue
    new = raw
    for old, rep in p["replace"]:
        n = new.count(old)
        print(("  ok x%d " % n if n else "  MISSING ") + old[:70])
        if not n: bad += 1
        new = new.replace(old, rep)
    left = new.count("৮৮০")
    print("  remaining ৮৮০:", left)
    import re as _re
    for m in _re.finditer("৮৮০", new): print("  CTX", repr(new[max(0,m.start()-150):m.end()+60]))
    if APPLY:
        if bad or left: print("abort greece: missing replacements or leftover 880"); sys.exit(1)
        w = t.wp("POST", f"wp/v2/posts/{post['id']}", json={"content": GMARK + "\n" + new})
        print("  write", w.status_code, w.json().get("slug") if w.ok else w.text[:300])
        if not w.ok: sys.exit(1)
print("done", "APPLY" if APPLY else "dry", "problems", bad)
sys.exit(1 if bad else 0)
