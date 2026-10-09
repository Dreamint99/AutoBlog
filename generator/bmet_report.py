"""Daily BMET / OEP country-clearance report for probashiinfo.com.

Source: Overseas Employment Platform (OEP), Government of Bangladesh —
https://www.oep.gov.bd/reports/country-clearance (public report; its JSON endpoint).

    python bmet_report.py collect [--backfill 90]   # update data/bmet.json
    python bmet_report.py push                     # send the history to the WP dashboard page
    python bmet_report.py post daily|weekly|monthly [--dry-run]
    python bmet_report.py chart 2026-10-08         # write the infographic PNG locally

Data file: generator/data/bmet.json = {"days": {"YYYY-MM-DD": {"t": total, "f": female, "c": {country: n}}}}
"""
import base64
import json
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data", "bmet.json")
SRC = "https://www.oep.gov.bd/reports/country-clearance"
UA = {"User-Agent": "Mozilla/5.0 (compatible; ProbashiInfoBot/1.0; +https://probashiinfo.com)",
      "X-Requested-With": "XMLHttpRequest", "Accept": "application/json"}
BD = timezone(timedelta(hours=6))

BN_DIGITS = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"]
BN_COUNTRY = {
    "Saudi Arabia": "সৌদি আরব", "Singapore": "সিঙ্গাপুর", "Maldives": "মালদ্বীপ", "Kuwait": "কুয়েত", "Qatar": "কাতার",
    "United Arab Emirates (UAE)": "সংযুক্ত আরব আমিরাত", "Jordan": "জর্ডান", "Italy": "ইতালি", "Lebanon": "লেবানন",
    "Russian Federation": "রাশিয়া", "Oman": "ওমান", "Bahrain": "বাহরাইন", "Malaysia": "মালয়েশিয়া", "Japan": "জাপান",
    "Greece": "গ্রিস", "Romania": "রোমানিয়া", "Croatia": "ক্রোয়েশিয়া", "Poland": "পোল্যান্ড", "Serbia": "সার্বিয়া",
    "Portugal": "পর্তুগাল", "United Kingdom": "যুক্তরাজ্য", "Korea, Republic of": "দক্ষিণ কোরিয়া", "South Korea": "দক্ষিণ কোরিয়া",
    "Mauritius": "মরিশাস", "Brunei Darussalam": "ব্রুনাই", "Brunei": "ব্রুনাই", "Iraq": "ইরাক", "Libya": "লিবিয়া",
    "Egypt": "মিশর", "Cyprus": "সাইপ্রাস", "Hungary": "হাঙ্গেরি", "Bulgaria": "বুলগেরিয়া", "Albania": "আলবেনিয়া",
    "Bosnia and Herzegovina": "বসনিয়া", "Moldova": "মলদোভা", "North Macedonia": "উত্তর মেসিডোনিয়া", "Malta": "মাল্টা",
    "Hong Kong": "হংকং", "China": "চীন", "Thailand": "থাইল্যান্ড", "Seychelles": "সেশেলস", "Turkey": "তুরস্ক",
    "Germany": "জার্মানি", "France": "ফ্রান্স", "Spain": "স্পেন", "Canada": "কানাডা", "Australia": "অস্ট্রেলিয়া",
    "United States of America": "যুক্তরাষ্ট্র", "Uzbekistan": "উজবেকিস্তান", "Georgia": "জর্জিয়া", "Lithuania": "লিথুয়ানিয়া",
    "Slovakia": "স্লোভাকিয়া", "Czech Republic": "চেক প্রজাতন্ত্র", "Belarus": "বেলারুশ", "Montenegro": "মন্টেনিগ্রো",
    "Kazakhstan": "কাজাখস্তান", "Sudan": "সুদান", "South Sudan": "দক্ষিণ সুদান", "Kenya": "কেনিয়া", "Nigeria": "নাইজেরিয়া",
}


def bn(n) -> str:
    return f"{n:,}".translate(BN_DIGITS) if isinstance(n, int) else str(n).translate(BN_DIGITS)


def bn_date(d: date) -> str:
    return f"{bn(str(d.day))} {BN_MONTHS[d.month - 1]} {bn(str(d.year))}"


