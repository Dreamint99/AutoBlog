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
    "aiu": "https://aiuniversitybd.com/",
}


def call(method, key, site):
    r = requests.get(API + method, params={"siteUrl": site, "apikey": key}, timeout=60)
    r.raise_for_status()
    return r.json().get("d") or []


def _date(r) -> str:
    """Bing JSON dates look like /Date(1697500800000)/ (one bucket per week)."""
    import re as _re
    from datetime import datetime, timezone
    m = _re.search(r"\d{10,}", str(r.get("Date") or ""))
    return datetime.fromtimestamp(int(m.group(0)) / 1000, timezone.utc).strftime("%Y-%m-%d") if m else ""


def week_summary(rows: list) -> dict:
    """Latest Bing week vs the week before (real Bing Webmaster data): totals, top keywords with position,
    rising (trending) keywords. Shown on the Pulse dashboard next to the Google numbers."""
    weeks = sorted({_date(r) for r in rows if _date(r)})
    if not weeks:
        return {"weeks": []}
    cur, prev = weeks[-1], (weeks[-2] if len(weeks) > 1 else None)

    def agg(week):
        out = {}
        for r in rows:
            if _date(r) != week:
                continue
            q = (r.get("Query") or "").strip().lower()
            a = out.setdefault(q, {"impr": 0, "clicks": 0, "pw": 0.0})
            imp = r.get("Impressions") or 0
            a["impr"] += imp
            a["clicks"] += r.get("Clicks") or 0
            a["pw"] += (r.get("AvgImpressionPosition") or 0) * imp
        return out

    c, p = agg(cur), (agg(prev) if prev else {})

    def tot(d):
        imp = sum(a["impr"] for a in d.values())
        return {"clicks": sum(a["clicks"] for a in d.values()), "impr": imp,
                "pos": round(sum(a["pw"] for a in d.values()) / imp, 1) if imp else None}

    def row(q):
        a, b = c.get(q, {}), p.get(q, {})
        return {"key": q, "clicks": a.get("clicks", 0), "clicksPrev": b.get("clicks", 0), "impr": a.get("impr", 0),
                "imprPrev": b.get("impr", 0), "pos": round(a["pw"] / a["impr"], 1) if a.get("impr") else None,
                "posPrev": round(b["pw"] / b["impr"], 1) if b.get("impr") else None}

    rows_ = [row(q) for q in set(c) | set(p) if q]
    top = sorted((x for x in rows_ if x["impr"]), key=lambda x: (-x["clicks"], -x["impr"]))[:15]
    rising = sorted((x for x in rows_ if x["impr"] >= 5 and x["impr"] > 1.5 * max(x["imprPrev"], 1)),
                    key=lambda x: -(x["impr"] - x["imprPrev"]))[:10]
    return {"weeks": weeks[-8:], "week": tot(c), "prevWeek": tot(p), "range": [cur, prev],
            "topQueries": top, "risingQueries": rising}


def main():
    key = os.getenv("BING_WEBMASTER_API_KEY", "").strip()
    if not key:
        print("BING_WEBMASTER_API_KEY not set — skipping Bing pull")
        return
    summary = {"sites": {}}
    for sid, site in SITES.items():
        try:
            rows = call("GetQueryStats", key, site)
        except Exception as e:
            print(f"{sid}: {e}")
            continue
        summary["sites"][sid] = week_summary(rows)
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
    # Pulse dashboard: relayed into KV pulse:bing by push_pulse.py
    json.dump(summary, open(os.path.join(HERE, "data", "bing_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
