"""Daily "আজকের টাকার রেট" article for probashiinfo.com — every country's rate in one dated post.

    python fx_report.py post [--dry-run]     # build + publish (updates in place if today's post exists)
    python fx_report.py card                 # write the featured image locally (output/fx-test.png)

Data: the free, open currency-api by fawazahmed0 (CC0) — mid-market rates for today, yesterday,
7 and 30 days ago. Every number in the post comes from that data; the text only describes it.
Featured image: an HTML card screenshotted in headless Chrome (Bengali shapes correctly).
"""
import datetime as dt
import json
import os
import subprocess
import sys
import tempfile

import requests

from bmet_report import BD, bn, bn_date, category_id, chrome_bin, upload, wp

ROOT = os.path.dirname(os.path.abspath(__file__))
CUR = [  # code, currency (bn), country (bn), flag, extra keywords used in the country section
    ("sar", "সৌদি রিয়াল", "সৌদি আরব", "sa", "রিয়াদ, জেদ্দা, দাম্মাম"), ("aed", "আমিরাত দিরহাম", "সংযুক্ত আরব আমিরাত (দুবাই)", "ae", "দুবাই, আবুধাবি, শারজাহ"),
    ("qar", "কাতারি রিয়াল", "কাতার", "qa", "দোহা"), ("kwd", "কুয়েতি দিনার", "কুয়েত", "kw", "কুয়েত সিটি"), ("omr", "ওমানি রিয়াল", "ওমান", "om", "মাস্কাট"),
    ("bhd", "বাহরাইনি দিনার", "বাহরাইন", "bh", "মানামা"), ("myr", "মালয়েশিয়ান রিংগিত", "মালয়েশিয়া", "my", "কুয়ালালামপুর"), ("sgd", "সিঙ্গাপুর ডলার", "সিঙ্গাপুর", "sg", ""),
    ("eur", "ইউরো", "ইউরোপ (ইতালি, গ্রিস, পর্তুগাল, রোমানিয়া)", "eu", "ইতালি, গ্রিস, পর্তুগাল, ক্রোয়েশিয়া"), ("gbp", "ব্রিটিশ পাউন্ড", "যুক্তরাজ্য (লন্ডন)", "gb", "লন্ডন"),
    ("usd", "মার্কিন ডলার", "যুক্তরাষ্ট্র", "us", ""), ("jod", "জর্ডানি দিনার", "জর্ডান", "jo", ""), ("mvr", "মালদ্বীপ রুফিয়া", "মালদ্বীপ", "mv", ""),
    ("krw", "দক্ষিণ কোরিয়ান উয়ন", "দক্ষিণ কোরিয়া", "kr", ""), ("jpy", "জাপানি ইয়েন", "জাপান", "jp", ""), ("ron", "রোমানিয়ান লেউ", "রোমানিয়া", "ro", ""),
    ("rsd", "সার্বিয়ান দিনার", "সার্বিয়া", "rs", ""), ("mdl", "মলদোভান লেউ", "মলদোভা", "md", ""), ("mkd", "মেসিডোনিয়ান দিনার", "উত্তর মেসিডোনিয়া", "mk", ""),
    ("pln", "পোলিশ জ্লোটি", "পোল্যান্ড", "pl", ""), ("cad", "কানাডিয়ান ডলার", "কানাডা", "ca", ""), ("aud", "অস্ট্রেলিয়ান ডলার", "অস্ট্রেলিয়া", "au", ""),
    ("inr", "ভারতীয় রুপি", "ভারত", "in", ""), ("cny", "চীনা ইউয়ান", "চীন", "cn", ""), ("try", "তুর্কি লিরা", "তুরস্ক", "tr", ""), ("rub", "রুশ রুবল", "রাশিয়া", "ru", ""),
]
MAIN = ["sar", "aed", "qar", "kwd", "omr", "bhd", "myr", "sgd", "eur", "gbp", "usd"]
SRC = "https://github.com/fawazahmed0/exchange-api"


