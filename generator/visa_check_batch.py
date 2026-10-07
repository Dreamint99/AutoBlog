"""Generate "How to check <Country> visa" guides for VisaPoint (tag: Visa Check).

The official portal for each country comes from web/src/data/visa-check.json
(the same file the site renders), and is handed to the writer as the ONLY
allowed source — so guides never invent a look-alike URL.

Usage:
    python visa_check_batch.py            # every country that has no guide yet
    python visa_check_batch.py 3          # at most 3 new guides this run
    python visa_check_batch.py qatar serbia
"""
import json
import os
import sys
from datetime import datetime

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store  # noqa: E402
from modules.pipeline import generate_article  # noqa: E402

TAG = "Visa Check"
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "src", "data", "visa-check.json")


def title_for(e: dict) -> str:
    year = datetime.now().year
    name = e["country"].replace(" (via VFS Global)", "")
    if e["slug"] == "schengen-vfs":
        return f"How to Check Schengen Visa Status Online ({year}): VFS Tracking Step by Step"
    return f"How to Check {name} Visa Status Online ({year}): Step-by-Step Guide"


def style_for(e: dict) -> str:
    return (
        "This is a 'how to check your visa status online' guide written like an embassy help page: calm, exact, "
        "numbered steps. Use ONLY this official source and do not invent any other URL, app, phone number or fee: "
        f"official portal = {e['portal']} at {e['url']}"
        + (f"; also {e['app']}" if e.get("app") else "")
        + f". What the applicant needs: {', '.join(e['need'])}. Key fact: {e['tip']} "
        "Cover: where to check (official portal only), what you need, numbered steps, what each status means, "
        "how to download/print the result, how to spot a FAKE visa (not found on the official portal, details "
        "mismatch, non-government website, extra 'activation' fees), and what to do if the visa does not show. "
        "Audience: workers from Bangladesh and South Asia. Say clearly that checking on the official portal is free "
        "and that agents' look-alike sites are a scam risk. If the country has no public online tracker, say so "
        "honestly and explain the embassy route."
    )


def main() -> int:
    entries = json.load(open(DATA, encoding="utf-8"))["countries"]
    args = sys.argv[1:]
    limit = int(args[0]) if len(args) == 1 and args[0].isdigit() else None
    only = {a for a in args if not a.isdigit()}

    site = next(s for s in store.load_sites() if s["id"] == "walvi")
    existing = store.list_articles("walvi")
    have = " ".join(a.get("title", "").lower() for a in existing if TAG.lower() in [t.lower() for t in a.get("tags") or []])

    add_article = store.add_article

    def tagged(article: dict) -> dict:
        rest = [t for t in article.get("tags") or [] if t.strip().lower() != TAG.lower()]
        article["tags"] = [TAG] + rest
        return add_article(article)

    store.add_article = tagged

    done = 0
    for e in entries:
        name = e["country"].replace(" (via VFS Global)", "").lower()
        if only and e["slug"] not in only:
            continue
        if not only and (f"check {name} visa" in have or (e["slug"] == "schengen-vfs" and "schengen visa status" in have)):
            print(f"[{e['slug']}] already has a guide — skip")
            continue
        if limit is not None and done >= limit:
            break
        s = dict(site, tone=f"{site['tone']} STYLE FOR THIS GUIDE: {style_for(e)}")
        t = title_for(e)
        for attempt in (1, 2):
            try:
                art = generate_article(s, t)
                print(f"[{e['slug']}] ✅ {art['title']} ({art['word_count']}w)")
                done += 1
                break
            except Exception as ex:
                print(f"[{e['slug']}] ❌ {t} — {ex}" + (" — retrying" if attempt == 1 else ""))
    print(f"=== visa-check batch: +{done} guide(s) ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
