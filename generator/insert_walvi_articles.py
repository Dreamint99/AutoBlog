"""Insert (or update) Walvi articles into the Supabase `articles` table.

Reads a JSON file: { "articles": [ {slug,title,meta_title,meta_description,excerpt,
keyword,tags,secondary_keywords,image_prompt,word_count,faq,body_html}, ... ] }

New slugs are POSTed; a slug that already exists for site_id='walvi' is PATCHed in place
(so the existing Qatar guide is upgraded, not duplicated). Articles are read live by the
site (force-dynamic), so they appear on walvi.io immediately — no redeploy.

    python insert_walvi_articles.py data/walvi_articles.json
"""
import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config.settings import SUPABASE_URL, SUPABASE_SERVICE_KEY  # noqa: E402

TABLE = f"{SUPABASE_URL}/rest/v1/articles"


def _headers(extra=None):
    h = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def image_url(prompt: str) -> str:
    p = quote(f"{prompt}, editorial photo, documentary, natural light, no text")
    return f"https://image.pollinations.ai/prompt/{p}?width=1200&height=630&nologo=true"


def existing_slug(slug: str, site: str) -> bool:
    r = requests.get(
        f"{TABLE}?select=id&site_id=eq.{site}&slug=eq.{quote(slug)}",
        headers=_headers(), timeout=30,
    )
    return r.ok and len(r.json()) > 0


def main(path: str, site: str = "walvi"):
    with open(path, encoding="utf-8") as f:
        arts = json.load(f).get("articles", [])
    now = datetime.now(timezone.utc)
    inserted, updated = 0, 0

    for i, a in enumerate(arts):
        wc = int(a.get("word_count") or 0) or max(1700, len(a.get("body_html", "")) // 6)
        fields = {
            "site_id": site,
            "title": a["title"],
            "slug": a["slug"],
            "meta_title": a.get("meta_title", a["title"])[:70],
            "meta_description": a.get("meta_description", a.get("excerpt", "")),
            "excerpt": a.get("excerpt", ""),
            "body_html": a["body_html"],
            "tags": a.get("tags", []),
            "faq": a.get("faq", []),
            "keyword": a.get("keyword", ""),
            "secondary_keywords": a.get("secondary_keywords", []),
            "image_url": image_url(a["image_prompt"]),
            "word_count": wc,
            "reading_time": max(4, round(wc / 210)),
            "status": "published",
            "is_mock": False,
        }

        if existing_slug(a["slug"], site):
            r = requests.patch(
                f"{TABLE}?site_id=eq.{site}&slug=eq.{quote(a['slug'])}",
                headers=_headers({"Prefer": "return=minimal"}), json=fields, timeout=60,
            )
            r.raise_for_status()
            updated += 1
            print(f"  ~ updated  {a['slug']}  ({wc}w)")
        else:
            fields["id"] = uuid.uuid4().hex
            # stagger created_at over the past days so ordering looks organic
            fields["created_at"] = (now - timedelta(hours=6 * i + 1)).isoformat()
            r = requests.post(
                TABLE, headers=_headers({"Prefer": "return=minimal"}), json=fields, timeout=60,
            )
            r.raise_for_status()
            inserted += 1
            print(f"  + inserted {a['slug']}  ({wc}w)")

    print(f"Done: {inserted} inserted, {updated} updated.")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "data/walvi_articles.json"
    site = sys.argv[2] if len(sys.argv) > 2 else "walvi"
    main(path, site)