def fetch(day: str):
    for u in (f"https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{day}/v1/currencies/bdt.json",
              f"https://{day}.currency-api.pages.dev/v1/currencies/bdt.json"):
        try:
            r = requests.get(u, timeout=30)
            if r.ok:
                j = r.json()
                return j["date"], {c: 1 / j["bdt"][c] for c, *_ in CUR if j["bdt"].get(c)}
        except Exception:
            pass
    return None, {}


def f2(v: float, dp: int | None = None) -> str:
    if dp is None:
        dp = 2 if v >= 1 else 4
    return bn(f"{v:,.{dp}f}")


def loc(w: str) -> str:
    """Bengali locative: কাতার → কাতারে, মালয়েশিয়া → মালয়েশিয়ায়."""
    return w + ("য়" if w[-1] in "াোৌিীুূ" else "ে")


def pct(a: float, b: float) -> tuple[str, float]:
    if not a or not b:
        return "—", 0.0
    p = (a - b) * 100 / b
    if abs(p) < 0.005:
        return "স্থির", 0.0
    return ("▲ " if p > 0 else "▼ ") + bn(f"{abs(p):.2f}") + "%", p


def build():
    date, R = fetch("latest")
    if not R:
        raise SystemExit("no rates")
    d0 = dt.date.fromisoformat(date)
    _, Y = fetch((d0 - dt.timedelta(days=1)).isoformat())
    _, W = fetch((d0 - dt.timedelta(days=7)).isoformat())
    _, M = fetch((d0 - dt.timedelta(days=30)).isoformat())
    meta = {c: (cur, cty, fl, kw) for c, cur, cty, fl, kw in CUR}
    label = bn_date(d0)
    rows = [c for c, *_ in CUR if c in R]
    ch = {c: pct(R[c], Y.get(c)) for c in rows}
    movers = sorted([c for c in rows if Y.get(c)], key=lambda c: -abs(ch[c][1]))[:5]

    lead = (f"<p><strong>আজকের টাকার রেট ({label}):</strong> বাজার রেট অনুযায়ী আজ "
            + ", ".join(f"১ {meta[c][0]} = <strong>{f2(R[c])} টাকা</strong>" for c in MAIN[:8] if c in R)
            + "। নিচে সৌদি আরব, দুবাই (আমিরাত), কাতার, কুয়েত, ওমান, বাহরাইন, মালয়েশিয়া, সিঙ্গাপুর, ইতালিসহ ইউরোপ, যুক্তরাজ্য, "
              "যুক্তরাষ্ট্রসহ " + bn(len(rows)) + "টি দেশের মুদ্রার আজকের রেট, গতকাল ও গত মাসের তুলনা এবং কত পাঠালে কত টাকা পাবেন তার পূর্ণ হিসাব দেওয়া হলো।</p>")
    table = ("<h2>আজকের টাকার রেট — সব দেশের তালিকা</h2><table><thead><tr><th>দেশ</th><th>মুদ্রা</th><th>১ ইউনিট = টাকা</th><th>গতকাল থেকে</th><th>৭ দিনে</th><th>৩০ দিনে</th></tr></thead><tbody>"
             + "".join(f"<tr><td>{meta[c][1]}</td><td>{meta[c][0]} ({c.upper()})</td><td><strong>{f2(R[c])}</strong></td><td>{ch[c][0]}</td>"
                       f"<td>{pct(R[c], W.get(c))[0]}</td><td>{pct(R[c], M.get(c))[0]}</td></tr>" for c in rows)
             + "</tbody></table>")
    mv = ""
    if movers:
        mv = ("<h2>আজ কোন মুদ্রার দাম সবচেয়ে বেশি বদলেছে</h2><ul>"
              + "".join(f"<li><strong>{meta[c][0]}</strong> ({meta[c][1]}): গতকাল {f2(Y[c])} টাকা, আজ {f2(R[c])} টাকা — {ch[c][0]}</li>" for c in movers) + "</ul>")
    per = "<h2>দেশভিত্তিক আজকের রেট</h2>"
    for c in [x for x in MAIN if x in R]:
        cur, cty, fl, kw = meta[c]
        m = M.get(c)
        trend = (f"গত ৩০ দিনে {'বেড়েছে' if R[c] > m else 'কমেছে'} {f2(abs(R[c] - m))} টাকা ({pct(R[c], m)[0].replace('▲ ', '').replace('▼ ', '')})।"
                 if m and abs(R[c] - m) >= 0.0005 else "গত ৩০ দিনে রেট প্রায় একই আছে।")
        per += (f"<h3>{cty} — {cur} রেট আজ</h3><p>আজ ১ {cur} = <strong>{f2(R[c])} টাকা</strong> (গতকালের তুলনায় {ch[c][0]})। "
                f"১০০ {cur} পাঠালে প্রায় {f2(R[c] * 100, 0)} টাকা, ৫০০ পাঠালে {f2(R[c] * 500, 0)} টাকা আর ১,০০০ পাঠালে {f2(R[c] * 1000, 0)} টাকা হয়; "
                f"বৈধ পথে পাঠালে ২.৫% প্রণোদনাসহ ১,০০০ {cur}-এ প্রায় {f2(R[c] * 1025, 0)} টাকা। {trend}"
                + (f" {kw}সহ {loc(cty.split(' (')[0])} থাকা প্রবাসীরা এই রেট দেখে টাকা পাঠাতে পারেন।" if kw else "") + "</p>")
    calc = ("<h2>১,০০০ পাঠালে দেশে কত টাকা যাবে (২.৫% প্রণোদনাসহ)</h2><table><thead><tr><th>মুদ্রা</th><th>১,০০০ পাঠালে</th><th>প্রণোদনাসহ</th></tr></thead><tbody>"
            + "".join(f"<tr><td>{meta[c][0]}</td><td>{f2(R[c] * 1000, 0)} ৳</td><td>{f2(R[c] * 1025, 0)} ৳</td></tr>" for c in MAIN if c in R) + "</tbody></table>")
    tail = ("<h2>লাইভ রেট, চার্ট ও ক্যালকুলেটর</h2><p>সারাদিনের হালনাগাদ রেট, ৯০ দিনের চার্ট আর যেকোনো পরিমাণের হিসাব দেখুন আমাদের "
            "<a href=\"/taka-rate/\">আজকের টাকার রেট লাইভ</a> পাতায়।</p>"
            f"<blockquote><p><strong>দ্রষ্টব্য:</strong> এখানে আন্তর্জাতিক বাজারের মধ্যম (মিড-মার্কেট) রেট দেখানো হয়েছে, যা উন্মুক্ত <a href=\"{SRC}\" target=\"_blank\" rel=\"noopener nofollow\">currency-api</a> থেকে নেওয়া। "
            "ব্যাংক, এক্সচেঞ্জ হাউস বা মোবাইল ব্যাংকিংয়ের রেট ও ফি আলাদা — পাঠানোর আগে তাদের আজকের রেট দেখে নিন। সবসময় বৈধ পথে টাকা পাঠান; হুন্ডি অবৈধ।</p></blockquote>")
    t3 = [c for c in ("sar", "aed", "qar") if c in R]
    title = f"আজকের টাকার রেট {label}: " + ", ".join(f"{meta[c][0]} {f2(R[c])}" for c in t3) + " টাকা — সব দেশের রেট"
    excerpt = f"আজকের টাকার রেট {label}: ১ সৌদি রিয়াল {f2(R.get('sar', 0))} টাকা, ১ দিরহাম {f2(R.get('aed', 0))} টাকা, ১ কাতারি রিয়াল {f2(R.get('qar', 0))} টাকা, ১ রিংগিত {f2(R.get('myr', 0))} টাকা। সব দেশের রেট ও হিসাব।"
    return {"date": date, "label": label, "R": R, "ch": ch, "meta": meta, "title": title, "slug": f"ajker-takar-rate-{date}",
            "content": lead + table + mv + per + calc + tail, "excerpt": excerpt}


