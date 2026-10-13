"""On-topic feature images: a real photo of the article's country, or a text card.

Stock-photo search on the image prompt ("worried woman", "worker with shovel") gave
pictures unrelated to the article. This module instead:

1. detects the country the article is about (Bangla or English names, transliterated slugs);
2. finds a free-licence photo of that country on Wikimedia Commons (CC0 / public domain /
   CC BY / CC BY-SA — the file name must contain the city or country, and maps, graves,
   street signs, accidents … are skipped). The credit line is returned with it;
3. otherwise renders a text card (flag + Bangla title + site name) in headless Chrome, so
   Bengali shaping is correct.

Never pulls images from general web search: those are copyrighted.
"""
import html as _html
import os
import re
import subprocess
import tempfile
import unicodedata

import requests

_UA = {"User-Agent": "AutoBlog/1.0 (https://probashiinfo.com; on-topic feature images)"}
_API = "https://commons.wikimedia.org/w/api.php"

# English name, ISO-2, capital / main city, Bangla spellings and transliterated slug forms.
COUNTRIES = [
    ("Saudi Arabia", "sa", "Riyadh", ["সৌদি", "se-di", "saudi", "ইকামা", "iqama", "রিয়াদ", "জেদ্দা"]),
    ("United Arab Emirates", "ae", "Dubai", ["দুবাই", "আমিরাত", "ইউএই", "dubaai", "dubai", "uae", "emirates", "আবুধাবি"]),
    ("Qatar", "qa", "Doha", ["কাতার", "kaataar", "qatar"]),
    ("Kuwait", "kw", "Kuwait City", ["কুয়েত", "কুয়েত", "kuyet", "kuwait"]),
    ("Oman", "om", "Muscat", ["ওমান", "omaan", "oman"]),
    ("Bahrain", "bh", "Manama", ["বাহরাইন", "baahraain", "bahrain"]),
    ("Jordan", "jo", "Amman", ["জর্ডান", "jordan"]),
    ("Lebanon", "lb", "Beirut", ["লেবানন", "lebanon", "lebaann"]),
    ("Malaysia", "my", "Kuala Lumpur", ["মালয়েশিয়া", "মালয়েশিয়া", "maalyeshiyaa", "malaysia"]),
    ("Singapore", "sg", "Singapore", ["সিঙ্গাপুর", "singgaap", "singapore"]),
    ("Maldives", "mv", "Malé", ["মালদ্বীপ", "maaldbiip", "maldives"]),
    ("Mauritius", "mu", "Port Louis", ["মরিশাস", "mauritius", "mrishaas"]),
    ("Brunei", "bn", "Bandar Seri Begawan", ["ব্রুনাই", "brunei"]),
    ("Japan", "jp", "Tokyo", ["জাপান", "jaapaan", "japan"]),
    ("South Korea", "kr", "Seoul", ["দক্ষিণ কোরিয়া", "কোরিয়া", "dkssinn-keaariyaa", "korea"]),
    ("Cambodia", "kh", "Phnom Penh", ["কম্বোডিয়া", "kmbeaaddiyaa", "cambodia"]),
    ("China", "cn", "Beijing", ["চীন", "china"]),
    ("Hong Kong", "hk", "Hong Kong", ["হংকং", "hong-kong"]),
    ("Thailand", "th", "Bangkok", ["থাইল্যান্ড", "thailand"]),
    ("Vietnam", "vn", "Hanoi", ["ভিয়েতনাম", "vietnam"]),
    ("India", "in", "Kolkata", ["ভারত", "ইন্ডিয়ান", "india"]),
    ("Nepal", "np", "Kathmandu", ["নেপাল", "nepal"]),
    ("Turkey", "tr", "Istanbul", ["তুরস্ক", "turkey", "turkiye"]),
    ("Russia", "ru", "Moscow", ["রাশিয়া", "russia"]),
    ("Serbia", "rs", "Belgrade", ["সার্বিয়া", "serbia"]),
    ("Bosnia and Herzegovina", "ba", "Sarajevo", ["বসনিয়া", "bosnia"]),
    ("Croatia", "hr", "Zagreb", ["ক্রোয়েশিয়া", "croatia"]),
    ("Romania", "ro", "Bucharest", ["রোমানিয়া", "reaamaaniyaa", "romania"]),
    ("Bulgaria", "bg", "Sofia", ["বুলগেরিয়া", "bulgaria"]),
    ("Poland", "pl", "Warsaw", ["পোল্যান্ড", "peaalyaandd", "poland"]),
    ("Hungary", "hu", "Budapest", ["হাঙ্গেরি", "hungary"]),
    ("Czech Republic", "cz", "Prague", ["চেক প্রজাতন্ত্র", "czech"]),
    ("Slovakia", "sk", "Bratislava", ["স্লোভাকিয়া", "slovakia"]),
    ("Lithuania", "lt", "Vilnius", ["লিথুয়ানিয়া", "lithuania"]),
    ("Latvia", "lv", "Riga", ["লাটভিয়া", "latvia"]),
    ("Estonia", "ee", "Tallinn", ["এস্তোনিয়া", "estonia"]),
    ("Belarus", "by", "Minsk", ["বেলারুশ", "belaurs", "belarus"]),
    ("Armenia", "am", "Yerevan", ["আর্মেনিয়া", "armenia"]),
    ("Georgia", "ge", "Tbilisi", ["জর্জিয়া", "georgia"]),
    ("North Macedonia", "mk", "Skopje", ["মেসেডোনিয়া", "macedonia"]),
    ("Albania", "al", "Tirana", ["আলবেনিয়া", "albania"]),
    ("Greece", "gr", "Athens", ["গ্রিস", "গ্রীস", "gris", "greece"]),
    ("Cyprus", "cy", "Nicosia", ["সাইপ্রাস", "cyprus"]),
    ("Malta", "mt", "Valletta", ["মাল্টা", "malta"]),
    ("Italy", "it", "Rome", ["ইতালি", "itaali", "italy"]),
    ("Portugal", "pt", "Lisbon", ["পর্তুগাল", "portugal"]),
    ("Spain", "es", "Madrid", ["স্পেন", "spain"]),
    ("France", "fr", "Paris", ["ফ্রান্স", "france"]),
    ("Germany", "de", "Berlin", ["জার্মানি", "jaarmaani", "germany"]),
    ("Netherlands", "nl", "Amsterdam", ["নেদারল্যান্ডস", "netherlands"]),
    ("Belgium", "be", "Brussels", ["বেলজিয়াম", "belgium"]),
    ("Austria", "at", "Vienna", ["অস্ট্রিয়া", "austria"]),
    ("Switzerland", "ch", "Zurich", ["সুইজারল্যান্ড", "switzerland"]),
    ("Denmark", "dk", "Copenhagen", ["ডেনমার্ক", "denmark"]),
    ("Sweden", "se", "Stockholm", ["সুইডেন", "sweden"]),
    ("Norway", "no", "Oslo", ["নরওয়ে", "norway"]),
    ("Finland", "fi", "Helsinki", ["ফিনল্যান্ড", "finland"]),
    ("Iceland", "is", "Reykjavík", ["আইসল্যান্ড", "iceland"]),
    ("Ireland", "ie", "Dublin", ["আয়ারল্যান্ড", "ireland"]),
    ("United Kingdom", "gb", "London", ["যুক্তরাজ্য", "ইংল্যান্ড", "লন্ডন", "uk", "united kingdom", "united-kingdom", "britain"]),
    ("United States", "us", "New York City", ["আমেরিকা", "যুক্তরাষ্ট্র", "aamerikaa", "usa", "america"]),
    ("Canada", "ca", "Toronto", ["কানাডা", "kaanaaddaa", "canada"]),
    ("Australia", "au", "Sydney", ["অস্ট্রেলিয়া", "australia"]),
    ("New Zealand", "nz", "Auckland", ["নিউজিল্যান্ড", "new-zealand"]),
    ("South Africa", "za", "Cape Town", ["দক্ষিণ আফ্রিকা", "south-africa"]),
    ("Libya", "ly", "Tripoli", ["লিবিয়া", "libya"]),
    ("Egypt", "eg", "Cairo", ["মিশর", "egypt"]),
    ("Iraq", "iq", "Baghdad", ["ইরাক", "iraq"]),
    ("Brazil", "br", "Rio de Janeiro", ["ব্রাজিল", "brazil"]),
    ("Laos", "la", "Vientiane", ["লাওস", "laos"]),
    ("Uzbekistan", "uz", "Tashkent", ["উজবেকিস্তান", "uzbekistan"]),
    ("Kazakhstan", "kz", "Almaty", ["কাজাখস্তান", "kazakhstan"]),
    ("Kyrgyzstan", "kg", "Bishkek", ["কিরগিজস্তান", "kyrgyzstan"]),
    ("Azerbaijan", "az", "Baku", ["আজারবাইজান", "azerbaijan"]),
    ("Moldova", "md", "Chișinău", ["মলদোভা", "moldova"]),
    ("Montenegro", "me", "Podgorica", ["মন্টিনিগ্রো", "montenegro"]),
    ("Slovenia", "si", "Ljubljana", ["স্লোভেনিয়া", "slovenia"]),
    ("Luxembourg", "lu", "Luxembourg City", ["লুক্সেমবার্গ", "luxembourg"]),
    ("Ukraine", "ua", "Kyiv", ["ইউক্রেন", "ukraine"]),
    ("Indonesia", "id", "Jakarta", ["ইন্দোনেশিয়া", "indonesia"]),
    ("Philippines", "ph", "Manila", ["ফিলিপাইন", "philippines"]),
    ("Sri Lanka", "lk", "Colombo", ["শ্রীলঙ্কা", "sri-lanka"]),
    ("Pakistan", "pk", "Lahore", ["পাকিস্তান", "pakistan"]),
    ("Iran", "ir", "Tehran", ["ইরান", "iran"]),
    ("Taiwan", "tw", "Taipei", ["তাইওয়ান", "taiwan"]),
    ("Mexico", "mx", "Mexico City", ["মেক্সিকো", "mexico"]),
    ("Argentina", "ar", "Buenos Aires", ["আর্জেন্টিনা", "argentina"]),
    ("Seychelles", "sc", "Victoria, Seychelles", ["সেশেলস", "seychelles"]),
    ("Fiji", "fj", "Suva", ["ফিজি", "fiji"]),
    ("Morocco", "ma", "Casablanca", ["মরক্কো", "morocco"]),
    ("Algeria", "dz", "Algiers", ["আলজেরিয়া", "algeria"]),
    ("Tunisia", "tn", "Tunis", ["তিউনিসিয়া", "tunisia"]),
    ("Sudan", "sd", "Khartoum", ["সুদান", "sudan"]),
    ("Kenya", "ke", "Nairobi", ["কেনিয়া", "kenya"]),
    ("Nigeria", "ng", "Lagos", ["নাইজেরিয়া", "nigeria"]),
    ("Tanzania", "tz", "Dar es Salaam", ["তানজানিয়া", "tanzania"]),
    ("Uganda", "ug", "Kampala", ["উগান্ডা", "uganda"]),
    ("Ghana", "gh", "Accra", ["ঘানা", "ghana"]),
    ("Zambia", "zm", "Lusaka", ["জাম্বিয়া", "zambia"]),
    ("Mozambique", "mz", "Maputo", ["মোজাম্বিক", "mozambique"]),
    ("Afghanistan", "af", "Kabul", ["আফগানিস্তান", "afghanistan"]),
    ("Israel", "il", "Tel Aviv", ["ইসরায়েল", "israel"]),
    ("Mongolia", "mn", "Ulaanbaatar", ["মঙ্গোলিয়া", "mongolia"]),
    # Region, not a country: EU-flag title card only (no single photo stands for "Europe").
    ("Europe", "eu", "", ["ইউরোপ", "iureaap", "europe", "schengen", "সেনজেন", "শেনজেন"]),
]
_nfc = lambda t: unicodedata.normalize("NFC", t or "").lower()  # য় has two Unicode spellings
# Latin aliases must be whole words ("oman" is inside "woman"); Bangla ones may carry a case ending (ক্রোয়েশিয়ার).
_ALIASES = [(re.compile(r"(?<![a-z])" + re.escape(_nfc(a)) + r"(?![a-z])" if re.fullmatch(r"[a-z .-]+", _nfc(a)) else re.escape(_nfc(a))), len(a), c)
            for c in COUNTRIES for a in c[3] + [c[0]]]
