"""Add Ubersuggest "gold" keywords (high volume, low competition) to a site's demand queue.

    python gold_add.py <site_id> <candidates.json>

candidates.json: [{"q": "...", "volume": 9900, "competition": 0.01}, ...] (straight from the
Ubersuggest MCP keyword_suggestions results). Keeps volume >= 1000 and competition <= 0.1,
drops anything an existing published article already covers (drip's topic-word check),
and puts the rest first in data/demand_<site>.json with src "gold". Needs wrangler login (D1).
Used by the daily "ubersuggest-gold" scheduled task; Bing's keyword API (bing_keywords.py)
fills the rest weekly.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import drip
from fix_site_images import d1
from modules import pipeline as P


def main():
    sid, path = sys.argv[1], sys.argv[2]
    cands = json.load(open(path, encoding="utf-8"))
    titles = [r["title"] for r in d1(f"SELECT title FROM articles WHERE site_id='{sid}' AND status='published'")]
    tok = [P._tokens(t) for t in titles]
    dpath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", f"demand_{sid}.json")
    try:
        d = json.load(open(dpath, encoding="utf-8"))
    except Exception:
        d = {"queries": []}
    queued = {x["q"].lower() for x in d.get("queries", [])}
    new, picked = [], []
    for c in sorted(cands, key=lambda c: -(c.get("volume") or 0)):
        q = (c.get("q") or c.get("keyword") or "").strip().lower()
        v, comp = c.get("volume") or 0, c.get("competition")
        if not q or v < 1000 or (comp is not None and comp > 0.1) or q in queued:
            continue
        core = drip._topic_words(q)
        if not core or any(drip._covers(h, core) for h in tok + picked):
            continue
        picked.append(core)  # one article per topic even if several phrasings qualify
        new.append({"q": q, "impr": v, "pos": None, "src": "gold", "volume": v})
    gold = [x for x in d.get("queries", []) if x.get("src") == "gold"]
    rest = [x for x in d.get("queries", []) if x.get("src") != "gold"]
    d["queries"] = sorted(gold + new, key=lambda x: -(x.get("volume") or 0)) + rest
    json.dump(d, open(dpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{sid}: +{len(new)} gold keywords: " + ", ".join(f"{x['q']} ({x['volume']})" for x in new))


if __name__ == "__main__":
    main()
