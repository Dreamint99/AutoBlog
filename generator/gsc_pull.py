"""Weekly Search Console pull (no key file: GitHub OIDC → Workload Identity → gsc-reader).

For every network site it writes, from the last 90 days:
  data/gsc_<site>.json     pages with clicks/impressions/CTR/position and their top queries
                           (the format wp_ctr.py / wp_faq_boost.py read for probashiinfo)
  data/demand_<site>.json  real queries the site appears for at position 8+ — drip.py writes
                           the missing answer first (entries from other sources, e.g. Bing AI,
                           are kept)
Run in CI by .github/workflows/gsc-pull.yml; locally it needs gcloud application-default login.
"""
import json
import os
import sys
import urllib.parse
from datetime import date, timedelta

import google.auth
from google.auth.transport.requests import AuthorizedSession

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
SITES = {  # drip/site id → Search Console property
    "probashiinfo": "https://probashiinfo.com/",
    "countly": "https://countly.net/",
    "walvi": "https://visapoint.net/",
    "infkey": "https://infkey.com/",
    "gccguide": "https://gccguide.com/",
    "ninetymins": "https://ninetymins.com/",
    "cob": "https://coloursofbangladesh.com/",
}
END = date.today() - timedelta(days=2)  # GSC data lags ~2 days
START = END - timedelta(days=90)


def query(sess, prop, dims, limit=25000):
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(prop, safe='')}/searchAnalytics/query"
    rows, start = [], 0
    while True:
        r = sess.post(url, json={"startDate": START.isoformat(), "endDate": END.isoformat(), "dimensions": dims,
                                 "rowLimit": min(limit, 25000), "startRow": start})
        r.raise_for_status()
        batch = r.json().get("rows", [])
        rows += batch
        if len(batch) < 25000:
            return rows
        start += 25000


def main():
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
    sess = AuthorizedSession(creds)
    for sid, prop in SITES.items():
        try:
            pages = query(sess, prop, ["page"])
            pq = query(sess, prop, ["page", "query"])
        except Exception as e:
            print(f"{sid}: {e}")
            continue
        by_page = {}
        for r in pages:
            u = urllib.parse.unquote(r["keys"][0]).split("#")[0]
            p = by_page.setdefault(u, {"url": u, "impressions": 0, "clicks": 0, "pos_w": 0.0, "queries": []})
            p["impressions"] += r["impressions"]
            p["clicks"] += r["clicks"]
            p["pos_w"] += r["position"] * r["impressions"]
        for r in pq:
            u = urllib.parse.unquote(r["keys"][0]).split("#")[0]
            if u in by_page:
                by_page[u]["queries"].append([r["keys"][1], r["impressions"], r["clicks"], round(r["position"], 1)])
        out = []
        for p in by_page.values():
            p["position"] = round(p.pop("pos_w") / max(p["impressions"], 1), 1)
            p["ctr"] = round(p["clicks"] / max(p["impressions"], 1), 4)
            p["queries"] = sorted(p["queries"], key=lambda q: -q[1])[:12]
            out.append(p)
        out.sort(key=lambda p: -p["impressions"])
        json.dump({"source": f"Search Console API {START}..{END}", "pages": out},
                  open(os.path.join(HERE, "data", f"gsc_{sid}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

        # demand: queries we show for but rank 8+ (or barely), most impressions first
        seen, demand = set(), []
        for r in sorted(pq, key=lambda r: -r["impressions"]):
            q = r["keys"][1]
            if q in seen or r["impressions"] < 10 or r["position"] < 8 or len(q.split()) < 2:
                continue
            seen.add(q)
            demand.append({"q": q, "impr": r["impressions"], "pos": round(r["position"], 1), "src": "gsc"})
        dpath = os.path.join(HERE, "data", f"demand_{sid}.json")
        try:
            old = json.load(open(dpath, encoding="utf-8"))
        except Exception:
            old = {"queries": []}
        keep = [q for q in old.get("queries", []) if q.get("src") != "gsc"]  # e.g. Bing AI queries added by hand
        if sid == "walvi":  # the /visa-check/<country> tool pages own these queries
            demand = [q for q in demand if "visa check" not in q["q"] and "visa status" not in q["q"]]
        json.dump({"_note": f"Real queries (Search Console {START}..{END}, position 8+), refreshed weekly by gsc_pull.py; "
                            "other sources kept.", "queries": keep + demand[:150]},
                  open(dpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        clicks = sum(p["clicks"] for p in out)
        impr = sum(p["impressions"] for p in out)
        print(f"{sid}: {len(out)} pages, {clicks} clicks, {impr} impressions, {len(demand)} demand queries")


if __name__ == "__main__":
    main()