_BAD = re.compile(r"map|flag|logo|coat of arms|emblem|diagram|chart|grave|cemetery|tomb|funeral|sign|plaque|protest|riot|"
                  r"accident|crash|ruin|war|interior|inside|museum exhibit|portrait|stamp|banknote|coin|document|scan", re.I)
_LICENCE = re.compile(r"^(CC0|Public domain|CC BY(-SA)? [\d.]+)$", re.I)


def detect_country(*texts: str):
    """(english, iso2, capital) of the first country named in the texts, else None."""
    blob = _nfc(" ".join(t for t in texts if t))
    hits = [(m.start(), -n, c) for rx, n, c in _ALIASES for m in [rx.search(blob)] if m]
    if not hits:
        return None
    _pos, _len, c = min(hits, key=lambda h: (h[0], h[1]))  # first named in the title; longest alias on a tie
    return c[0], c[1], c[2]


def commons_get(params: dict) -> dict:
    """Commons API call with polite retries (it resets connections when hit too fast)."""
    import time
    for i in range(4):
        try:
            r = requests.get(_API, headers=_UA, timeout=30, params=params)
            if r.status_code == 429:
                raise requests.RequestException("429")
            return r.json()
        except (requests.RequestException, ValueError):
            time.sleep(5 * (i + 1))
    return {}


