"""Build data/visa_check.json for probashiinfo /visa-check/<slug>/ pages.

Facts (portal, URL, what you need) come from web/src/data/visa-check.json (official government portals,
verified 2026-10-08; reachability re-checked 2026-11-14). This file adds the Bangla wording only.
Countries where probashiinfo already has a ranking visa-check post are NOT built — the hub links to
that post instead (see PROBASHI_OVERLAP.md).
"""
import json
import os

H = os.path.dirname(os.path.abspath(__file__))
SRC = json.load(open(os.path.join(H, "..", "web", "src", "data", "visa-check.json"), encoding="utf-8"))

# existing posts own these queries (GSC winner per country) → no new page, hub links here
EXISTING = {
    "saudi-arabia": ("সৌদি আরব", "https://probashiinfo.com/se-di-bhisaa-cek-2026-paaspeaartt-diye-shj-niym/"),
    "uae": ("দুবাই / আমিরাত", "https://probashiinfo.com/dubaai-bhisaa-cek-2026-paaspeaartt-nmbr-diye-shj-niym/"),
    "kuwait": ("কুয়েত", "https://probashiinfo.com/kuyet-bhisaa-cek-2026-paaspeaartt-naambaare-shj-yaacaai-niym/"),
    "qatar": ("কাতার", "https://probashiinfo.com/kaataar-bhisaa-cek-2026-paaspeaartt-naambaar-diye-anlaaine-shj-gaaidd/"),
    "malaysia": ("মালয়েশিয়া", "https://probashiinfo.com/maalyeshiyaa-bhisaa-cek-2026-paaspeaartt-naambaar-diye-shj-upaay/"),
}

NEED_BN = {
    "Application/visa number": "আবেদন নম্বর বা ভিসা নম্বর", "Passport number": "পাসপোর্ট নম্বর",
    "Application reference number": "আবেদনের রেফারেন্স নম্বর", "Date of birth": "জন্ম তারিখ",
    "Application or FIN number": "আবেদন নম্বর বা FIN নম্বর", "English name": "ইংরেজিতে নাম (পাসপোর্টের মতো)",
    "Application number": "আবেদন নম্বর", "Reference number": "রেফারেন্স নম্বর", "Employer's name": "নিয়োগকর্তা কোম্পানির নাম",
    "e-Visa application number": "ই-ভিসা আবেদন নম্বর", "Receipt/application number from the embassy": "দূতাবাসের রসিদ/আবেদন নম্বর",
    "Reference number from the receipt": "রসিদে থাকা রেফারেন্স নম্বর", "Last name or date of birth": "পদবি (Last name) বা জন্ম তারিখ",
    "GWF or application reference": "GWF বা আবেদন রেফারেন্স নম্বর", "Email used to apply": "আবেদনে দেওয়া ইমেইল",
    "Application ID or case number": "অ্যাপ্লিকেশন আইডি বা কেস নম্বর", "Embassy/consulate location": "যে দূতাবাসে আবেদন করেছেন (ঢাকা)",
    "IRCC secure account login": "IRCC অ্যাকাউন্টের লগইন", "Transaction reference number (TRN)": "ট্রানজ্যাকশন রেফারেন্স নম্বর (TRN)",
    "Visa application number": "ভিসা আবেদন নম্বর", "Enter Hungary account login": "Enter Hungary অ্যাকাউন্টের লগইন",
    "Application ID": "অ্যাপ্লিকেশন আইডি", "Application (proceeding) number": "আবেদনের (প্রসিডিং) নম্বর",
    "MIGRIS account login": "MIGRIS অ্যাকাউন্টের লগইন", "Nulla osta (work authorisation) number": "নুলা ওস্তা (কাজের অনুমতি) নম্বর",
    "Portal account login": "পোর্টাল অ্যাকাউন্টের লগইন", "Visa application transaction number": "ভিসা আবেদনের ট্রানজ্যাকশন নম্বর",
    "Immigration Online account login": "Immigration Online অ্যাকাউন্টের লগইন", "Application ID / web file number": "অ্যাপ্লিকেশন আইডি / ওয়েব ফাইল নম্বর",
    "e-Visa account login": "ই-ভিসা অ্যাকাউন্টের লগইন", "Registration code": "রেজিস্ট্রেশন কোড", "Email": "ইমেইল",
    "Application or e-Visa number": "আবেদন নম্বর বা ই-ভিসা নম্বর",
}

