"""probashiinfo.com comment moderation + friendly replies.

    python wp_comments.py stats
    python wp_comments.py process [--apply] [--limit 300] [--reply]

process: every PENDING comment is scored. Clear spam (links, casino/crypto/SEO words,
no Bengali and no real words, duplicates) → marked spam (reversible, nothing deleted).
Genuine comments → approved; with --reply each gets one short, polite Bengali reply from
the site account (questions get a helpful pointer to the article and official sources —
never invented facts). Without --apply it only prints what it would do.
"""
import base64
import collections
import hashlib
import os
import re
import sys
import time

import requests

BASE = os.environ["PROBASHIINFO_WP_URL"].rstrip("/")
AUTH = base64.b64encode(f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()).decode()
H = {"Authorization": f"Basic {AUTH}", "User-Agent": "AutoBlog/1.0"}
API = f"{BASE}/wp-json/wp/v2/comments"
APPLY = "--apply" in sys.argv
REPLY = "--reply" in sys.argv
LIMIT = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 300

BN = re.compile(r"[ঀ-৿]")
SPAM_WORDS = re.compile(r"casino|bet(ting)?\b|crypto|bitcoin|forex|viagra|cialis|porn|sex|loan|seo|backlink|escort|dating|"
                        r"buy now|click here|cheap|discount code|whatsapp group link|telegram channel|1xbet|slot|jackpot|"
                        r"essay|replica|followers|likes for|http|www\.|\.com|\.ru|\.xyz|\.top", re.I)
QUESTION = re.compile(r"\?|？|কি\b|কী\b|কিভাবে|কীভাবে|কত\b|কোথায়|কখন|কেন|পারব|যাবে|লাগবে|জানাবেন|জানতে|help|how|what|can i", re.I)


def get_all(status: str, cap: int) -> list:
    out, page = [], 1
    while len(out) < cap:
        r = requests.get(API, headers=H, params={"status": status, "per_page": 100, "page": page, "context": "edit",
                                                 "_fields": "id,post,parent,author_name,author_email,content,date,status"}, timeout=60)
        if r.status_code == 400:
            break
        r.raise_for_status()
        rows = r.json()
        out += rows
        if len(rows) < 100:
            break
        page += 1
    return out[:cap]


def text_of(c) -> str:
    raw = (c.get("content") or {}).get("raw") or (c.get("content") or {}).get("rendered") or ""
    return re.sub(r"<[^>]+>", " ", raw).strip()


PROMO = re.compile(r"(app|apps|games?|gaming|platform|payouts?|cash ?out|deposits?|withdraw\w*|register\w*|sign ?up|login|download\w*|"
                   r"bonus|promo|players?|spins?|odds|wager|profit|earn|income|investment|trading|website|site|portal|"
                   r"service|offer|deal|price|order|shop|store|product|brand|agency|marketing)", re.I)
BAD_NAME = re.compile(r"\d{2,}|app|login|casino|bet|win|slot|club|vip|game|apk|official|shop|store|seo|loan|cash", re.I)
OTHER_SCRIPT = re.compile(r"[Ѐ-ӿ一-鿿฀-๿぀-ヿ]")  # Cyrillic, CJK, Thai, Japanese


def verdict(c, seen: collections.Counter) -> str:
    t = text_of(c)
    name = c.get("author_name") or ""
    key = hashlib.md5(re.sub(r"\s+", " ", t.lower()).encode()).hexdigest()
    seen[key] += 1
    if re.search(r"https?://|www\.", t) or SPAM_WORDS.search(t) or SPAM_WORDS.search(name) or OTHER_SCRIPT.search(t):
        return "spam"
    if re.search(r"\[url=|\[link|\.(icu|shop|online|site|store|click|live|xyz|top|info|biz)|for sale|link ?building|backlinks?", t, re.I):
        return "spam"
    if "_" in name or re.search(r"[a-z]{4,}[A-Z]|\d", name):
        return "spam"  # bot-style names: plinko_fret, monopoly_znkn, user123
    if re.search(r"well explained|easy to follow|stumbled upon|your explanation|keep up the good work|informative articles|"
                 r"beautiful admin|expand on the|good job explaining|big thanks|tricky topic|great post|nice post|thank(s| you) for (this|sharing)|"
                 r"marijuana|edibles|vapes?|taruhan|bocoran|winning|increase sales|hosting|nedir|lucky jet|reflections", t, re.I):
        return "spam"  # bot praise / foreign promo
    if re.search(r"[a-z]{18,}", t.lower()) and not BN.search(t):
        return "spam"  # gibberish strings
    half = len(t) // 2
    if len(t) > 16 and re.sub(r"\W", "", t[:half]).lower() == re.sub(r"\W", "", t[half:]).lower():
        return "spam"  # "phrase  phrase" keyword stuffing
    if seen[key] > 2 and len(t) > 12:  # the same long text pasted many times
        return "spam"
    if BN.search(t):
        return "ok"  # Bengali readers' comments
    words = re.findall(r"[A-Za-z']+", t)
    if BAD_NAME.search(name.replace(" ", "")):
        return "spam"
    if len(words) <= 12 and not PROMO.search(t):
        return "ok"  # short genuine English/Banglish ("Hi", "Work visa", "I want that for work")
    if re.search(r"(visa|bangladesh|probashi|dubai|saudi|qatar|malaysia|europe|job|work|passport|kaj|vai|bhai)", t, re.I) and not PROMO.search(t):
        return "ok"
    return "spam"  # long English/Spanish marketing text