def card_png(a, path):
    meta, R, ch = a["meta"], a["R"], a["ch"]
    tiles = "".join(
        f"<div class=t><img src='https://flagcdn.com/w80/{meta[c][2]}.png'><div><small>১ {meta[c][0]}</small><b>৳{f2(R[c])}</b>"
        f"<em class='{'u' if ch[c][1] > 0 else 'd' if ch[c][1] < 0 else 's'}'>{ch[c][0]}</em></div></div>" for c in MAIN[:8] if c in R)
    html = ("<!doctype html><meta charset=utf-8><link rel=stylesheet href='https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@600;700;800&family=Hind+Siliguri:wght@500;600&display=block'>"
            "<style>*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;overflow:hidden;font-family:'Hind Siliguri';color:#fff;"
            "background:radial-gradient(700px 360px at 90% -10%,rgba(253,230,138,.28),transparent 60%),linear-gradient(140deg,#052e2b,#065f46 60%,#047857);padding:40px 48px}"
            ".h{display:flex;justify-content:space-between;align-items:center}.lg{background:#fff;color:#0b3f97;border-radius:999px;padding:8px 18px;font:800 26px 'Anek Bangla'}.lg i{font-style:normal;color:#16a34a}"
            ".src{border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:6px 14px;font-size:17px}h1{font:800 50px/1.1 'Anek Bangla';margin:22px 0 4px}p.d{font-size:24px;color:#d1fae5}"
            ".g{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}.t{display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:18px;padding:14px}"
            ".t img{width:46px;height:32px;border-radius:5px;object-fit:cover}.t small{display:block;font-size:15px;color:#d1fae5}.t b{display:block;font:800 30px/1.15 'Anek Bangla'}"
            ".t em{font-style:normal;font-size:14px;font-weight:600}.u{color:#86efac}.d{color:#fca5a5}.s{color:#e2e8f0}"
            ".f{position:absolute;left:48px;right:48px;bottom:30px;display:flex;justify-content:space-between;font-size:17px;color:#d1fae5}.f b{color:#fff;font:700 21px 'Anek Bangla'}</style>"
            f"<div class=h><span class=lg>প্রবাসী <i>ইনফো</i></span><span class=src>বাজার রেট · currency-api</span></div>"
            f"<h1>আজকের টাকার রেট</h1><p class=d>{a['label']} · গতকালের তুলনাসহ</p><div class=g>{tiles}</div>"
            "<div class=f><span>বৈধ পথে পাঠালে ২.৫% প্রণোদনা · ব্যাংকের রেট সামান্য কম-বেশি হতে পারে</span><b>probashiinfo.com/taka-rate</b></div>")
    d = tempfile.mkdtemp()
    hp = os.path.join(d, "card.html")
    open(hp, "w", encoding="utf-8").write(html)
    out = os.path.abspath(path)
    subprocess.run([chrome_bin(), "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--window-size=1200,630",
                    "--virtual-time-budget=15000", f"--screenshot={out}", "file:///" + hp.replace(os.sep, "/")], check=True, timeout=90, capture_output=True)
    return out