# kind: form = number lookup page; account = sign in to see status; employer = work permit filed by employer;
# embassy = no public tracker. note = one Bangladeshi-specific fact in Bangla (from the verified tip).
C = {
    "oman": ("ওমান", "form", "ওমানের কাজের ভিসা (এমপ্লয়মেন্ট ভিসা) ও ই-ভিসা দুটোই রয়্যাল ওমান পুলিশের (ROP) ই-ভিসা পোর্টালে দেখা যায়। নিয়োগকর্তা ভিসা করলে তার কাছ থেকে ভিসা/আবেদন নম্বর নিয়ে নিন।"),
    "bahrain": ("বাহরাইন", "form", "বাহরাইনের ই-ভিসা পোর্টালে আবেদনের সময় পাওয়া রেফারেন্স নম্বর দিয়ে স্ট্যাটাস দেখা যায়। কাজের ভিসার কাগজ নিয়োগকর্তা/এলএমআরএ-এর মাধ্যমে হয়, তাই রেফারেন্স নম্বর নিয়োগকর্তার কাছ থেকে চেয়ে নিন।"),
    "singapore": ("সিঙ্গাপুর", "form", "সিঙ্গাপুরে ওয়ার্ক পারমিট ও এস পাস দেখা হয় শ্রম মন্ত্রণালয়ের (MOM) সাইটে, আর ভ্রমণ ভিসা দেখা হয় ICA-র সাইটে (ica.gov.sg)। ইন-প্রিন্সিপাল অ্যাপ্রুভাল (IPA) চিঠি পেলে তার নম্বর মিলিয়ে নিন।"),
    "south-korea": ("দক্ষিণ কোরিয়া", "form", "কোরিয়া ভিসা পোর্টালের 'Check application status' অংশে পাসপোর্ট নম্বর, ইংরেজি নাম ও জন্ম তারিখ দিলে আবেদনের অবস্থা দেখা যায়। ইপিএস কর্মীদের ভিসা প্রক্রিয়া বোয়েসেল (BOESL) হয়ে হয় — দালালের কাছে টাকা দেবেন না।"),
    "japan": ("জাপান", "account", "জাপানের ই-ভিসা (MOFA) পোর্টালে আবেদন করলে নিজের অ্যাকাউন্টে স্ট্যাটাস দেখা যায়। কাগজে আবেদন হলে দূতাবাস/ভিএফএস রসিদের নম্বর দিয়ে খোঁজ নিন।"),
    "turkey": ("তুরস্ক", "form", "তুরস্কের ই-ভিসা শুধু evisa.gov.tr থেকে নিন — একই রকম দেখতে অনেক ভুয়া সাইট বাড়তি টাকা নেয়। রেফারেন্স নম্বর ও পাসপোর্ট নম্বর দিয়ে স্ট্যাটাস ও ভিসার PDF পাওয়া যায়।"),
    "romania": ("রোমানিয়া", "employer", "রোমানিয়ায় আগে নিয়োগকর্তা ইমিগ্রেশন অফিস (IGI) থেকে ওয়ার্ক পারমিট (aviz de muncă) নেয়, তারপর দীর্ঘমেয়াদি ভিসার আবেদন রোমানিয়ার ই-ভিসা পোর্টালে ট্র্যাক করা যায়।"),
    "serbia": ("সার্বিয়া", "employer", "২০২৪ থেকে সার্বিয়ায় নিয়োগকর্তা অনলাইনে একসাথে কাজ ও বসবাসের অনুমতি (সিঙ্গেল পারমিট) আবেদন করে; এর অবস্থা সরকারি 'Welcome to Serbia' পোর্টালে দেখা যায়।"),
    "moldova": ("মলদোভা", "form", "মলদোভার ভিসা ই-ভিসা পোর্টালে ট্র্যাক হয়; কাজের অনুমতি দেয় মাইগ্রেশন ইন্সপেক্টরেট (igm.gov.md)।"),
    "north-macedonia": ("উত্তর মেসিডোনিয়া", "embassy", "উত্তর মেসিডোনিয়ার ভিসার কোনো পাবলিক অনলাইন ট্র্যাকার নেই। যে দূতাবাস/কনস্যুলেটে আবেদন করেছেন, রসিদ নম্বর দিয়ে তাদের কাছে খোঁজ নিন। ওয়ার্ক পারমিট নিয়োগকর্তাকে দেয় এমপ্লয়মেন্ট সার্ভিস এজেন্সি (av.gov.mk)।"),
    "schengen-vfs": ("ইউরোপ (শেনজেন, ভিএফএস)", "form", "ভিএফএস গ্লোবালের ট্র্যাকিং শুধু দেখায় আপনার পাসপোর্ট কোথায় আছে; ভিসা দেবে কি না সেই সিদ্ধান্ত দূতাবাসের। কিছু দেশ ভিএফএসের বদলে TLScontact বা BLS ব্যবহার করে — রসিদে যে প্রতিষ্ঠানের নাম আছে সেখানেই ট্র্যাক করুন।"),
    "uk": ("যুক্তরাজ্য (ইউকে)", "account", "যুক্তরাজ্যের ভিসা এখন ই-ভিসা: আপনার UKVI অ্যাকাউন্টে স্ট্যাটাস ও ই-ভিসা দেখা যায়। আবেদনের GWF/রেফারেন্স নম্বর ও আবেদনে দেওয়া ইমেইল লাগবে।"),
    "usa": ("আমেরিকা (যুক্তরাষ্ট্র)", "form", "আমেরিকার ভিসার স্ট্যাটাস দেখা যায় CEAC সাইটে। 'Refused' লেখা থাকলে সঙ্গে 221(g) থাকলে বুঝবেন অতিরিক্ত কাগজ/যাচাই চলছে — 'Administrative Processing'।"),
    "canada": ("কানাডা", "account", "কানাডার ভিসার স্ট্যাটাস দেখা যায় IRCC-র নিজের সিকিউর অ্যাকাউন্টে 'application status tracker' দিয়ে। আবেদন নম্বর মিলিয়ে নিন; অন্য কারো লগইন ব্যবহার করবেন না।"),
    "australia": ("অস্ট্রেলিয়া", "account", "অস্ট্রেলিয়ার ভিসা আবেদন ImmiAccount-এ দেখা যায়; ভিসা মঞ্জুর হলে তার শর্তাবলি VEVO দিয়ে যাচাই করা যায় (TRN ও পাসপোর্ট নম্বর লাগে)।"),
    "croatia": ("ক্রোয়েশিয়া", "employer", "ক্রোয়েশিয়ায় কাজের জন্য নিয়োগকর্তা পুলিশ প্রশাসনে থাকা-ও-কাজের সম্মিলিত অনুমতির আবেদন করে (MUP)। কোনো এজেন্টকে টাকা দেওয়ার আগে নিয়োগকর্তার কাছ থেকে আবেদন নম্বর নিয়ে নিন।"),
    "poland": ("পোল্যান্ড", "employer", "পোল্যান্ডের কাজের ভিসার আগে নিয়োগকর্তা ভয়েভোডশিপ অফিস থেকে ওয়ার্ক পারমিট (zezwolenie na pracę) পায়। ভিসার আবেদন e-Konsulat সিস্টেমে, আর পারমিট যাচাই করুন নিয়োগকর্তা/ভয়েভোডশিপ অফিসের মাধ্যমে — এজেন্টের কথায় নয়।"),
    "hungary": ("হাঙ্গেরি", "account", "হাঙ্গেরিতে কাজের জন্য বসবাসের অনুমতির আবেদন ও তার অবস্থা অনলাইনে 'Enter Hungary' অ্যাকাউন্টে লগইন করে দেখা যায়।"),
    "czech-republic": ("চেক প্রজাতন্ত্র", "form", "চেক প্রজাতন্ত্রের দীর্ঘমেয়াদি ভিসা ও এমপ্লয়ি কার্ডের সিদ্ধান্ত নেয় স্বরাষ্ট্র মন্ত্রণালয়। দূতাবাসের রসিদে থাকা প্রসিডিং নম্বর দিয়ে অবস্থা দেখুন। এমপ্লয়ি কার্ডের চাকরিটি আগে লেবার অফিসের কেন্দ্রীয় তালিকায় থাকতে হয়।"),
    "lithuania": ("লিথুয়ানিয়া", "account", "লিথুয়ানিয়ার জাতীয় (D) ভিসা ও কাজের জন্য অস্থায়ী বসবাসের অনুমতির আবেদন ও স্ট্যাটাস দুটোই MIGRIS সিস্টেমে।"),
    "portugal": ("পর্তুগাল", "form", "পর্তুগালের ভিসা সাইটে ভিসার ধরন অনুযায়ী কাগজের তালিকা আছে; দেশে পৌঁছানোর পর রেসিডেন্স পারমিটের কাজ করে AIMA (aima.gov.pt)।"),
    "italy": ("ইতালি", "employer", "ইতালির কাজের ভিসা শুরু হয় নুলা ওস্তা (nulla osta) দিয়ে — প্রতি বছরের ডিক্রেতো ফ্লুসি কোটায় নিয়োগকর্তা এটা পায়। নুলা ওস্তা ছাড়া শুধু চাকরির অফার কোনো কাজের ভিসা নয়।"),
    "albania": ("আলবেনিয়া", "form", "আলবেনিয়ার ভিসা ও কাজ-ও-বসবাসের একক অনুমতি দুটোই সরকারি e-Albania পোর্টালে আবেদন ও ট্র্যাক করা হয়।"),
    "germany": ("জার্মানি", "account", "জার্মানির জাতীয় (D) ভিসা, যেমন স্কিলড ওয়ার্কার ভিসা, এখন বেশিরভাগ ক্ষেত্রে কনস্যুলার সার্ভিস পোর্টালে (Auslandsportal) আবেদন ও ট্র্যাক হয়। কিছু ক্ষেত্রে অ্যাপয়েন্টমেন্ট এখনো ভিএফএস দিয়ে।"),
    "ireland": ("আয়ারল্যান্ড", "form", "আয়ারল্যান্ড প্রতি সপ্তাহে আবেদন নম্বর অনুযায়ী ভিসার সিদ্ধান্তের তালিকা ইমিগ্রেশন সাইটে প্রকাশ করে। কাজের জন্য আগে এন্টারপ্রাইজ বিভাগের এমপ্লয়মেন্ট পারমিট লাগে।"),
    "new-zealand": ("নিউজিল্যান্ড", "account", "নিউজিল্যান্ডের ভিসা ইলেকট্রনিকভাবে দেওয়া হয়; Immigration Online অ্যাকাউন্টে লগইন করে ই-ভিসা দেখুন।"),
    "india": ("ভারত", "form", "বাংলাদেশ থেকে ভারতের ভিসার পাসপোর্ট জমা হয় IVAC-এ (ivacbd.com)। রসিদে থাকা ওয়েব ফাইল নম্বর দিয়ে আবেদনের অবস্থা দেখা যায়।"),
    "thailand": ("থাইল্যান্ড", "account", "থাইল্যান্ডের ই-ভিসার স্ট্যাটাস ও অনুমোদনের PDF আবেদনের অ্যাকাউন্টেই দেখা যায়।"),
    "vietnam": ("ভিয়েতনাম", "form", "ভিয়েতনামের ই-ভিসা শুধু evisa.gov.vn থেকে নিন — অনেক ভুয়া সাইট বাড়তি ফি নেয়। রেজিস্ট্রেশন কোড, ইমেইল ও জন্ম তারিখ দিয়ে ফল দেখা যায়।"),
    "sri-lanka": ("শ্রীলঙ্কা", "form", "শ্রীলঙ্কায় যাওয়ার আগে ETA-র অবস্থা eta.gov.lk-এ রেফারেন্স ও পাসপোর্ট নম্বর দিয়ে দেখে নিন।"),
    "indonesia": ("ইন্দোনেশিয়া", "form", "ইন্দোনেশিয়ার ই-ভিসা শুধু evisa.imigrasi.go.id থেকে নিন; সেখানেই ই-ভিসার PDF যাচাই করা যায়।"),
}


