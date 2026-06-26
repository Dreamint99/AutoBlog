"""Generate a fixed list of Top 10 articles for Countly (user-requested topics).
Uses the standard pipeline (reliable Pixabay images now) and guarantees the
'Top 10' marker survives the optimizer rewrite so they land on /top10.
"""
import os
import sys
from datetime import datetime

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store
from modules.pipeline import generate_article

TITLES = [
    "Top 10 Banks in Bangladesh",
    "Top 10 Universities in Bangladesh",
    "Top 10 Travel Agencies in Dhaka",
    "Top 10 Travel Agencies in Qatar",
    "Top 10 Hypermarkets in Qatar",
]

_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "drip.log")


def log(msg: str):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    print(line)
    try:
        with open(_LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def ensure_top10(art: dict, original_title: str):
    fields = {}
    title = art.get("title", "")
    if "top 10" not in title.lower() and "top ten" not in title.lower():
        new_title = original_title if "top 10" in original_title.lower() else f"Top 10 {title}"
        art["title"] = new_title
        fields["title"] = new_title
    tags = list(art.get("tags") or [])
    if not any("top 10" in str(x).lower() for x in tags):
        tags = ["Top 10"] + tags
        fields["tags"] = tags
    if fields and art.get("id"):
        try:
            store.update_article(art["id"], fields)
        except Exception as e:
            log(f"[countly/list] patch failed {art.get('id')} - {e}")


def main():
    site = store.get_site("countly")
    if not site:
        log("countly site not found")
        return
    done = 0
    for t in TITLES:
        try:
            art = generate_article(site, t)
            ensure_top10(art, t)
            done += 1
            log(f"[countly/list] OK {art['title']} ({art['word_count']}w)")
        except Exception as e:
            log(f"[countly/list] FAIL {t} - {e}")
    log(f"=== countly list done +{done} ===")


if __name__ == "__main__":
    main()
