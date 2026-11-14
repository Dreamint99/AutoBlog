"""Build data/visa_extra.json for /visa/<country>/ (visa rules for the Bangladeshi passport).

The visa code itself is read LIVE by the worker from D1 autoblog-content (pi_passport / pi_meta, refreshed weekly
by passport-index.yml from the open passport-index dataset). This file only adds what makes each page
Bangladeshi-specific: Bangla name, official portal (visa_check.json), currency calculator, GAMCA (GCC), government
migration cost, related probashiinfo posts — and the overlap decision (PROBASHI_OVERLAP.md §6).
"""
import html
import json
import os

from babel import Locale

H = os.path.dirname(os.path.abspath(__file__))
BN = Locale("bn").territories
x = json.load(open(os.path.join(H, "research", "pi_bd.json"), encoding="utf-8"))
DEST = json.loads(x[0]["results"][0]["v"])
CODES = json.loads(x[1]["results"][0]["codes"])
posts = json.load(open(os.path.join(H, "audit", "all_posts.json"), encoding="utf-8"))
imp = {p["url"]: p["impressions"] for p in json.load(open(os.path.join(H, "..", "generator", "data", "gsc_probashiinfo.json"), encoding="utf-8"))["pages"]}
vc = json.load(open(os.path.join(H, "data", "visa_check.json"), encoding="utf-8"))
cost = {c["iso2"].upper(): c for c in json.load(open(os.path.join(H, "data", "migration_cost.json"), encoding="utf-8"))["countries"]}

NAME_FIX = {"AE": "সংযুক্ত আরব আমিরাত", "US": "যুক্তরাষ্ট্র (আমেরিকা)", "GB": "যুক্তরাজ্য", "KR": "দক্ষিণ কোরিয়া", "CZ": "চেক প্রজাতন্ত্র",
            "MK": "উত্তর মেসিডোনিয়া", "MY": "মালয়েশিয়া", "SA": "সৌদি আরব"}
SEARCH = {"AE": ["দুবাই", "আমিরাত"], "US": ["আমেরিকা"], "GB": ["যুক্তরাজ্য", "লন্ডন"], "KR": ["কোরিয়া"], "CZ": ["চেক রিপাবলিক"],
          "MK": ["মেসেডোনিয়া"], "IN": ["ইন্ডিয়ান", "ভারত"], "LT": ["লিথুনিয়া"], "SA": ["সৌদি"], "MY": ["মালয়েশিয়া"],
          "CY": ["সাইপ্রাস"], "RS": ["সার্বিয়া", "সাবিয়া"]}
# existing posts that already answer "<country> ভিসা (ভিজিট/টুরিস্ট/আবেদন/কি কি লাগে)" → our page is noindex + links there
OWNED = {"IN": "ইন্ডিয়ান ভিসা করতে কি কি লাগে", "CA": "কানাডা ভিজিট ভিসা", "DE": "জার্মানি ভিসা আবেদন", "IT": "ইতালি ভিসা আবেদন লিংক",
         "CY": "গ্রিক সাইপ্রাস ভিসা আবেদন", "MK": "নর্থ মেসেডোনিয়া ভিসা গাইড", "BY": "বেলারুশ ভিসা গাইড", "AM": "আর্মেনিয়া কীভাবে যাবেন",
         "EE": "বাংলাদেশ থেকে এস্তোনিয়া"}
CUR = {"SA": "saudi-riyal", "AE": "uae-dirham", "QA": "qatari-riyal", "KW": "kuwaiti-dinar", "OM": "omani-rial", "BH": "bahraini-dinar",
       "MY": "malaysian-ringgit", "SG": "singapore-dollar", "GB": "british-pound", "US": "us-dollar", "JO": "jordanian-dinar",
       "MV": "maldivian-rufiyaa", "KR": "korean-won", "JP": "japanese-yen", "RO": "romanian-leu", "RS": "serbian-dinar", "PL": "polish-zloty",
       "CA": "canadian-dollar", "AU": "australian-dollar", "LB": "lebanese-pound", "BN": "brunei-dollar", "MU": "mauritian-rupee"}
EURO = set("AT BE CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES HR".split())
GCC = set("SA AE QA KW OM BH".split())
VC = {c["iso2"].upper(): c for c in vc["countries"] if c["iso2"] != "eu"}


def titles():
    return [(html.unescape(p["title"]["rendered"]), p["link"]) for p in posts]


T = titles()


def related(iso, name):
    keys = SEARCH.get(iso, []) + [name]
    out = []
    for t, u in T:
        if any(k and k in t for k in keys) and not (" থেকে " in t and not t.startswith("বাংলাদেশ থেকে")):
            out.append((imp.get(u, 0), t, u))
    out.sort(reverse=True)
    return [{"title": t, "url": u} for _, t, u in out[:2]]


def main():
    rows = []
    for d, code in zip(DEST, CODES):
        iso = d["iso2"]
        if code == "S" or iso == "BD":
            continue
        name = NAME_FIX.get(iso) or BN.get(iso) or d["name"]
        owned = None
        if iso in OWNED:
            owned = next(({"title": t, "url": u} for t, u in T if OWNED[iso] in t), None)
        rel = related(iso, name)
        portal = VC.get(iso)
        r = {"iso2": iso, "slug": d["slug"], "name": name, "name_en": d["name"], "rel": rel, "owned": owned,
             "portal": {"name": portal["portal"], "url": portal["url"], "check": "/visa-check/" + portal["slug"] + "/"} if portal else None,
             "currency": CUR.get(iso) or ("euro" if iso in EURO else None), "gcc": iso in GCC,
             "cost": {"bdt": cost[iso]["bdt"], "date": cost[iso]["date"]} if iso in cost else None}
        extras = sum(1 for k in ("rel", "portal", "currency", "cost") if r[k]) + (1 if r["gcc"] else 0)
        actionable = code[0] in "FATE"
        r["index"] = not owned and (actionable or extras >= 2)
        rows.append(r)
    # release: actionable first, then the rest, max 100 indexable per day starting tomorrow
    import datetime as dt
    start = dt.date(2026, 11, 15)
    order = sorted([r for r in rows if r["index"]], key=lambda r: (CODES[[d["iso2"] for d in DEST].index(r["iso2"])][0] not in "FAE", r["slug"]))
    for i, r in enumerate(order):
        r["release"] = (start + dt.timedelta(days=i // 100)).isoformat()
    out = {"updated": "2026-11-14", "countries": rows}
    json.dump(out, open(os.path.join(H, "data", "visa_extra.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(len(rows), "countries,", len(order), "indexable,", sum(1 for r in rows if r["owned"]), "owned by posts")


if __name__ == "__main__":
    main()