def steps(kind, url, need):
    host = url.split("//")[1].split("/")[0]
    n = ", ".join(need)
    s = [f"ব্রাউজারে লিখুন {host} — ঠিকানাটি অক্ষরে অক্ষরে মিলিয়ে নিন (গুগলের বিজ্ঞাপনের লিংক নয়)।"]
    if kind == "form":
        s += ["পেজে স্ট্যাটাস দেখার অপশন খুঁজুন — ইংরেজিতে সাধারণত 'Check status', 'Track application' বা 'Inquiry' লেখা থাকে।",
              f"ফর্মে দিন: {n}। পাসপোর্টে যেমন আছে ঠিক তেমন বানানে লিখুন।",
              "ছবির মতো দেখতে কোড (ক্যাপচা) থাকলে সেটি লিখে 'Search' বা 'Submit' চাপুন।",
              "ফলাফলে আবেদনের অবস্থা দেখাবে। অনুমোদিত হলে ভিসার PDF ডাউনলোড বা প্রিন্ট করে রাখুন।"]
    elif kind == "account":
        s += ["যে অ্যাকাউন্ট দিয়ে আবেদন করেছিলেন, সেটিতে 'Sign in' / 'Login' করুন (পাসওয়ার্ড কাউকে দেবেন না)।",
              f"অ্যাকাউন্টে আপনার আবেদনের তালিকা খুলুন। মিলিয়ে নিন: {n}।",
              "আবেদনের পাশে লেখা অবস্থা (Status) দেখুন — নতুন বার্তা বা অতিরিক্ত কাগজ চাইলে সেখানেই জানানো হয়।",
              "অনুমোদিত হলে ভিসা/অনুমতিপত্রের কপি ডাউনলোড করে রাখুন।"]
    elif kind == "employer":
        s = ["আগে নিয়োগকর্তার কাছ থেকে কাজের অনুমতির আবেদন নম্বর লিখিতভাবে নিন — এটা ছাড়া কোনো এজেন্টকে টাকা দেবেন না।",
             s[0],
             f"সেখানে স্ট্যাটাস দেখার অপশনে যান এবং দিন: {n}।",
             "কাজের অনুমতি অনুমোদিত হলে তারপর দূতাবাস/ভিএফএসে ভিসার আবেদন হয়; সেই রসিদের নম্বর দিয়ে ভিসার অবস্থাও দেখুন।",
             "অনুমোদনপত্র ও ভিসার কপি প্রিন্ট করে রাখুন — বিএমইটি ছাড়পত্রে লাগবে।"]
    else:  # embassy
        s = ["এই দেশের ভিসার জন্য সরকারি কোনো অনলাইন ট্র্যাকার নেই।",
             f"যে দূতাবাস/কনস্যুলেটে আবেদন করেছেন, তাদের অফিসিয়াল ইমেইল বা ফোনে যোগাযোগ করুন এবং দিন: {n}।",
             f"দেশটির পররাষ্ট্র মন্ত্রণালয়ের সাইট ({host}) থেকে দূতাবাসের সঠিক ঠিকানা ও ইমেইল নিন।",
             "কেউ 'অনলাইনে চেক করে দেব' বলে টাকা চাইলে সতর্ক থাকুন।"]
    return s


