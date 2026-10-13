"""Weekly Bing Webmaster pull (API key in env BING_WEBMASTER_API_KEY).

Bing is the bigger search source for most of the network (countly: 1.7K Bing clicks vs 7 on
Google), so its real queries feed drip.py the same way Search Console's do:
  data/bing_<site>.json    top queries with clicks/impressions/position
  data/demand_<site>.json  queries ranking 8+ are added with src "bing" (other sources kept)
Run after gsc_pull.py in .github/workflows/gsc-pull.yml.
"""
import json
import os
import sys

import requests

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://ssl.bing.com/webmaster/api.svc/json/"
SITES = {
    "probashiinfo": "https://probashiinfo.com/",
    "countly": "https://countly.net/",
    "walvi": "https://visapoint.net/",
    "infkey": "https://infkey.com/",
    "gccguide": "https://gccguide.com/",
    "ninetymins": "https://ninetymins.com/",
    "cob": "https://coloursofbangladesh.com/",
}


def call(method, key, site):
    r = requests.get(API + method, params={"siteUrl": site, "apikey": key}, timeout=60)
    r.raise_for_status()
    return r.json().get("d") or []


def main():
    key = os.getenv("BING_WEBMASTER_API_KEY", "").strip()
    if not key:
        print("BING_WEBMASTER_API_KEY not set — skipping Bing pull")
        return
    for sid, site in SITES.items():
        try:
            rows = call("GetQueryStats", key, site)
        except Exception as e:
            print(f"{sid}: {e}")
            continue
        # rows are weekly buckets per query: sum them, impression-weighted position
        agg = {}
        for r in rows:
            q = (r.get("Query") or "").strip().lower()
            if not q:
                continue
            a = agg.setdefault(q, {"q": q, "impr": 0, "clicks": 0, "pos_w": 0.0})
            imp = r.get("Impressions") or 0
            a["impr"] += imp
            a["clicks"] += r.get("Clicks") or 0
            a["pos_w"] += (r.get("AvgImpressionPosition") or 0) * imp
        out = []
        for a in agg.values():
            a["pos"] = round(a.pop("pos_w") / max(a["impr"], 1), 1)
            out.append(a)
        out.sort(key=lambda a: -a["impr"])
        json.dump({"source": "Bing Webmaster GetQueryStats", "queries": out[:1000]},
                  open(os.path.join(HERE, "data", f"bing_{sid}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

        demand = [{"q": a["q"], "impr": a["impr"], "pos": a["pos"], "src": "bing"} for a in out
                  if a["impr"] >= 10 and a["pos"] >= 8 and len(a["q"].split()) >= 2]
        if sid == "walvi":
            demand = [q for q in demand if "visa check" not in q["q"] and "visa status" not in q["q"]]
        dpath = os.path.join(HERE, "data", f"demand_{sid}.json")
        try:
            old = json.load(open(dpath, encoding="utf-8"))
        except Exception:
            old = {"queries": []}
        keep = [q for q in old.get("queries", []) if q.get("src") != "bing"]
        have = {q["q"].lower() for q in keep}
        old["queries"] = keep + [q for q in demand[:150] if q["q"] not in have]
        json.dump(old, open(dpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"{sid}: {len(out)} Bing queries, {sum(a['clicks'] for a in out)} clicks, "
              f"{sum(a['impr'] for a in out)} impressions, {len(demand)} demand")


if __name__ == "__main__":
    main()