def _commons(query: str, must: list[str], used: set, limit: int = 40) -> list[dict]:
    try:
        r = commons_get({
            "action": "query", "format": "json", "generator": "search", "gsrsearch": f"{query} filetype:bitmap",
            "gsrnamespace": 6, "gsrlimit": limit, "prop": "imageinfo", "iiprop": "url|size|extmetadata|mime",
            "iiurlwidth": 1280})
        pages = (r.get("query") or {}).get("pages") or {}
    except Exception:
        return []
    out = []
    for p in sorted(pages.values(), key=lambda p: p.get("index", 99)):
        title = p["title"]
        ii = (p.get("imageinfo") or [{}])[0]
        meta = ii.get("extmetadata") or {}
        lic = (meta.get("LicenseShortName") or {}).get("value", "").strip()
        w, h = ii.get("width", 0), ii.get("height", 0)
        sid = f"commons:{p.get('pageid')}"
        if sid in used or (ii.get("thumburl") or ii.get("url")) in used or ii.get("mime") != "image/jpeg" or w < 1400 or not h or not 1.3 <= w / h <= 2.4:
            continue
        if not _LICENCE.match(lic) or _BAD.search(title):
            continue
        if not any(m.lower() in title.lower() for m in must):
            continue
        artist = re.sub(r"<[^>]+>", "", _html.unescape((meta.get("Artist") or {}).get("value", ""))).strip() or "Unknown"
        out.append({"url": ii.get("thumburl") or ii["url"], "source_id": sid, "page": ii.get("descriptionurl", ""),
                    "credit": f"{artist[:80]} / Wikimedia Commons, {lic}", "title": title})
    return out


