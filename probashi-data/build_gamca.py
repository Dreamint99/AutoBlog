"""Build data/gamca.json for /gamca/ and /gamca/<city>/ from research/gamca.json (wafid.com, Gulf Health Council).

Facts are copied from the official source; this script only adds Bangla wording. Cities with < 5 centres are
noindex (too little data for a standalone page) but still reachable from the hub.
"""
import json
import os

H = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(H, "research", "gamca.json"), encoding="utf-8"))

CITY_BN = {"dhaka": "ঢাকা", "chattogram": "চট্টগ্রাম", "sherpur": "শেরপুর", "sylhet": "সিলেট", "chandpur": "চাঁদপুর",
           "cumilla": "কুমিল্লা", "barishal": "বরিশাল", "coxs-bazar": "কক্সবাজার", "rajshahi": "রাজশাহী"}
STEPS = [
    "wafid.com খুলে 'Book an Appointment' চাপুন।",
    "পরীক্ষার দেশ বাংলাদেশ, আপনার শহর আর যে দেশে যাবেন (সৌদি, কাতার, কুয়েত, ওমান, বাহরাইন, আমিরাত) বাছাই করুন।",
    "ধরন বাছুন: Standard ($১০ — সেন্টার নিজে থেকে ঠিক হয়) অথবা Premium ($২৫ — সেন্টার ও তারিখ আপনি বাছবেন)।",
    "পাসপোর্টের মতো করে নাম, জন্ম তারিখ, পাসপোর্ট নম্বর, ভিসার ধরন, ইমেইল, ফোন দিন; ইমেইলে আসা OTP দিয়ে নিশ্চিত করুন।",
    "কার্ডে ফি দিন (কার্ডের মেয়াদ বছর-মাস ক্রমে, YYMM)।",
    "স্লিপ পাওয়ার পর যত দ্রুত সম্ভব সেই মেডিকেল সেন্টারে গিয়ে পরীক্ষা দিন।",
]
FAQ_POINTS = [
    "Standard বুকিংয়ে সেন্টার বাছাই করা যায় না; শহর অনুযায়ী নিজে থেকে ঠিক হয়।",
    "পরীক্ষার তারিখ বদলানো যায় না। শহর বদলাতে হলে আগের স্লিপের মেয়াদ শেষ হওয়া পর্যন্ত অপেক্ষা করে নতুন স্লিপ নিতে হয়।",
    "ভুল তথ্য দিলে মেডিকেল সেন্টারকে বিনা খরচে 'Change candidate details' আবেদন করতে বলুন — এর জন্য কোনো টাকা দেবেন না।",
    "আগের মেডিকেল রিপোর্ট বৈধ থাকলে নতুন অ্যাপয়েন্টমেন্ট নেওয়া যায় রিপোর্টের ২ মাস পর।",
]
UNFIT = {
    "সংক্রামক রোগ": ["এইচআইভি (এইডস) পজিটিভ", "হেপাটাইটিস বি (HBsAg) পজিটিভ", "হেপাটাইটিস সি (Anti-HCV) পজিটিভ", "মাইক্রোফাইলেরিয়া ও ম্যালেরিয়া", "কুষ্ঠ",
                      "বুকের এক্স-রেতে যেকোনো অস্বাভাবিকতা — সক্রিয় বা পুরনো যক্ষ্মাসহ"],
    "অন্যান্য রোগ": ["কিডনি বিকল", "লিভার বিকল", "হার্ট ফেইলিওর", "অনিয়ন্ত্রিত উচ্চ রক্তচাপ", "অনিয়ন্ত্রিত ডায়াবেটিস", "যেকোনো ধরনের ক্যান্সার",
                     "মানসিক ও স্নায়বিক রোগ", "কাজে বাধা দেয় এমন শারীরিক প্রতিবন্ধিতা", "হিমোগ্লোবিন ৭ g/dL-এর কম"],
    "অন্য": ["কাজের ভিসার ক্ষেত্রে গর্ভাবস্থা"],
}


def main():
    cities = {}
    for c in R["centres"]:
        cities.setdefault(c["city_slug"], []).append({
            "name": c["name"].strip(), "address": " ".join(x for x in (c.get("address"), c.get("address_2")) if x).strip(),
            "phone": c.get("phone") or "", "email": c.get("email") or "", "website": c.get("website") or "",
        })
    out = {
        "updated": R["accessed"], "source": "Gulf Health Council — Wafid (wafid.com)", "source_url": R["source"],
        "booking_url": R["booking"]["url"], "slip_url": R["booking"]["slip_reprint_url"], "status_url": R["status_check"]["url"],
        "result_days": 26, "fee": "Standard $১০ / Premium $২৫ (অনলাইনে Wafid-কে দিতে হয়)",
        "exam_fee_note": "সেন্টারে পরীক্ষার ফি কত, তা Wafid বা জিসিসি নিয়মে প্রকাশ করা নেই — সেন্টার থেকে লিখিত রসিদ নিন।",
        "validity": "মেডিকেল সার্টিফিকেট ইস্যুর তারিখ থেকে ২ মাস বৈধ (জিসিসি নিয়মাবলি ২০২১, অনুচ্ছেদ ৪২)।",
        "validity_source": R["validity"]["source"], "steps": STEPS, "points": FAQ_POINTS, "unfit": UNFIT,
        "unfit_source": R["unfit_conditions"]["source"],
        "status_post": "https://probashiinfo.com/mediglass-visa-check-2026/",
        "cities": [],
    }
    for slug, rows in sorted(cities.items(), key=lambda x: -len(x[1])):
        out["cities"].append({"slug": slug, "name": CITY_BN[slug], "count": len(rows), "index": len(rows) >= 5,
                              "centres": sorted(rows, key=lambda r: r["name"].lower())})
    os.makedirs(os.path.join(H, "data"), exist_ok=True)
    json.dump(out, open(os.path.join(H, "data", "gamca.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print({c["slug"]: (c["count"], c["index"]) for c in out["cities"]})


if __name__ == "__main__":
    main()
