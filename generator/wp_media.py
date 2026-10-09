"""Upload image files to probashiinfo.com's media library (once) and print their URLs.

    python wp_media.py wp_snippets/assets/probashiinfo-wordmark.webp [...]

Skips a file whose slug already exists in the library and prints the existing URL.
"""
import base64
import mimetypes
import os
import sys

import requests

BASE = os.environ["PROBASHIINFO_WP_URL"].rstrip("/")
AUTH = base64.b64encode(f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()).decode()
H = {"Authorization": f"Basic {AUTH}", "User-Agent": "AutoBlog/1.0"}

for path in sys.argv[1:]:
    name = os.path.basename(path)
    slug = os.path.splitext(name)[0].lower()
    ex = requests.get(f"{BASE}/wp-json/wp/v2/media", headers=H, params={"slug": slug, "_fields": "id,source_url"}, timeout=60).json()
    if isinstance(ex, list) and ex:
        print("exists", name, ex[0]["source_url"])
        continue
    mime = mimetypes.guess_type(name)[0] or ("image/webp" if name.endswith(".webp") else "application/octet-stream")
    with open(path, "rb") as f:
        r = requests.post(f"{BASE}/wp-json/wp/v2/media", headers={**H, "Content-Disposition": f'attachment; filename="{name}"', "Content-Type": mime}, data=f.read(), timeout=120)
    print("upload", name, r.status_code, r.json().get("source_url") if r.ok else r.text[:300])
