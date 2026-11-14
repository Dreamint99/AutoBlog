"""Build data/agency.json (licence lookup) and data/migration_cost.json for probashiinfo.

agency: BMET RAIMS public list (raims.oep.gov.bd/agencies). Each agency gets a release date: active licences first,
150 per day from RELEASE_START — a page is indexable only from its release date (drip, not dump).
migration_cost: only figures marked "verified" (official order/gazette); each row links to the existing probashiinfo
post that already ranks for "<country> যেতে কত টাকা লাগে" (one query = one URL — see PROBASHI_OVERLAP.md).
"""
import datetime as dt
import json
import os
import re

H = os.path.dirname(os.path.abspath(__file__))
RELEASE_START = dt.date(2026, 11, 14)
PER_DAY = 150


def rl_num(rl):
    m = re.search(r"\d+", rl)
    return int(m.group()) if m else 0


def agencies():
    R = json.load(open(os.path.join(H, "research", "agencies.json"), encoding="utf-8"))
    rows = sorted((a for a in R["agencies"] if rl_num(a["rl"]) > 0), key=lambda a: (a["status"] != "Active", rl_num(a["rl"])))
    out = []
    for i, a in enumerate(rows):
        out.append({
            "slug": "rl-" + str(rl_num(a["rl"])), "rl": rl_num(a["rl"]), "name": " ".join(a["name"].split()),
            "address": re.sub(r"(,\s*)+", ", ", a["address"]).strip(" ,"), "phone": a["phone"], "status": a["status"],
            "expiry": a["expiry"], "release": (RELEASE_START + dt.timedelta(days=i // PER_DAY)).isoformat(),
        })
    return {"updated": R["accessed"], "source": "BMET — RAIMS (raims.oep.gov.bd/agencies)", "source_url": R["source"],
            "agencies": out}


# Bangla names + existing probashiinfo post that owns "<country> যেতে কত টাকা লাগে" (GSC winner)
COST_BN = {
    "Bahrain": ("বাহরাইন", "bh", "https://probashiinfo.com/baahraain-oyaark-bhisaa-2026-betn-niym-o-khrc-smpuurnn-gaaidd/"),
    "Oman": ("ওমান", "om", "https://probashiinfo.com/omaan-oyaark-bhisaa-2026-niym-betn-o-khrcer-gaaidd/"),
    "Qatar": ("কাতার", "qa", "https://probashiinfo.com/kaataar-oyaark-bhisaa-2026-betn-khrc-o-aabedn-prkriyaa/"),
    "Jordan": ("জর্ডান", "jo", "https://probashiinfo.com/jordan-work-permit-2026/"),
    "Kuwait": ("কুয়েত", "kw", "https://probashiinfo.com/kuyet-oyaark-bhisaa-2026-betn-khrc-o-aabedner-haalnaagaad-niym/"),
    "United Arab Emirates": ("সংযুক্ত আরব আমিরাত", "ae", "https://probashiinfo.com/dubaai-oyaark-bhisaa-2026-khrc-betn-o-aabedner-smpuurnn-gaaidd/"),
    "Maldives": ("মালদ্বীপ", "mv", "https://probashiinfo.com/maaldbiip-oyaark-bhisaa-2026-betn-khrc-o-aabedner-shj-gaaidd/"),
    "Lebanon": ("লেবানন", "lb", "https://probashiinfo.com/lebanon-work-permit-2026/"),
    "Egypt": ("মিশর", "eg", ""), "Brunei": ("ব্রুনাই", "bn", ""), "Iraq": ("ইরাক", "iq", ""), "Libya": ("লিবিয়া", "ly", ""),
    "Russia": ("রাশিয়া", "ru", ""),
    "Malaysia": ("মালয়েশিয়া", "my", "https://probashiinfo.com/maalyeshiyaa-oyaark-bhisaa-2026-khrc-betn-o-aabedn/"),
    "Japan": ("জাপান", "jp", "https://probashiinfo.com/jaapaan-oyaark-bhisaa-2026-ntun-niym-betn-o-aabedn-gaaidd/"),
}


def migration_cost(live_urls):
    R = json.load(open(os.path.join(H, "research", "migration_cost.json"), encoding="utf-8"))
    rows = []
    for c in R["countries"]:
        if c.get("status") != "verified" or not c.get("bdt") or c["country"] not in COST_BN:
            continue
        bn, iso, post = COST_BN[c["country"]]
        inc = {"my": "বাংলাদেশ অংশের খরচ: পাসপোর্ট, মেডিকেল রেজিস্ট্রেশন, কল্যাণ ফি, বীমা, স্মার্ট কার্ড, প্রি-ডিপারচার, এজেন্সির সার্ভিস চার্জ। বিমান ভাড়া, ভিসা ও মালয়েশিয়ার খরচ দেবেন নিয়োগকর্তা।",
               "jp": "বাংলাদেশে প্রশিক্ষণ (ভাষা ও দক্ষতা) ও প্রসেসিং খরচ।"}.get(
            iso, "পুরুষ কর্মীর মোট খরচ: এজেন্সির সার্ভিস চার্জ, বিমান ভাড়া, পাসপোর্ট, মেডিকেল, ভিসা ফি ও অন্যান্য খরচ সব মিলিয়ে।")
        rows.append({"country": bn, "iso2": iso, "bdt": c["bdt"], "date": c["date"], "order": c.get("circular", ""),
                     "includes": inc, "source": c["source"], "post": post if post in live_urls else ""})
    rows.sort(key=lambda r: r["bdt"])
    return {"updated": R["accessed"], "countries": rows}


def main():
    a = agencies()
    os.makedirs(os.path.join(H, "data"), exist_ok=True)
    json.dump(a, open(os.path.join(H, "data", "agency.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    live = {p["link"] for p in json.load(open(os.path.join(H, "audit", "all_posts.json"), encoding="utf-8"))}
    m = migration_cost(live)
    json.dump(m, open(os.path.join(H, "data", "migration_cost.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(a["agencies"]), "agencies; last release", a["agencies"][-1]["release"], "|", len(m["countries"]), "cost rows,",
          sum(1 for r in m["countries"] if r["post"]), "linked to posts; missing post links:",
          [r["country"] for r in m["countries"] if not r["post"] and COST_BN.get(r["country"])])


if __name__ == "__main__":
    main()
