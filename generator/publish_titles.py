"""Publish articles with EXACT titles (one pipeline run per title).

Usage:
    python publish_titles.py <site_id> "Title one|Title two" ["optional category tag"]

Skips a title if the site already has an article with the same title.
Env DRIP_STYLE (optional) is appended to the site's tone, as in drip.py.
"""
import os
import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store  # noqa: E402
from modules.pipeline import generate_article  # noqa: E402


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    site_id, titles = sys.argv[1], [t.strip() for t in sys.argv[2].split("|") if t.strip()]
    tag = sys.argv[3].strip() if len(sys.argv) > 3 else ""
    site = next((s for s in store.load_sites() if s["id"] == site_id), None)
    if not site:
        print(f"unknown site {site_id}")
        return 2
    style = os.getenv("DRIP_STYLE", "").strip()
    if style:
        site = dict(site, tone=f"{site['tone']} STYLE FOR THIS BATCH: {style}")
    if tag:
        add = store.add_article

        def tagged(a: dict) -> dict:
            a["tags"] = [tag] + [t for t in a.get("tags") or [] if t.strip().lower() != tag.lower()]
            return add(a)

        store.add_article = tagged

    have = {a.get("title", "").strip().lower() for a in store.list_articles(site_id)}
    done, failed = 0, 0
    for t in titles:
        if t.lower() in have:
            print(f"skip (exists): {t}")
            continue
        for attempt in (1, 2):
            try:
                art = generate_article(site, t)
                print(f"✅ {art['title']} ({art['word_count']}w) /{art['slug']}")
                done += 1
                break
            except Exception as e:
                print(f"❌ {t} — {e}" + (" — retrying" if attempt == 1 else ""))
                if attempt == 2:
                    failed += 1
    print(f"=== published {done}, failed {failed} ===")
    return 1 if failed and not done else 0


if __name__ == "__main__":
    sys.exit(main())
