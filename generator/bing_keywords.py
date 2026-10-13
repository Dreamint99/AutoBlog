"""Weekly gold-keyword finder on Bing's free Keyword Research API (same BING_WEBMASTER_API_KEY).

For each site's niche seeds, GetRelatedKeywords returns real searches with their Bing
impressions. The biggest ones go into data/demand_<site>.json with src "bingkw"; drip.py
then writes only those no existing article covers (its topic-word coverage check), so the
queue fills itself with high-volume gaps. Ubersuggest's free plan (3 reports/day) is kept for
manual spot checks.
"""
import json
import os
import sys
from datetime import date, timedelta

import requests

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://ssl.bing.com/webmaster/api.svc/json/GetRelatedKeywords"
# site → (country, language, seeds). Seeds are the niche's head terms; Bing expands them.
SEEDS = {
    "countly": ("us", "en-US", ["richest people", "population by country", "most spoken languages", "most popular",
                                "largest countries", "most visited", "world ranking", "net worth"]),
    "infkey": ("us", "en-US", ["ai tools", "chatgpt prompts", "best ai", "ai image generator", "gpu price", "ai app"]),
    "walvi": ("us", "en-US", ["work visa", "work permit", "visa sponsorship jobs", "schengen visa", "skilled worker visa"]),
    "gccguide": ("us", "en-US", ["dubai salary", "saudi salary", "qatar jobs", "uae visa", "iqama", "dubai cost of living"]),
    "ninetymins": ("us", "en-US", ["premier league", "champions league", "football transfer", "world cup 2026", "la liga"]),
}


def related(key, q, country, lang):
    end = date.today() - timedelta(days=3)
    start = end - timedelta(days=90)
    for fmt in (lambda d: d.isoformat(), lambda d: f"/Date({int((d - date(1970, 1, 1)).total_seconds() * 1000)})/"):
        try:
            r = requests.get(API, params={"q": q, "country": country, "language": lang, "startDate": fmt(start),
                                          "endDate": fmt(end), "apikey": key}, timeout=60)
            if r.status_code == 200:
                return r.json().get("d") or []
            last = f"{r.status_code} {r.text[:200]}"
        except Exception as e:
            last = str(e)
    print(f"   {q}: {last}")
    return []


def main():
    key = os.getenv("BING_WEBMASTER_API_KEY", "").strip()
    if not key:
        print("BING_WEBMASTER_API_KEY not set — skipping")
        return
    for sid, (country, lang, seeds) in SEEDS.items():
        found = {}
        for s in seeds:
            for k in related(key, s, country, lang):
                q = (k.get("Query") or "").strip().lower()
                imp = k.get("Impressions") or k.get("BroadImpressions") or 0
                if q and len(q.split()) >= 2 and imp >= 50:
                    found[q] = max(found.get(q, 0), imp)
        top = sorted(found.items(), key=lambda x: -x[1])[:80]
        dpath = os.path.join(HERE, "data", f"demand_{sid}.json")
        try:
            d = json.load(open(dpath, encoding="utf-8"))
        except Exception:
            d = {"queries": []}
        rest = [x for x in d.get("queries", []) if x.get("src") != "bingkw"]
        have = {x["q"].lower() for x in rest}
        gold = [x for x in rest if x.get("src") == "gold"]  # hand-picked Ubersuggest gold stays first
        other = [x for x in rest if x.get("src") != "gold"]
        new = [{"q": q, "impr": v, "pos": None, "src": "bingkw"} for q, v in top if q not in have]
        d["queries"] = gold + new + other
        json.dump(d, open(dpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"{sid}: {len(found)} Bing keywords, top: " + ", ".join(f"{q} ({v})" for q, v in top[:6]))


if __name__ == "__main__":
    main()
