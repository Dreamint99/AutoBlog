"""One-off: generate a foundation of SEO articles for the `walvi` site from a
fixed list of high-intent "origin → European destination" work-permit titles.

Runs the full 3-agent DeepSeek pipeline (strategist → writer → optimizer),
embeds Pixabay feature + inline images, adds internal links, assembles SEO
(tables / FAQ / key-takeaways / JSON-LD) and publishes to Supabase.

    python gen_walvi.py            # all titles not already present
"""
import sys
import os
from datetime import datetime

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store
from modules.pipeline import generate_article

SITE_ID = "walvi"
LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "walvi_gen.log")

TITLES = [
    "Qatar to Europe Work Permit: Routes, Cost and Process in 2026",
    "Qatar to Serbia Work Permit: Step-by-Step Guide for Workers",
    "Bangladesh to Serbia Work Permit: Documents, Cost and Timeline",
    "Saudi Arabia to Serbia Work Visa: How Migrant Workers Move",
    "Saudi Arabia to Portugal Work Visa: Complete 2026 Guide",
    "Bangladesh to Portugal Work Visa: Process, Cost and Jobs",
    "Bangladesh to Moldova Work Permit: What Workers Should Know",
    "Qatar to France Work Visa: Routes for Skilled Workers",
    "Bangladesh to Croatia Work Permit: Full Step-by-Step Guide",
    "Bangladesh to Romania Work Visa: Documents, Cost and Process",
    "Bangladesh to Poland Work Permit: Complete Guide for Workers",
    "Qatar to Croatia Work Permit for Skilled Workers",
    "Saudi Arabia to Romania Work Visa: A Practical Guide",
    "UAE to Serbia Work Permit: Process, Cost and Timeline",
    "Bangladesh to Lithuania Work Visa: Step-by-Step Guide",
    "Bangladesh to Hungary Work Permit: The Guest-Worker Route",
    "Europe Work Permit Without IELTS: Countries and How to Apply",
    "How to Spot a Fake European Job Offer: A Worker's Scam Checklist",
    "Cheapest Way to Get a Europe Work Permit From Asia",
    "Europe Work Visa Processing Time by Country in 2026",
]


def log(m: str):
    line = f"{datetime.now():%H:%M:%S} {m}"
    print(line, flush=True)
    try:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def main():
    sites = [s for s in store.load_sites() if s["id"] == SITE_ID]
    if not sites:
        log("unknown site 'walvi' — check sites_config.json")
        return
    site = sites[0]
    existing = {a.get("title", "").strip().lower() for a in store.list_articles(SITE_ID)}
    log(f"start: {len(TITLES)} titles, {len(existing)} already on walvi")
    done = fail = skip = 0
    for i, t in enumerate(TITLES, 1):
        if t.strip().lower() in existing:
            skip += 1
            log(f"[{i:02d}/{len(TITLES)}] ⏭  exists: {t}")
            continue
        log(f"[{i:02d}/{len(TITLES)}] ▶  {t}")
        try:
            art = generate_article(site, t, log=lambda _m: None)
            done += 1
            img = "img✓" if art.get("image_url") else "img✗"
            log(f"[{i:02d}/{len(TITLES)}] ✅ {art['title']} — {art['word_count']}w · {img}")
        except Exception as e:
            fail += 1
            log(f"[{i:02d}/{len(TITLES)}] ❌ {t} — {type(e).__name__}: {e}")
    log(f"=== DONE: {done} published · {skip} skipped · {fail} failed ===")


if __name__ == "__main__":
    main()