def cname(c: str) -> str:
    return BN_COUNTRY.get(c, c)


def load() -> dict:
    try:
        return json.load(open(DATA, encoding="utf-8"))
    except Exception:
        return {"days": {}}


def save(d: dict):
    os.makedirs(os.path.dirname(DATA), exist_ok=True)
    d["days"] = dict(sorted(d["days"].items())[-420:])
    json.dump(d, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))


def query(d_from: str, d_to: str, gender: str = "") -> dict:
    p = {"draw": 1, "start": 0, "length": 400, "approval_date_from": d_from, "approval_date_to": d_to}
    if gender:
        p["gender_id"] = gender
    for i in range(4):
        try:
            r = requests.get(SRC, params=p, headers=UA, timeout=60)
            j = r.json()
            if j.get("success"):
                return j["payload"]
        except Exception:
            pass
        time.sleep(5 * (i + 1))
    raise RuntimeError(f"OEP query failed for {d_from}..{d_to}")


def fetch_day(day: str) -> dict:
    allp = query(day, day)
    fem = query(day, day, "2")
    return {"t": int(allp.get("totalEmployee") or 0), "f": int(fem.get("totalEmployee") or 0),
            "c": {r["country_name"]: int(r["total_employee"]) for r in allp.get("data") or [] if r.get("total_employee")}}


def collect(backfill: int = 3):
    d = load()
    today = datetime.now(BD).date()
    for k in range(backfill, 0, -1):  # yesterday back to N days; refreshes recent days (late entries)
        day = (today - timedelta(days=k)).isoformat()
        if day in d["days"] and k > 3:
            continue
        rec = fetch_day(day)
        old = d["days"].get(day)
        if old and old["t"] and not rec["t"]:
            print(day, "OEP returned 0 but we had", old["t"], "- keeping ours (likely an OEP outage)")
            continue
        if sum(rec["c"].values()) != rec["t"]:
            print(day, "warning: country sum", sum(rec["c"].values()), "!= OEP total", rec["t"], "(OEP total is shown)")
        d["days"][day] = rec
        print(day, rec["t"], "female", rec["f"], "countries", len(rec["c"]))
        time.sleep(1.5)
    d["updated"] = datetime.now(BD).isoformat(timespec="minutes")
    d["source"] = SRC
    save(d)


# ---------- aggregation ----------
def agg(d: dict, days: list[str]) -> dict:
    tot, fem, cs = 0, 0, {}
    for k in days:
        r = d["days"].get(k)
        if not r:
            continue
        tot += r["t"]
        fem += r["f"]
        for c, n in r["c"].items():
            cs[c] = cs.get(c, 0) + n
    return {"t": tot, "f": fem, "c": dict(sorted(cs.items(), key=lambda x: -x[1])), "n": len([k for k in days if k in d["days"]])}


def span(end: date, n: int) -> list[str]:
    return [(end - timedelta(days=i)).isoformat() for i in range(n - 1, -1, -1)]


# ---------- infographic ----------
def chart_png(title: str, sub: str, big: int, rows: list[tuple[str, int]], path: str):
    from PIL import Image, ImageDraw, ImageFont
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), (8, 42, 99))
    d = ImageDraw.Draw(im)
    for y in range(H):  # navy → blue gradient
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(8 + 3 * t), int(42 + 44 * t), int(99 + 97 * t)))
    def font(sz, bold=True):
        for f in (["DejaVuSans-Bold.ttf", "arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf"] if bold else ["DejaVuSans.ttf", "arial.ttf", "C:/Windows/Fonts/segoeui.ttf"]):
            try:
                return ImageFont.truetype(f, sz)
            except Exception:
                continue
        return ImageFont.load_default()
    d.rectangle([0, 0, W, 10], fill=(34, 197, 94))
    d.text((56, 44), title, font=font(34), fill=(255, 255, 255))
    d.text((56, 98), sub, font=font(24, False), fill=(207, 224, 251))
    d.text((56, 150), f"{big:,}", font=font(96), fill=(255, 255, 255))
    d.text((60, 262), "workers cleared to work abroad", font=font(24, False), fill=(207, 224, 251))
    mx = max([n for _, n in rows] or [1])
    x0, y0, bw = 620, 60, 520
    for i, (c, n) in enumerate(rows[:9]):
        y = y0 + i * 56
        short = {"United Arab Emirates (UAE)": "UAE", "Russian Federation": "Russia", "Korea, Republic of": "South Korea", "Brunei Darussalam": "Brunei"}.get(c, c)
        d.text((x0, y), short[:26], font=font(20, False), fill=(230, 238, 252))
        w = max(6, int(bw * n / mx))
        d.rounded_rectangle([x0, y + 26, x0 + w, y + 46], radius=8, fill=(34, 197, 94) if i == 0 else (96, 165, 250))
        d.text((x0 + w + 8, y + 22), f"{n:,}", font=font(20), fill=(255, 255, 255))
    d.text((56, H - 60), "probashiinfo.com  ·  Source: OEP / BMET (oep.gov.bd)", font=font(22, False), fill=(207, 224, 251))
    im.save(path, optimize=True)
    return path


