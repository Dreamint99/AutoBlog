"""Backfill on-topic images for the Next.js sites' D1 articles (modules/site_images.py).

    python fix_site_images.py walvi gccguide            # dry run: counts + samples
    python fix_site_images.py walvi gccguide --apply    # write image_url/body_html to D1

Runs locally with the wrangler login (cwd web/). Each site's changes go out as one SQL file.
"""
import json
import os
import subprocess
import sys
import tempfile

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import site_images  # noqa: E402
from modules.store import get_site  # noqa: E402

WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web")
NPX = "npx.cmd" if os.name == "nt" else "npx"
APPLY = "--apply" in sys.argv
SITES = [a for a in sys.argv[1:] if not a.startswith("--")]


def d1(sql: str = "", file: str = "") -> list:
    args = [NPX, "wrangler", "d1", "execute", "autoblog-content", "--remote", "--json"]
    args += ["--file", file, "--yes"] if file else ["--command", sql]
    r = subprocess.run(args, cwd=WEB, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=600)
    try:
        return json.loads(r.stdout)[0].get("results", [])
    except Exception:
        raise RuntimeError(f"wrangler failed: {r.stdout[-400:]} {r.stderr[-400:]}")


def q(s: str) -> str:
    return "'" + (s or "").replace("'", "''") + "'"


def main():
    for sid in SITES:
        site = get_site(sid)
        ids = [r["id"] for r in d1(f"SELECT id FROM articles WHERE site_id='{sid}' AND status='published' ORDER BY created_at DESC")]
        used: set = set()
        stats = {"photo": 0, "card": 0, "wiki kept": 0, "body changed": 0}
        updates, samples = [], []
        for i in range(0, len(ids), 40):
            chunk = ",".join(q(x) for x in ids[i:i + 40])
            for a in d1(f"SELECT id, title, slug, image_url, body_html FROM articles WHERE id IN ({chunk})"):
                img, body, placed = site_images.choose(a["title"], a["slug"], site, a["body_html"] or "", a["image_url"] or "", used)
                kind = "wiki kept" if img == a["image_url"] else "card" if "/card/" in img else "photo"
                stats[kind] += 1
                if body != (a["body_html"] or ""):
                    stats["body changed"] += 1
                if img != a["image_url"] or body != a["body_html"]:
                    updates.append(f"UPDATE articles SET image_url={q(img)}, body_html={q(body)} WHERE id={q(a['id'])};")
                    if len(samples) < 6:
                        samples.append(f"{kind:9} {a['title'][:60]} → {img[-60:]}")
        print(f"== {sid}: {len(ids)} articles, {len(updates)} to update {stats}")
        for s in samples:
            print("   ", s)
        if APPLY and updates:
            with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f:
                f.write("\n".join(updates))
            d1(file=f.name)
            os.unlink(f.name)
            print(f"   applied {len(updates)} updates")


if __name__ == "__main__":
    main()
