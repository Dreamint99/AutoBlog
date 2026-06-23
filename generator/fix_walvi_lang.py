"""Repair: delete any Bengali-language walvi articles and regenerate their
English source titles. The optimizer localized some 'Bangladesh to X' topics to
Bangla even though walvi is English-first; sites_config now forces English, so
regenerating produces English articles.

    python fix_walvi_lang.py
"""
import sys
import os
import re

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from modules import store
from modules.pipeline import generate_article

SITE_ID = "walvi"
LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "walvi_fix.log")
BENGALI = re.compile(r"[ঀ-৿]")

REDO = [
    "Bangladesh to Moldova Work Permit: What Workers Should Know",
    "Bangladesh to Croatia Work Permit: Full Step-by-Step Guide",
    "Bangladesh to Lithuania Work Visa: Step-by-Step Guide",
    "Bangladesh to Hungary Work Permit: The Guest-Worker Route",
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
    site = [s for s in store.load_sites() if s["id"] == SITE_ID][0]
    arts = store.list_articles(SITE_ID)
    beng = [a for a in arts if BENGALI.search(a.get("title", "") or "") or BENGALI.search((a.get("body_html", "") or "")[:600])]
    log(f"found {len(beng)} Bengali article(s) to delete")
    for a in beng:
        store.delete_article(a["id"])
        log(f"  🗑  deleted: {a.get('title', '')[:48]}")
    log(f"regenerating {len(REDO)} title(s) in forced English…")
    ok = fail = 0
    for i, t in enumerate(REDO, 1):
        try:
            art = generate_article(site, t, log=lambda _m: None)
            ok += 1
            is_bn = bool(BENGALI.search(art.get("title", "")))
            log(f"[{i}/{len(REDO)}] {'⚠️BENGALI' if is_bn else '✅'} {art['title']} ({art['word_count']}w)")
        except Exception as e:
            fail += 1
            log(f"[{i}/{len(REDO)}] ❌ {t} — {type(e).__name__}: {e}")
    log(f"=== fix done: {ok} regenerated, {fail} failed ===")


if __name__ == "__main__":
    main()