def chrome_bin() -> str:
    import shutil
    for c in (os.environ.get("CHROME_BIN", ""), "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
              r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"):
        if c and (shutil.which(c) or os.path.exists(c)):
            return shutil.which(c) or c
    return ""


def card_png(o: dict, path: str, W: int = 1200, H: int = 630) -> str:
    """Bengali report card drawn by the same canvas code as the dashboard (bmet_card.js), screenshotted
    in headless Chrome so Bengali shaping is correct. Falls back to the English PIL chart."""
    import json, subprocess, tempfile
    exe = chrome_bin()
    if not exe:
        raise RuntimeError("no chrome")
    js = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "bmet_card.js"), encoding="utf-8").read()
    html = ("<!doctype html><meta charset=utf-8><link rel=stylesheet href='https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@500;600;700;800"
            "&family=Hind+Siliguri:wght@500;600;700&display=block'><style>html,body{margin:0;overflow:hidden;background:#061f4d}</style>"
            f"<canvas id=c width={W} height={H}></canvas><script>{js}\nvar O={json.dumps(o, ensure_ascii=False)};"
            "Promise.all(['800 40px \"Anek Bangla\"','700 40px \"Anek Bangla\"','600 20px \"Hind Siliguri\"','500 20px \"Hind Siliguri\"']"
            ".map(function(f){return document.fonts.load(f,'বাংলা')})).then(function(){bmCard(document.getElementById('c'),O)});</script>")
    tmp = tempfile.mkdtemp()
    hp = os.path.join(tmp, "card.html")
    open(hp, "w", encoding="utf-8").write(html)
    out = os.path.abspath(path)
    subprocess.run([exe, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", f"--window-size={W},{H}",
                    "--virtual-time-budget=15000", f"--screenshot={out}", "file:///" + hp.replace("\\", "/")],
                   check=True, timeout=90, capture_output=True)
    if not os.path.exists(out) or os.path.getsize(out) < 20000:
        raise RuntimeError("blank screenshot")
    return out


# ---------- WordPress ----------
def wp():
    base = os.environ["PROBASHIINFO_WP_URL"].rstrip("/")
    auth = base64.b64encode(f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()).decode()
    return base, {"Authorization": f"Basic {auth}", "User-Agent": "AutoBlog/1.0"}


def ensure_page(base, h):
    """The dashboard lives on a normal WP page (slug bmet-report) so Rank Math handles its SEO;
    the BMET snippet replaces its content with the live dashboard."""
    ex = requests.get(f"{base}/wp-json/wp/v2/pages", headers=h, params={"slug": "bmet-report", "status": "publish,draft"}, timeout=60).json()
    if ex:
        return ex[0]["id"]
    desc = "আজকের বিএমইটি রিপোর্ট: প্রতিদিন কতজন বাংলাদেশি কর্মী কোন দেশে কাজের জন্য বহির্গমন ছাড়পত্র পেলেন — দৈনিক, সাপ্তাহিক ও মাসিক দেশভিত্তিক হিসাব, চার্টসহ।"
    r = requests.post(f"{base}/wp-json/wp/v2/pages", headers=h, timeout=60, json={
        "title": "আজকের বিএমইটি রিপোর্ট — দেশভিত্তিক বিদেশগামী কর্মীর লাইভ হিসাব", "slug": "bmet-report", "status": "publish",
        "content": "<p>" + desc + "</p>", "excerpt": desc,
        "meta": {"rank_math_focus_keyword": "আজকের বিএমইটি রিপোর্ট", "rank_math_description": desc[:158]}})
    print("page", r.status_code, r.json().get("link") if r.ok else r.text[:200])
    return r.json().get("id")