ALT = {"দক্ষিণ কোরিয়া": "কোরিয়া", "উত্তর মেসিডোনিয়া": "মেসেডোনিয়া", "চেক প্রজাতন্ত্র": "চেক রিপাবলিক", "লিথুয়ানিয়া": "লিথুনিয়া",
       "আমেরিকা (যুক্তরাষ্ট্র)": "আমেরিকা", "যুক্তরাজ্য (ইউকে)": "যুক্তরাজ্য", "ভারত": "ইন্ডিয়ান"}


def related(name):
    """Up to 2 existing probashiinfo posts about this country (most Search impressions first) for cross-links."""
    import html as _h
    posts = json.load(open(os.path.join(H, "audit", "all_posts.json"), encoding="utf-8"))
    imp = {x["url"]: x["impressions"] for x in json.load(open(os.path.join(H, "..", "generator", "data", "gsc_probashiinfo.json"), encoding="utf-8"))["pages"]}
    nm = ALT.get(name, name)
    out = []
    for p in posts:
        t = _h.unescape(p["title"]["rendered"])
        if nm in t and not (" থেকে " in t and not t.startswith("বাংলাদেশ থেকে")):
            out.append((imp.get(p["link"], 0), t, p["link"]))
    out.sort(reverse=True)
    return [{"title": t, "url": u} for _, t, u in out[:2]]


def main():
    out = {"updated": "2026-11-14", "verified": SRC["verified"], "existing": [], "countries": []}
    for slug, (name, url) in EXISTING.items():
        out["existing"].append({"slug": slug, "name": name, "url": url})
    for c in SRC["countries"]:
        if c["slug"] in EXISTING or c["slug"] not in C:
            continue
        name, kind, note = C[c["slug"]]
        need = [NEED_BN.get(n, n) for n in c["need"]]
        out["countries"].append({
            "slug": c["slug"], "iso2": c["iso2"], "name": name, "region": c["region"], "kind": kind,
            "portal": c["portal"], "url": c["url"], "also": c.get("app") or "", "need": need, "note": note,
            "steps": steps(kind, c["url"], need),
            "source": c["portal"] + " — " + c["url"],
            "related": related(name),
        })
    os.makedirs(os.path.join(H, "data"), exist_ok=True)
    json.dump(out, open(os.path.join(H, "data", "visa_check.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(out["countries"]), "countries,", len(out["existing"]), "existing")


if __name__ == "__main__":
    main()
