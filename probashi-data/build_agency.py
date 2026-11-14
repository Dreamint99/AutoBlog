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
    # a refresh must never move an existing page's release date (an indexed page would flip back to noindex)
    prev_path = os.path.join(H, "data", "agency.json")
    prev = {}
    if os.path.exists(prev_path):
        prev = {a["slug"]: a["release"] for a in json.load(open(prev_path, encoding="utf-8"))["agencies"]}
    out, new_i = [], 0
    last = max(prev.values()) if prev else None
    for i, a in enumerate(rows):
        slug = "rl-" + str(rl_num(a["rl"]))
        if prev:
            if slug in prev:
                rel = prev[slug]
            else:  # new licence: next free days after the current schedule, PER_DAY a day
                rel = (max(dt.date.fromisoformat(last), dt.date.today()) + dt.timedelta(days=1 + new_i // PER_DAY)).isoformat()
                new_i += 1
        else:
            rel = (RELEASE_START + dt.timedelta(days=i // PER_DAY)).isoformat()
        out.append({
            "slug": slug, "rl": rl_num(a["rl"]), "name": " ".join(a["name"].split()),
            "address": re.sub(r"(,\s*)+", ", ", a["address"]).strip(" ,"), "phone": a["phone"], "status": a["status"],
            "expiry": a["expiry"], "release": rel,
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


def write_sql(a):
    """data/agency.sql: full replace of D1 table pbd_agency (read by the probashi-data worker)."""
    q = lambda v: "'" + str(v).replace("'", "''") + "'"
    lines = ["CREATE TABLE IF NOT EXISTS pbd_agency (slug TEXT PRIMARY KEY, rl INTEGER, name TEXT, address TEXT, phone TEXT, status TEXT, expiry TEXT, release TEXT);",
             "CREATE TABLE IF NOT EXISTS pbd_meta (k TEXT PRIMARY KEY, v TEXT);",
             "DELETE FROM pbd_agency;"]
    rows = a["agencies"]
    for i in range(0, len(rows), 200):
        vals = ",".join("(" + ",".join(q(r[k]) if k != "rl" else str(int(r[k])) for k in ("slug", "rl", "name", "address", "phone", "status", "expiry", "release")) + ")" for r in rows[i:i + 200])
        lines.append("INSERT INTO pbd_agency (slug, rl, name, address, phone, status, expiry, release) VALUES " + vals + ";")
    lines.append("INSERT OR REPLACE INTO pbd_meta (k, v) VALUES ('agency_updated', " + q(a["updated"]) + ");")
    open(os.path.join(H, "data", "agency.sql"), "w", encoding="utf-8").write(chr(10).join(lines) + chr(10))


def main():
    a = agencies()
    os.makedirs(os.path.join(H, "data"), exist_ok=True)
    json.dump(a, open(os.path.join(H, "data", "agency.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    write_sql(a)
    audit = os.path.join(H, "audit", "all_posts.json")
    if not os.path.exists(audit):  # CI has no local post dump: keep the committed migration_cost.json
        print(len(a["agencies"]), "agencies; last release", a["agencies"][-1]["release"], "| migration cost kept")
        return
    live = {p["link"] for p in json.load(open(audit, encoding="utf-8"))}
    m = migration_cost(live)
    json.dump(m, open(os.path.join(H, "data", "migration_cost.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(a["agencies"]), "agencies; last release", a["agencies"][-1]["release"], "|", len(m["countries"]), "cost rows,",
          sum(1 for r in m["countries"] if r["post"]), "linked to posts")


if __name__ == "__main__":
    main()