def push():
    base, h = wp()
    ensure_page(base, h)
    d = load()
    r = requests.post(f"{base}/wp-json/pa/v1/bmet", headers=h, json=d, timeout=120)
    print("push", r.status_code, r.text[:200])
    r.raise_for_status()


def category_id(base, h, name="বিএমইটি রিপোর্ট", slug="bmet-report-news") -> int:
    r = requests.get(f"{base}/wp-json/wp/v2/categories", headers=h, params={"slug": slug}, timeout=60).json()
    if r:
        return r[0]["id"]
    return requests.post(f"{base}/wp-json/wp/v2/categories", headers=h, json={"name": name, "slug": slug}, timeout=60).json()["id"]


def upload(base, h, path, name) -> int:
    with open(path, "rb") as f:
        r = requests.post(f"{base}/wp-json/wp/v2/media", headers={**h, "Content-Disposition": f'attachment; filename="{name}"', "Content-Type": "image/png"}, data=f.read(), timeout=120)
    r.raise_for_status()
    return r.json()["id"]


def table(rows, total):
    tr = "".join(f"<tr><td>{bn(i + 1)}</td><td>{cname(c)}</td><td>{bn(n)}</td><td>{bn(round(n * 100 / total, 1)) if total else '০'}%</td></tr>"
                 for i, (c, n) in enumerate(rows))
    return f"<table><thead><tr><th>ক্রম</th><th>দেশ</th><th>কর্মী</th><th>অংশ</th></tr></thead><tbody>{tr}</tbody></table>"


