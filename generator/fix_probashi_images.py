# -*- coding: utf-8 -*-
"""Replace AI / mismatched images on probashiinfo.com with REAL photos.

Targets (default):
  • featured image missing, or one AutoBlog made (media file named feature*.jpg/png,
    i.e. Pollinations AI or a guessed Wikipedia picture)
  • inline <img> pointing at Pollinations, Wikimedia, or an AutoBlog upload
Posts written by hand (other featured-image file names, other inline sources) are left alone.
`--all` replaces every featured image too.

Photos come from Pixabay, then Openverse CC0/public domain (modules/photos.py), are uploaded
to the WP media library, and are never repeated across posts.

Usage (needs PROBASHIINFO_WP_* + PIXABAY_API_KEY; DEEPSEEK_API_KEY for titles without alts):
  python fix_probashi_images.py --dry-run      # list what would change
  python fix_probashi_images.py [--limit N] [--all]
"""
import os
import re
import sys

import requests

from modules import photos
from modules.wordpress import _creds, _headers, used_photo_ids

SITE = {"id": "probashiinfo", "domain": "probashiinfo.com"}
AI_INLINE = re.compile(r"pollinations\.ai|wikimedia\.org|/uploads/2026/10/photo-\d+(-\d+)?\.", re.I)  # AutoBlog hotlinked these; hand-written posts upload to WP
AUTOBLOG_FEATURE = re.compile(r"/feature(-photo)?(-\d+)?\.(jpe?g|png|webp)$", re.I)

# Common words in the site's Bengali titles → English stock-photo terms (used when a
# post has no English alt text and no LLM is configured).
BN_EN = [("সৌদি", "saudi arabia riyadh"), ("কাতার", "doha qatar"), ("দুবাই", "dubai skyline"), ("আমিরাত", "dubai skyline"),
         ("কুয়েত", "kuwait city"), ("ওমান", "muscat oman"), ("বাহরাইন", "bahrain manama"), ("মালয়েশিয়া", "kuala lumpur"),
         ("সিঙ্গাপুর", "singapore skyline"), ("ইতালি", "rome italy"), ("গ্রিস", "athens greece"), ("পর্তুগাল", "lisbon portugal"),
         ("রোমানিয়া", "bucharest romania"), ("সার্বিয়া", "belgrade serbia"), ("ক্রোয়েশিয়া", "zagreb croatia"),
         ("পোল্যান্ড", "warsaw poland"), ("জাপান", "tokyo japan"), ("কোরিয়া", "seoul korea"), ("মালদ্বীপ", "maldives"),
         ("রেমিট্যান্স", "money transfer cash"), ("টাকা", "money banknotes"), ("পাসপোর্ট", "passport travel"),
         ("ভিসা", "passport visa travel"), ("বিমান", "airplane airport"), ("টিকিট", "airplane ticket travel"),
         ("চাকরি", "construction worker job"), ("ড্রাইভিং", "car driving"), ("অ্যাপ", "smartphone app"),
         ("ব্যাংক", "bank money"), ("মেডিকেল", "medical checkup"), ("প্রবাসী", "airport travel luggage")]


def english_query(title: str, alts: list[str]) -> list[str]:
    qs = [a for a in alts if re.search(r"[A-Za-z]{3}", a)][:1]
    if any(os.getenv(k) for k in ("GEMINI_API_KEY", "GROQ_API_KEY", "CEREBRAS_API_KEY", "OPENROUTER_API_KEY", "DEEPSEEK_API_KEY")):
        try:
            from modules.llm import chat
            q = chat("You turn Bengali article titles into ONE short English stock-photo search query "
                     "(2-4 words, concrete place or object, no people's faces, no text). Reply with the query only.",
                     title, temperature=0.2, max_tokens=20).strip().strip('"').splitlines()[0]
            if re.search(r"[A-Za-z]{3}", q):
                qs.insert(0, q)
        except Exception:
            pass
    qs += [en for bn, en in BN_EN if bn in title][:2]
    return qs or ["airport travel luggage"]


def all_posts(base, headers):
    out, page = [], 1
    while True:
        r = requests.get(f"{base}/wp-json/wp/v2/posts", headers=headers, timeout=60, params={
            "per_page": 50, "page": page, "context": "edit", "status": "publish",
            "_fields": "id,title,content,featured_media,slug"})
        if r.status_code == 400 or not r.json():
            break
        r.raise_for_status()
        out += r.json()
        page += 1
    return out


def media_url(base, headers, mid, cache={}):
    if not mid:
        return ""
    if mid not in cache:
        r = requests.get(f"{base}/wp-json/wp/v2/media/{mid}", headers=headers, timeout=60, params={"_fields": "source_url"})
        cache[mid] = r.json().get("source_url", "") if r.ok else ""
    return cache[mid]


def main():
    dry, every = "--dry-run" in sys.argv, "--all" in sys.argv
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 10**9
    base, user, pw = _creds(SITE)
    if not (user and pw):
        sys.exit("PROBASHIINFO_WP_USER / PROBASHIINFO_WP_APP_PASSWORD missing")
    headers = _headers(user, pw)
    used = used_photo_ids(base, headers)
    posts = all_posts(base, headers)
    print(f"{len(posts)} posts · {len(used)} photos already used · pixabay={'yes' if photos.PIXABAY_API_KEY else 'NO'}")
    done = feats = inl = 0
    for p in posts:
        if done >= limit:
            break
        title = p["title"]["raw"]
        html = p["content"]["raw"]
        fm_url = media_url(base, headers, p["featured_media"])
        need_feat = every or not p["featured_media"] or bool(AUTOBLOG_FEATURE.search(fm_url))
        bad_inline = [s for s in re.findall(r'<img\b[^>]*src="([^"]*)"', html) if AI_INLINE.search(s)]
        if not need_feat and not bad_inline:
            continue
        done += 1
        alts = re.findall(r'<img\b[^>]*alt="([^"]*)"', html)
        qs = english_query(title, alts)
        print(f"#{p['id']} {title[:50]} | feature:{'replace' if need_feat else 'keep'} inline:{len(bad_inline)} | q={qs[0]!r}")
        if dry:
            hit = photos.find_photo(qs, used)
            print(f"     → {hit[0] if hit else 'NO PHOTO FOUND'}")
            continue
        update = {}
        if need_feat:
            hit = photos.find_photo(qs, used)
            kw = re.split(r"[:২০]", title)[0].strip() or title
            up = photos.wp_upload(base, headers, hit[0], "feature-photo", alt=kw, source_id=hit[1]) if hit else None
            if up:
                update["featured_media"] = up[0]
                feats += 1
        if bad_inline:
            new_html, n = photos.rehost_inline(base, headers, html, used, qs[0], "photo", only=lambda s: bool(AI_INLINE.search(s)))
            if n:
                update["content"] = new_html
                inl += n
        if update:
            r = requests.post(f"{base}/wp-json/wp/v2/posts/{p['id']}", headers={**headers, "Content-Type": "application/json"},
                              json=update, timeout=120)
            print(f"     → {'updated' if r.ok else 'FAILED ' + str(r.status_code)} {list(update)}")
    print(f"done: {done} posts touched · {feats} featured images · {inl} inline images replaced")


if __name__ == "__main__":
    main()
