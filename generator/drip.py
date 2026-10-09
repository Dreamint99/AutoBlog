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
import json
import os
import time
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
# Optional batch knobs (used by the manual-batch workflow):
#   DRIP_TAG   — forced FIRST tag, which sites render as the article's category label
#   DRIP_STYLE — extra writing-style guidance appended to the site's tone
TAG = os.getenv("DRIP_TAG", "").strip()
STYLE = os.getenv("DRIP_STYLE", "").strip()
_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "drip.log")

if TAG:
    _add_article = store.add_article

    def _add_tagged(article: dict) -> dict:
        rest = [t for t in article.get("tags") or [] if t.strip().lower() != TAG.lower()]
        article["tags"] = [TAG] + rest
        return _add_article(article)

    store.add_article = _add_tagged


def log(msg: str):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    print(line)
    try:
        with open(_LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def _coverage(site_id: str):
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", f"coverage_{site_id}.json")
    try:
        return json.load(open(p, encoding="utf-8"))
    except Exception:
        return None


def coverage_seed(cov: dict, titles: list[str]) -> str:
    """Least-covered country first, then its least-covered topic, then the next idea for that cell —
    so a site like GCCGuide fills every country x topic instead of writing about one country."""
    import re as _re
    cs = {c: _re.compile(v[0], _re.I) for c, v in cov["countries"].items()}
    ts = [(t, _re.compile(t["re"], _re.I)) for t in cov["topics"]]
    cnt = {c: sum(1 for x in titles if r.search(x)) for c, r in cs.items()}
    country = min(cnt, key=lambda c: (cnt[c], list(cs).index(c)))
    mine = [x for x in titles if cs[country].search(x)]
    tc = [(sum(1 for x in mine if r.search(x)), i, t) for i, (t, r) in enumerate(ts)]
    have, _, topic = min(tc, key=lambda z: (z[0], z[1]))
    idea = topic["ideas"][have % len(topic["ideas"])]
    label = cov["countries"][country][1]
    return (f"{label}: {idea}. The title MUST name {country} explicitly and be about {country} only "
            f"(not Qatar or another GCC country unless it is {country}).")


def drip_site(site: dict):
    if STYLE:
        site = dict(site, tone=f"{site['tone']} STYLE FOR THIS BATCH: {STYLE}")
    existing = store.list_articles(site["id"])
    have = len(existing)
    if have >= TARGET:
        log(f"[{site['id']}] at target ({have}/{TARGET}) — skip")
        return 0
    n = min(PER_RUN, TARGET - have)
    avoid = [a.get("title", "") for a in existing] + [a.get("keyword", "") for a in existing]
    try:  # never reuse a hero photo another article already has
        from modules import image as _img
        _img._USED.update(a.get("image_url") for a in existing if a.get("image_url"))
    except Exception:
        pass
    cov = None if SEED else _coverage(site["id"])
    if cov:
        seen = [a.get("title", "") for a in existing]
        titles = []
        for _ in range(n):
            seed = coverage_seed(cov, seen + titles)
            log(f"[{site['id']}] coverage seed: {seed[:110]}")
            got = []
            for wait in (0, 20, 45):  # free LLM chain sometimes returns nothing when rate-limited
                if wait:
                    time.sleep(wait)
                got = suggest_titles(site, count=1, seed=seed, avoid=avoid + titles)
                if got:
                    break
            titles += got
    else:
        titles = suggest_titles(site, count=n, seed=SEED, avoid=avoid)
    log(f"[{site['id']}] planning {len(titles)} new ({have}/{TARGET})" + (f" [seed: {SEED}]" if SEED else ""))
    done = 0
    for t in titles:
        # One retry: a rejected draft (thin, wrong language, all providers briefly
        # rate-limited) usually succeeds on a second pass.
        for attempt in (1, 2):
            try:
                art = generate_article(site, t)
                done += 1
                log(f"[{site['id']}] ✅ {art['title']} ({art['word_count']}w)")
                break
            except Exception as e:
                log(f"[{site['id']}] ❌ {t} — {e}" + (" — retrying" if attempt == 1 else ""))
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