def build(kind: str):
    d = load()
    today = datetime.now(BD).date()
    y = today - timedelta(days=1)
    if kind == "daily":
        cur, prev = agg(d, [y.isoformat()]), agg(d, [(y - timedelta(days=1)).isoformat()])
        label, ttl_date = bn_date(y), y
        title = f"আজকের বিএমইটি রিপোর্ট ({bn_date(y)}): {bn(cur['t'])} জনের বিদেশে কর্মসংস্থান ছাড়পত্র"
        slug = f"bmet-report-{y.isoformat()}"
        cmp_word = "আগের দিনের"
    elif kind == "weekly":
        cur, prev = agg(d, span(y, 7)), agg(d, span(y - timedelta(days=7), 7))
        label, ttl_date = f"{bn_date(y - timedelta(days=6))} – {bn_date(y)}", y
        title = f"সাপ্তাহিক বিএমইটি রিপোর্ট: গত ৭ দিনে {bn(cur['t'])} জন কর্মী বিদেশ গমনের ছাড়পত্র পেয়েছেন ({bn_date(y)} পর্যন্ত)"
        slug = f"bmet-weekly-report-{y.isoformat()}"
        cmp_word = "আগের সপ্তাহের"
    else:
        first = today.replace(day=1)
        last = first - timedelta(days=1)
        mstart = last.replace(day=1)
        days = [(mstart + timedelta(days=i)).isoformat() for i in range((last - mstart).days + 1)]
        cur = agg(d, days)
        pl = mstart - timedelta(days=1)
        prev = agg(d, [(pl.replace(day=1) + timedelta(days=i)).isoformat() for i in range(pl.day)])
        label, ttl_date = f"{BN_MONTHS[last.month - 1]} {bn(str(last.year))}", last
        title = f"মাসিক বিএমইটি রিপোর্ট {BN_MONTHS[last.month - 1]} {bn(str(last.year))}: {bn(cur['t'])} জনের বহির্গমন ছাড়পত্র"
        slug = f"bmet-monthly-report-{last.strftime('%Y-%m')}"
        cmp_word = "আগের মাসের"
    if not cur["t"]:
        raise SystemExit(f"no data for {kind} {label}")
    rows = list(cur["c"].items())
    top = rows[:10]
    diff = cur["t"] - prev["t"]
    trend = (f"{cmp_word} তুলনায় {bn(abs(diff))} জন {'বেশি' if diff > 0 else 'কম'}" if prev["t"] and diff else f"{cmp_word} সমান")
    female_pct = round(cur["f"] * 100 / cur["t"], 1) if cur["t"] else 0
    lead = (f"<p><strong>{label}</strong> তারিখে বিএমইটির মাধ্যমে মোট <strong>{bn(cur['t'])} জন</strong> বাংলাদেশি কর্মী "
            f"{bn(len(rows))}টি দেশে কাজের জন্য বহির্গমন ছাড়পত্র (স্মার্ট কার্ড) পেয়েছেন, যা {trend}। "
            f"এর মধ্যে নারী কর্মী {bn(cur['f'])} জন ({bn(female_pct)}%)। সবচেয়ে বেশি কর্মী গেছেন "
            f"<strong>{cname(top[0][0])}</strong> ({bn(top[0][1])} জন)" + (f", এরপর {cname(top[1][0])} ({bn(top[1][1])} জন)" if len(top) > 1 else "")
            + (f" ও {cname(top[2][0])} ({bn(top[2][1])} জন)" if len(top) > 2 else "") + "।</p>")
    if kind != "daily":
        lead = lead.replace(f"<strong>{label}</strong> তারিখে", f"<strong>{label}</strong> সময়ে")
    body = (lead
            + f"<h2>দেশভিত্তিক তালিকা — শীর্ষ {bn(len(top))}টি দেশ</h2>" + table(top, cur["t"])
            + f"<h2>এক নজরে</h2><ul><li>মোট ছাড়পত্র: {bn(cur['t'])} জন</li><li>নারী কর্মী: {bn(cur['f'])} জন</li>"
            f"<li>পুরুষ ও অন্যান্য: {bn(cur['t'] - cur['f'])} জন</li><li>গন্তব্য দেশ: {bn(len(rows))}টি</li><li>{cmp_word} মোট: {bn(prev['t'])} জন</li></ul>"
            + (f"<h2>সব দেশের পূর্ণ তালিকা</h2>" + table(rows, cur["t"]) if len(rows) > len(top) else "")
            + "<h2>লাইভ ড্যাশবোর্ডে আরও দেখুন</h2><p>দিন, সপ্তাহ, মাস ও দেশ বেছে নিয়ে চার্টসহ পুরো হিসাব দেখুন আমাদের "
            "<a href=\"/bmet-report/\">বিএমইটি রিপোর্ট ড্যাশবোর্ডে</a>। সেখানে আজকের সংখ্যা লাইভ দেখা যায় (প্রতি ৩ মিনিটে হালনাগাদ), আর প্রতিদিন রাত ১২টার পর আগের দিনের পূর্ণ রিপোর্ট প্রকাশ হয়। "
            "যেকোনো তারিখের <a href=\"/bmet-report/#card\">রিপোর্ট কার্ড (JPEG) ডাউনলোড করে</a> ফেসবুক বা হোয়াটসঅ্যাপে শেয়ার করতে পারবেন।</p>"
            f"<blockquote><p>তথ্যসূত্র: বাংলাদেশ সরকারের ওভারসিজ এমপ্লয়মেন্ট প্ল্যাটফর্ম (OEP) — "
            f"<a href=\"{SRC}\" target=\"_blank\" rel=\"noopener nofollow\">oep.gov.bd কান্ট্রি ক্লিয়ারেন্স রিপোর্ট</a>। "
            "সংখ্যাগুলো সরকারি পোর্টাল থেকে হুবহু নেওয়া, কোনো অনুমান বা পরিবর্তন করা হয়নি; প্রকাশের পর সরকারি তথ্যে দেরিতে যুক্ত এন্ট্রির কারণে সামান্য পরিবর্তন হতে পারে, তখন এই লেখাও হালনাগাদ হয়। "
            "প্রবাসী ইনফো একটি স্বাধীন তথ্যসেবা — বিএমইটি বা কোনো সরকারি প্রতিষ্ঠানের অংশ নয়; চূড়ান্ত তথ্যের জন্য মূল সূত্র দেখুন।</p></blockquote>")
    excerpt = f"{label}: {bn(cur['t'])} জন কর্মী {bn(len(rows))}টি দেশে যাওয়ার বিএমইটি ছাড়পত্র পেয়েছেন। শীর্ষে {cname(top[0][0])}।"
    sub = {"daily": ttl_date.strftime("%d %B %Y"), "weekly": f"7 days to {ttl_date.strftime('%d %b %Y')}", "monthly": ttl_date.strftime("%B %Y")}[kind]
    pct = round(diff * 100 / prev["t"]) if prev["t"] else 0
    card = {"kind": {"daily": f"{label} এর বিএমইটি রিপোর্ট", "weekly": "সাপ্তাহিক বিএমইটি রিপোর্ট", "monthly": f"{label} মাসের বিএমইটি রিপোর্ট"}[kind],
            "period": {"daily": "দৈনিক বহির্গমন ছাড়পত্রের হিসাব", "weekly": label, "monthly": "মাসিক বহির্গমন ছাড়পত্রের হিসাব"}[kind], "t": cur["t"], "f": cur["f"], "nc": len(rows), "avg": round(cur["t"] / cur["n"]) if kind != "daily" and cur["n"] else 0,
            "cmp": (f"{cmp_word} চেয়ে {'▲' if diff > 0 else '▼'} {bn(abs(pct))}%" if prev["t"] and pct and kind != "monthly" else ""),
            "rows": [[cname(c).replace("সংযুক্ত আরব আমিরাত", "আমিরাত"), n] for c, n in top], "rowsTitle": "শীর্ষ গন্তব্য দেশ"}
    return {"title": title, "slug": slug, "content": body, "excerpt": excerpt, "card": card,
            "chart": ("BMET overseas employment", sub, cur["t"], top)}


