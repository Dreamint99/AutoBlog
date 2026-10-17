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
    "aiu": "https://aiuniversitybd.com/",
}
END = date.today() - timedelta(days=2)  # GSC data lags ~2 days
START = END - timedelta(days=90)


def query(sess, prop, dims, limit=25000, start_date=None, end_date=None):
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(prop, safe='')}/searchAnalytics/query"
    rows, start = [], 0
    while True:
        r = sess.post(url, json={"startDate": (start_date or START).isoformat(), "endDate": (end_date or END).isoformat(), "dimensions": dims,
                                 "rowLimit": min(limit, 25000), "startRow": start})
        r.raise_for_status()
        batch = r.json().get("rows", [])
        rows += batch
        if len(batch) < 25000:
            return rows
        start += 25000


def seo_summary(sess, prop: str) -> dict:
    """This week vs last week from Search Console (real data only): totals, daily series, growing pages,
    top queries with their average position, and rising (trending) queries. Shown on the Pulse dashboard."""
    cur0, cur1 = END - timedelta(days=6), END
    pre0, pre1 = END - timedelta(days=13), END - timedelta(days=7)
    daily = query(sess, prop, ["date"], start_date=END - timedelta(days=27), end_date=END)
    series = [{"t": r["keys"][0], "clicks": r["clicks"], "impr": r["impressions"], "pos": round(r["position"], 1)} for r in daily]

    def tot(a, b):
        rs = [x for x in series if a.isoformat() <= x["t"] <= b.isoformat()]
        imp = sum(x["impr"] for x in rs)
        return {"clicks": sum(x["clicks"] for x in rs), "impr": imp,
                "pos": round(sum(x["pos"] * x["impr"] for x in rs) / imp, 1) if imp else None}

    def by(dim, a, b):
        return {r["keys"][0]: r for r in query(sess, prop, [dim], 5000, a, b)}

    pc, pp = by("page", cur0, cur1), by("page", pre0, pre1)
    qc, qp = by("query", cur0, cur1), by("query", pre0, pre1)

    def row(k, c, p):
        return {"key": urllib.parse.unquote(k), "clicks": c.get("clicks", 0), "clicksPrev": p.get("clicks", 0),
                "impr": c.get("impressions", 0), "imprPrev": p.get("impressions", 0),
                "pos": round(c["position"], 1) if c.get("position") else None,
                "posPrev": round(p["position"], 1) if p.get("position") else None}

    pages = [row(k, pc.get(k, {}), pp.get(k, {})) for k in set(pc) | set(pp)]
    queries = [row(k, qc.get(k, {}), qp.get(k, {})) for k in set(qc) | set(qp)]
    growing = sorted((x for x in pages if x["impr"] > x["imprPrev"]),
                     key=lambda x: -((x["clicks"] - x["clicksPrev"]) * 20 + (x["impr"] - x["imprPrev"])))[:10]
    falling = sorted((x for x in pages if x["impr"] < x["imprPrev"]), key=lambda x: (x["impr"] - x["imprPrev"]))[:5]
    top_q = sorted((x for x in queries if x["impr"]), key=lambda x: (-x["clicks"], -x["impr"]))[:15]
    rising = sorted((x for x in queries if x["impr"] >= 5 and x["impr"] > 1.5 * max(x["imprPrev"], 1)),
                    key=lambda x: -(x["impr"] - x["imprPrev"]))[:10]
    return {"week": tot(cur0, cur1), "prevWeek": tot(pre0, pre1), "series": series, "range": [cur0.isoformat(), cur1.isoformat()],
            "growingPages": growing, "fallingPages": falling, "topQueries": top_q, "risingQueries": rising}


def push_kv(summary: dict):
    """Pulse reads pulse:seo from Workers KV (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID in CI)."""
    tok, acct = os.getenv("CLOUDFLARE_API_TOKEN"), os.getenv("CLOUDFLARE_ACCOUNT_ID")
    if not (tok and acct):
        print("no Cloudflare token: pulse:seo not pushed")
        return
    import requests
    r = requests.put(f"https://api.cloudflare.com/client/v4/accounts/{acct}/storage/kv/namespaces/3987a5253d994eea89caaef8a80b724b/values/pulse:seo",
                     headers={"Authorization": f"Bearer {tok}"}, data=json.dumps(summary).encode(), timeout=60)
    print("pulse:seo KV put:", r.status_code, r.text[:150])


def main():
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
    sess = AuthorizedSession(creds)
    seo = {"updatedAt": date.today().isoformat(), "dataTo": END.isoformat(), "sites": {}}
    for sid, prop in SITES.items():
        try:
            seo["sites"][sid] = seo_summary(sess, prop)
        except Exception as e:
            print(f"{sid} seo summary: {e}")
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
    json.dump(seo, open(os.path.join(HERE, "data", "seo_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    push_kv(seo)


if __name__ == "__main__":
    main()
