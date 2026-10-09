"""Daily "hot keyword" article — ONE extra article per site, on the single
highest-scoring trending keyword that fits the site (see modules/trend_radar.py).

Usage:
    python hot_drip.py infkey countly walvi ninetymins
    python hot_drip.py infkey --dry-run      # print the picks, publish nothing
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
from modules.pipeline import generate_article, suggest_titles
from modules.trend_radar import hot_topics

DRY = "--dry-run" in sys.argv
SITES = [a for a in sys.argv[1:] if not a.startswith("--")]


def log(msg: str):
    print(f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}", flush=True)


def run(site: dict) -> bool:
    existing = store.list_articles(site["id"])
    avoid = [a.get("title", "") for a in existing] + [a.get("keyword", "") for a in existing]
    picks = hot_topics(site, max_out=5, avoid=avoid, log=log)
    log(f"[{site['id']}] {len(picks)} trending picks")
    for p in picks:
        log(f"   {p['score']:>6}  rel {p['relevance']}  ~{p['traffic']}  {'✓' if p['validated'] else ' '}  {p['keyword']}  — {p['angle']}  [{p['source']}]")
    if DRY or not picks:
        return bool(picks)
    for p in picks[:3]:  # try the next pick if a draft gets rejected
        seed = f"{p['keyword']} — {p['angle']}" if p.get("angle") else p["keyword"]
        titles = suggest_titles(site, count=1, seed=f"TRENDING KEYWORD (use it in the title): {seed}", avoid=avoid)
        if not titles:
            continue
        try:
            art = generate_article(site, titles[0])
            log(f"[{site['id']}] ✅ HOT {art['title']} ({art['word_count']}w) ← {p['keyword']}")
            return True
        except Exception as e:
            log(f"[{site['id']}] ❌ {titles[0]} — {e}")
    return False


def main():
    sites = {s["id"]: s for s in store.load_sites()}
    failed = [sid for sid in SITES if sid in sites and not run(sites[sid])]
    if failed:
        log(f"no hot article for: {', '.join(failed)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
