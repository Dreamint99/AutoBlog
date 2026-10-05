"""Daily drip — publish a few NEW unique articles per run, until a site hits its target.

This is the Google-safe way to scale: gradual cadence, not a one-shot mass dump.
Runs the full 3-agent SEO pipeline and writes straight to Supabase (no admin server needed),
so it can be scheduled (Windows Task Scheduler / cron).

Usage:
    python drip.py [site_id] [count_per_run] [target_total]
Examples:
    python drip.py qatarexperts 3 50      # 3 new/day until the site has 50
    python drip.py all 1 50               # 1 new/day for EVERY site until each has 50
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
from modules.pipeline import generate_article, suggest_titles

SITE = sys.argv[1] if len(sys.argv) > 1 else "qatarexperts"
PER_RUN = int(sys.argv[2]) if len(sys.argv) > 2 else 3
TARGET = int(sys.argv[3]) if len(sys.argv) > 3 else 50
# Optional 4th arg: a seed/theme so this run's titles stay in one category
# (e.g. "richest billionaires net worth" for Countly's daily wealth article).
SEED = sys.argv[4] if len(sys.argv) > 4 else ""
_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "drip.log")


def log(msg: str):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    print(line)
    try:
        with open(_LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def drip_site(site: dict):
    existing = store.list_articles(site["id"])
    have = len(existing)
    if have >= TARGET:
        log(f"[{site['id']}] at target ({have}/{TARGET}) — skip")
        return 0
    n = min(PER_RUN, TARGET - have)
    avoid = [a.get("title", "") for a in existing] + [a.get("keyword", "") for a in existing]
    titles = suggest_titles(site, count=n, seed=SEED, avoid=avoid)
    log(f"[{site['id']}] planning {len(titles)} new ({have}/{TARGET})" + (f" [seed: {SEED}]" if SEED else ""))
    done = 0
    for t in titles:
        try:
            art = generate_article(site, t)
            done += 1
            log(f"[{site['id']}] ✅ {art['title']} ({art['word_count']}w)")
        except Exception as e:
            log(f"[{site['id']}] ❌ {t} — {e}")
    log(f"[{site['id']}] drip done +{done} → {have + done}/{TARGET}")
    if done == 0:
        _FAILED.append(site["id"])
    return done


# Sites that were below target but published nothing — makes the run exit non-zero so
# a dead LLM key shows up as a red CI run instead of weeks of silent "success".
_FAILED: list[str] = []


def main():
    if SITE == "all":
        # `all` only touches sites with drip_enabled != false. Sites turned off here
        # (or covered by their own dedicated task, e.g. probashiinfo) are skipped.
        sites = [s for s in store.load_sites() if s.get("drip_enabled", True)]
    else:
        # Explicit site arg always runs, even if drip_enabled is false (dedicated tasks).
        sites = [s for s in store.load_sites() if s["id"] == SITE]
    if not sites:
        log(f"unknown site '{SITE}'")
        return
    total = sum(drip_site(s) for s in sites)
    log(f"=== run complete: +{total} article(s) ===")
    if _FAILED:
        log(f"FAILED: no article published for {', '.join(_FAILED)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