def _names_place(title_lower: str, name: str) -> bool:
    """The country named as the place shown: "Romania landscape", "… in Mauritius", "Oman, Wadi …".
    Not just anywhere ("Concattedrale di Maria Santissima di Romania" is a church in Italy)."""
    n = re.escape(name.lower())
    return bool(re.search(rf"^(file:)?\s*{n}(?![a-z])|(?<![a-z])(in|of|,)\s+{n}(?![a-z])|, {n}(?![a-z])", title_lower))


def _names_other(title_lower: str, others: list) -> bool:
    return any(re.search(r"(?<![a-z])" + re.escape(o.lower()) + r"(?![a-z])", title_lower) for o in others)


def photo_fits(file_title: str, country) -> bool:
    """Would country_photos() pick a Commons file with this name for this country today?"""
    if not country or not country[2]:
        return False
    t, name, city = file_title.lower(), country[0], country[2]
    if city.lower() in t:
        return True
    others = [x for c in COUNTRIES if c[0] != name for x in (c[0], c[2]) if x and len(x) > 3]
    return _names_place(t, name) and not _names_other(t, others) and not _BAD.search(file_title)


def country_photos(country, used: set, n: int = 1) -> list[dict]:
    """Up to n distinct free-licence photos of the country's main city or landscape."""
    name, _iso, city = country
    if not city:  # a region (Europe): title card only
        return []
    # City searches need the city in the file name; country searches need the country and no
    # other country or city ("Concattedrale di Maria Santissima di Romania" is in Italy).
    others = [x for c in COUNTRIES if c[0] != name for x in (c[0], c[2]) if x and len(x) > 3]
    found: list[dict] = []
    for q, must in ((f"{city} skyline", [city]), (f"{city} panorama", [city]), (f"{city} cityscape", [city]),
                    (f"{name} landscape", [name]), (f"{name} skyline", [name])):
        for hit in _commons(q, must, used | {f["source_id"] for f in found}):
            if must == [name] and (_names_other(hit["title"].lower(), others) or not _names_place(hit["title"].lower(), name)):
                continue
            found.append(hit)
            if len(found) >= n:
                return found
    return found


