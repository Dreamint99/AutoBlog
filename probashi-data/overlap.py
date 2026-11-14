"""Overlap map: which planned data pages would compete with existing probashiinfo posts.

Inputs: audit/all_posts.json (WP REST dump), ../generator/data/gsc_probashiinfo.json (90 days of queries).
Output: overlap.json (machine) — PROBASHI_OVERLAP.md is written from it by hand + this script's summary.
Rule: one query = one URL. A page type for a country is BLOCKED when an existing post title, or a GSC
query that an existing URL already gets impressions for, matches the same intent for that country.
"""
import html
import json
import os
import re
import sys
import urllib.parse as up

from babel import Locale

H = os.path.dirname(os.path.abspath(__file__))
posts = json.load(open(os.path.join(H, "audit", "all_posts.json"), encoding="utf-8"))
gsc = json.load(open(os.path.join(H, "..", "generator", "data", "gsc_probashiinfo.json"), encoding="utf-8"))["pages"]
BN = Locale("bn").territories
EXTRA = {  # spellings used on the site
    "SA": ["সৌদি"], "AE": ["দুবাই", "আমিরাত", "UAE", "Dubai"], "MY": ["মালয়েশিয়া", "মালেশিয়া", "ম্যালেশিয়া", "মালয়েশিয়া"],
    "KW": ["কুয়েত", "কুয়েত"], "QA": ["কাতার", "কতর"], "OM": ["ওমান"], "KR": ["কোরিয়া", "কোরিয়া"],
    "RS": ["সার্বিয়া", "সাবিয়া", "সার্বিয়া"], "RO": ["রোমানিয়া", "রোমানিয়া"], "HR": ["ক্রোয়েশিয়া", "ক্রোয়েশিয়া"],
    "MK": ["মেসেডোনিয়া", "মেসিডোনিয়া", "মেসেডোনিয়া"], "GB": ["যুক্তরাজ্য", "লন্ডন", "ইংল্যান্ড"], "US": ["আমেরিকা", "যুক্তরাষ্ট্র"],
    "IN": ["ভারত", "ইন্ডিয়া", "ইন্ডিয়ান"], "CZ": ["চেক রিপাবলিক", "চেকিয়া"], "IT": ["ইতালি", "ইটালি"], "JP": ["জাপান"],
    "MV": ["মালদ্বীপ"], "SG": ["সিঙ্গাপুর"], "BH": ["বাহরাইন"], "JO": ["জর্ডান"], "LB": ["লেবানন"], "PT": ["পর্তুগাল"],
    "PL": ["পোল্যান্ড"], "DE": ["জার্মানি", "জার্মান"], "GR": ["গ্রিস", "গ্রিক"], "CA": ["কানাডা"], "AU": ["অস্ট্রেলিয়া", "অস্ট্রেলিয়া"],
    "TR": ["তুরস্ক", "তুর্কি"], "BY": ["বেলারুশ"], "MU": ["মরিশাস"], "LA": ["লাওস"], "KH": ["কম্বোডিয়া", "কম্বোডিয়া"],
    "LT": ["লিথুনিয়া", "লিথুয়ানিয়া"], "BG": ["বুলগেরিয়া", "বুলগেরিয়া"], "DK": ["ডেনমার্ক"], "FI": ["ফিনল্যান্ড"],
    "MT": ["মাল্টা"], "EE": ["এস্তোনিয়া", "এস্তোনিয়া"], "AM": ["আর্মেনিয়া", "আর্মেনিয়া"], "CY": ["সাইপ্রাস"],
    "NZ": ["নিউজিল্যান্ড"], "BA": ["বসনিয়া", "বসনিয়া"], "FR": ["ফ্রান্স"], "HU": ["হাঙ্গেরি"], "MD": ["মলদোভা", "মালদোভা"],
    "AL": ["আলবেনিয়া", "আলবেনিয়া"], "IE": ["আয়ারল্যান্ড", "আয়ারল্যান্ড"], "TH": ["থাইল্যান্ড"], "VN": ["ভিয়েতনাম", "ভিয়েতনাম"],
    "LK": ["শ্রীলঙ্কা"], "ID": ["ইন্দোনেশিয়া", "ইন্দোনেশিয়া"], "ZA": ["দক্ষিণ আফ্রিকা", "সাউথ আফ্রিকা"], "NP": ["নেপাল"],
}
SLUG_ISO = {"qatar": "QA", "saudi-arabia": "SA", "uae": "AE", "kuwait": "KW", "oman": "OM", "bahrain": "BH", "malaysia": "MY",
            "singapore": "SG", "south-korea": "KR", "japan": "JP", "turkey": "TR", "romania": "RO", "serbia": "RS", "moldova": "MD",
            "north-macedonia": "MK", "uk": "GB", "usa": "US", "canada": "CA", "australia": "AU", "croatia": "HR", "poland": "PL",
            "hungary": "HU", "czech-republic": "CZ", "lithuania": "LT", "portugal": "PT", "italy": "IT", "albania": "AL",
            "germany": "DE", "ireland": "IE", "new-zealand": "NZ", "india": "IN", "thailand": "TH", "vietnam": "VN",
            "sri-lanka": "LK", "indonesia": "ID"}

# intent patterns per page type
INTENT = {
    "visa-check": r"ভিসা চেক|ভিসা যাচাই|visa check|স্ট্যাটাস|status|ভিসা চেকিং|vp check|mofa",
    "visa-req": r"ভিসা (করতে )?কি কি লাগে|ভিসা প্রয়োজন|ভিসা লাগে কি|ভিসা লাগবে|অন ?অ্যারাইভাল|ভিসা ছাড়া|ভিসা ফ্রি|ভিসা গাইড|ভিসা আবেদন|টুরিস্ট ভিসা|ভিজিট ভিসা|visit visa|tourist visa|ভিসা ফি",
    "cost": r"যেতে কত টাকা|কত টাকা লাগে|ভিসা খরচ|খরচ",
}


def names(iso):
    out = set(EXTRA.get(iso, []))
    if iso in BN:
        out.add(BN[iso])
    return [n for n in out if n]


def match_country(text, iso):
    return any(n in text for n in names(iso))


def run():
    post_rows = [(p["id"], html.unescape(p["title"]["rendered"]), p["link"]) for p in posts]
    gsc_rows = []
    for p in gsc:
        for q in p["queries"]:
            gsc_rows.append((up.unquote(p["url"]), q[0], q[1], q[3]))
    report = {}
    isos = sorted(set(BN) & set(c for c in BN if len(c) == 2 and c.isalpha()))
    for kind, pat in INTENT.items():
        rx = re.compile(pat, re.I)
        report[kind] = {}
        for iso in isos:
            ps = [r for r in post_rows if match_country(r[1], iso) and rx.search(r[1])]
            qs = {}
            for url, q, imp, pos in gsc_rows:
                if match_country(q, iso) and rx.search(q) and not re.search(r"থেকে", q):
                    k = qs.setdefault(url, [0, []])
                    k[0] += imp
                    if q not in k[1]:
                        k[1].append(q)
            if ps or qs:
                report[kind][iso] = {
                    "posts": [{"id": i, "title": t, "url": u} for i, t, u in ps],
                    "gsc": sorted(([u, v[0], v[1][:4]] for u, v in qs.items()), key=lambda x: -x[1])[:5],
                }
    json.dump(report, open(os.path.join(H, "overlap.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for kind in report:
        print("==", kind, len(report[kind]), "countries with existing coverage:", " ".join(sorted(report[kind])))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    run()