def post(dry: bool):
    a = build()
    if dry:
        print(a["title"]); print(a["excerpt"]); print(a["content"][:1500])
        return
    base, h = wp()
    png = os.path.join(ROOT, "output", f"{a['slug']}.png")
    os.makedirs(os.path.dirname(png), exist_ok=True)
    card_png(a, png)
    mid = upload(base, h, png, os.path.basename(png))
    ex = requests.get(f"{base}/wp-json/wp/v2/posts", headers=h, params={"slug": a["slug"], "status": "publish,draft"}, timeout=60).json()
    body = {"title": a["title"], "slug": a["slug"], "content": a["content"], "excerpt": a["excerpt"], "status": "publish",
            "categories": [category_id(base, h, "টাকার রেট", "taka-rate-news")], "featured_media": mid,
            "meta": {"rank_math_focus_keyword": "আজকের টাকার রেট", "rank_math_description": a["excerpt"][:158]}}
    url = f"{base}/wp-json/wp/v2/posts/{ex[0]['id']}" if ex else f"{base}/wp-json/wp/v2/posts"
    r = requests.post(url, headers=h, json=body, timeout=120)
    print(("updated" if ex else "published"), r.status_code, r.json().get("link") if r.ok else r.text[:300])
    r.raise_for_status()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    cmd = sys.argv[1] if len(sys.argv) > 1 else "post"
    if cmd == "post":
        post("--dry-run" in sys.argv)
    elif cmd == "card":
        print(card_png(build(), os.path.join(ROOT, "output", "fx-test.png")))