THANKS = [
    "ধন্যবাদ, {n}! মন্তব্য করার জন্য কৃতজ্ঞ। প্রবাসী ইনফোর সঙ্গে থাকুন 🌍",
    "আপনাকে অনেক ধন্যবাদ, {n}। লেখাটি কাজে লেগেছে জেনে ভালো লাগল। প্রিয়জনদের সঙ্গে শেয়ার করতে পারেন 🙏",
    "ধন্যবাদ {n}! আপনার মতামত আমাদের অনুপ্রেরণা। নতুন তথ্যের জন্য নিয়মিত চোখ রাখুন 💚",
    "মন্তব্যের জন্য ধন্যবাদ, {n}। আপনার প্রবাস জীবন সুন্দর ও নিরাপদ হোক 🤲",
]
QREPLY = [
    "ধন্যবাদ {n}, প্রশ্নের জন্য। লেখার ধাপগুলো ভালো করে দেখে নিন; নিয়ম দেশভেদে আলাদা, তাই চূড়ান্ত সিদ্ধান্তের আগে সংশ্লিষ্ট দেশের অফিসিয়াল ওয়েবসাইট বা বাংলাদেশ দূতাবাসে যাচাই করুন। কোনো এজেন্টকে টাকা দেওয়ার আগে লিখিত চুক্তি নিন 🙏",
    "{n}, প্রশ্নটির জন্য ধন্যবাদ। আপনার অবস্থা অনুযায়ী উত্তর ভিন্ন হতে পারে — অফিসিয়াল পোর্টালে নিজের তথ্য দিয়ে যাচাই করাই সবচেয়ে নিরাপদ। এ বিষয়ে আমাদের আরও লেখা সাইটের সার্চে খুঁজে দেখুন 💚",
]


def reply_text(c) -> str:
    n = (c.get("author_name") or "ভাই/বোন").strip().split(" ")[0][:20] or "ভাই/বোন"
    t = text_of(c)
    pool = QREPLY if QUESTION.search(t) else THANKS
    return pool[c["id"] % len(pool)].format(n=n)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "stats"
    if cmd == "stats":
        for st in ("hold", "approved", "spam", "trash"):
            r = requests.get(API, headers=H, params={"status": st, "per_page": 1, "context": "edit"}, timeout=60)
            print(st, r.headers.get("X-WP-Total"), r.status_code)
        return
    pend = get_all("hold", LIMIT)
    seen = collections.Counter()
    res = collections.Counter()
    for c in pend:
        v = verdict(c, seen)
        res[v] += 1
        t = text_of(c)[:90].replace("\n", " ")
        print(f"{v:4} #{c['id']} post {c['post']} {c.get('author_name','')[:18]!r}: {t}")
        if not APPLY:
            continue
        if v == "spam":
            requests.post(f"{API}/{c['id']}", headers=H, json={"status": "spam"}, timeout=60)
        else:
            requests.post(f"{API}/{c['id']}", headers=H, json={"status": "approved"}, timeout=60)
            if REPLY and not c.get("parent"):
                r = requests.post(API, headers=H, json={"post": c["post"], "parent": c["id"], "content": reply_text(c), "status": "approved"}, timeout=60)
                res["replied" if r.ok else "reply_failed"] += 1
                time.sleep(0.5)
    print(dict(res), "(dry run)" if not APPLY else "")


if __name__ == "__main__":
    main()
