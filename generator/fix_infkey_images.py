"""Make InfKey feature images permanent + reliable.

Pollinations generates on-demand (flaky first load). This downloads each
article's current Pollinations image and uploads it to the Supabase Storage
bucket `article-images` as <id>.jpg, then prints which succeeded. After this,
one SQL update repoints image_url at the stored public copy (instant, stable).

Usage: python fix_infkey_images.py [site_id]   (default infkey)
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import requests
from config.settings import SUPABASE_URL, SUPABASE_SERVICE_KEY
from modules import store

SITE = sys.argv[1] if len(sys.argv) > 1 else "infkey"
BUCKET = "article-images"


def upload(aid: str, data: bytes) -> bool:
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{aid}.jpg"
    r = requests.post(url, data=data, headers={
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
    }, timeout=60)
    return r.status_code in (200, 201)


def fetch(u: str) -> bytes | None:
    for attempt in range(3):
        try:
            r = requests.get(u, timeout=70, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code == 200 and r.content and len(r.content) > 1000 \
               and r.headers.get("Content-Type", "").startswith("image"):
                return r.content
        except Exception:
            pass
        time.sleep(3)
    return None


def main():
    arts = store.list_articles(SITE)
    print(f"{len(arts)} {SITE} articles")
    ok, fail = 0, []
    for i, a in enumerate(arts, 1):
        aid, u = a["id"], a.get("image_url", "")
        if not u:
            fail.append(aid); continue
        # already stored? skip
        if f"/object/public/{BUCKET}/" in u:
            ok += 1; print(f"[{i}/{len(arts)}] skip (already stored) {aid}"); continue
        data = fetch(u)
        if data and upload(aid, data):
            ok += 1
            print(f"[{i}/{len(arts)}] OK {aid} ({len(data)//1024}KB)")
        else:
            fail.append(aid)
            print(f"[{i}/{len(arts)}] FAIL {aid}")
        time.sleep(1)
    print(f"=== done: {ok} ok, {len(fail)} failed ===")
    if fail:
        print("FAILED:", ",".join(fail))


if __name__ == "__main__":
    main()