def post(kind: str, dry: bool):
    a = build(kind)
    if dry:
        print(a["title"]); print(a["excerpt"]); print(a["content"][:900])
        return
    base, h = wp()
    ex = requests.get(f"{base}/wp-json/wp/v2/posts", headers=h, params={"slug": a["slug"], "status": "publish,draft"}, timeout=60).json()
    png = os.path.join(ROOT, "output", f"{a['slug']}.png")
    os.makedirs(os.path.dirname(png), exist_ok=True)
    try:
        card_png(a["card"], png)
        print("card: bengali")
    except Exception as e:
        print("card fallback:", e)
        chart_png(*a["chart"], path=png)
    mid = upload(base, h, png, os.path.basename(png))
    body = {"title": a["title"], "slug": a["slug"], "content": a["content"], "excerpt": a["excerpt"], "status": "publish",
            "categories": [category_id(base, h)], "featured_media": mid,
            "meta": {"rank_math_focus_keyword": "আজকের বিএমইটি রিপোর্ট" if kind == "daily" else "বিএমইটি রিপোর্ট",
                     "rank_math_description": a["excerpt"][:158]}}
    url = f"{base}/wp-json/wp/v2/posts/{ex[0]['id']}" if ex else f"{base}/wp-json/wp/v2/posts"
    r = requests.post(url, headers=h, json=body, timeout=120)
    print(("updated" if ex else "published"), r.status_code, r.json().get("link") if r.ok else r.text[:300])
    r.raise_for_status()


if __name__ == "__main__":
    for _s in (sys.stdout,):
        _s.reconfigure(encoding="utf-8", errors="replace")
    cmd = sys.argv[1] if len(sys.argv) > 1 else "collect"
    if cmd == "collect":
        collect(int(sys.argv[sys.argv.index("--backfill") + 1]) if "--backfill" in sys.argv else 3)
    elif cmd == "push":
        push()
    elif cmd == "post":
        post(sys.argv[2], "--dry-run" in sys.argv)
    elif cmd == "chart":
        a = build("daily")
        print(card_png(a["card"], os.path.join(ROOT, "output", "bmet-test.png")))