# ---------- text card ----------
def chrome_bin() -> str:
    import shutil
    for c in (os.environ.get("CHROME_BIN", ""), "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
              r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"):
        if c and (shutil.which(c) or os.path.exists(c)):
            return shutil.which(c) or c
    return ""


_CARD = """<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@600;700&family=Anek+Bangla:wght@700;800&display=block" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:"Anek Bangla","Hind Siliguri","Noto Sans Bengali",sans-serif;background:linear-gradient(135deg,%(c1)s 0%%,%(c2)s 100%%);color:#fff;position:relative}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.08) 2px,transparent 2px);background-size:28px 28px}
.flag{position:absolute;right:-60px;top:50%%;transform:translateY(-50%%) rotate(-8deg);width:520px;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.45);opacity:.95}
.wrap{position:absolute;left:70px;top:0;bottom:0;width:%(tw)dpx;display:flex;flex-direction:column;justify-content:center;gap:26px}
.kick{display:inline-block;align-self:flex-start;background:%(accent)s;color:#111;font:700 30px "Hind Siliguri",sans-serif;padding:8px 22px;border-radius:40px}
h1{font-weight:800;font-size:%(fs)dpx;line-height:1.28;text-shadow:0 3px 18px rgba(0,0,0,.35)}
.site{font:700 30px "Hind Siliguri",sans-serif;opacity:.9;display:flex;align-items:center;gap:12px}
.site b{width:14px;height:14px;border-radius:50%%;background:%(accent)s;display:inline-block}
</style></head><body><div class="dots"></div>%(flag)s
<div class="wrap"><span class="kick">%(kicker)s</span><h1>%(title)s</h1><div class="site"><b></b>%(site)s</div></div></body></html>"""


def text_card(title: str, site_name: str, path: str, iso2: str = "", kicker: str = "",
              colors=("#04583a", "#0b2f4a"), accent="#f6b21a") -> str:
    """Render a 1200×630 PNG title card. Raises if Chrome isn't available."""
    exe = chrome_bin()
    if not exe:
        raise RuntimeError("no chrome for the text card")
    title = re.sub(r"\s+", " ", title).strip()
    flag = f'<img class="flag" src="https://flagcdn.com/w640/{iso2}.png">' if iso2 else ""
    fs = 76 if len(title) <= 34 else 64 if len(title) <= 52 else 54 if len(title) <= 70 else 46
    page = _CARD % {"c1": colors[0], "c2": colors[1], "accent": accent, "flag": flag, "tw": 700 if iso2 else 1060,
                    "fs": fs, "title": _html.escape(title), "site": _html.escape(site_name), "kicker": _html.escape(kicker or "গাইড")}
    with tempfile.TemporaryDirectory() as d:
        hp = os.path.join(d, "card.html")
        open(hp, "w", encoding="utf-8").write(page)
        out = os.path.abspath(path)
        subprocess.run([exe, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox", "--force-device-scale-factor=1",
                        "--window-size=1200,630", "--virtual-time-budget=12000", f"--screenshot={out}",
                        "file:///" + hp.replace("\\", "/")], check=True, capture_output=True, timeout=90)
    if not os.path.exists(out) or os.path.getsize(out) < 20_000:
        raise RuntimeError("blank text card")
    return out


def kicker_for(title: str) -> str:
    for k, label in (("ভিসা চেক", "ভিসা চেক"), ("ওয়ার্ক পারমিট", "ওয়ার্ক পারমিট"), ("ওয়ার্ক ভিসা", "ওয়ার্ক ভিসা"),
                     ("বেতন", "বেতন ও খরচ"), ("খরচ", "খরচ"), ("স্টুডেন্ট", "স্টুডেন্ট ভিসা"), ("বিএমইটি", "বিএমইটি"),
                     ("রেমিট্যান্স", "রেমিট্যান্স"), ("ভিসা", "ভিসা গাইড")):
        if k in title:
            return label
    return "প্রবাস গাইড"
