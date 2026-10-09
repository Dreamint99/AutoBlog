"""Update probashiinfo.com Code Snippets in place via the plugin's REST API.

    python wp_snippets.py list
    python wp_snippets.py replace "https://probashi-bondhu.vercel.app" "https://www.probashibondu.online" [--apply]

Credentials come from PROBASHIINFO_WP_URL / _USER / _APP_PASSWORD (GitHub secrets).
Without --apply it only reports which snippets would change.
"""
import base64
import os
import sys

import requests

BASE = os.environ["PROBASHIINFO_WP_URL"].rstrip("/")
AUTH = base64.b64encode(f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()).decode()
H = {"Authorization": f"Basic {AUTH}", "User-Agent": "AutoBlog/1.0"}
API = f"{BASE}/wp-json/code-snippets/v1/snippets"


def snippets() -> list:
    r = requests.get(API, headers=H, timeout=60)
    r.raise_for_status()
    return r.json()


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
    items = snippets()
    if cmd == "list":
        for s in items:
            print(s.get("id"), "active" if s.get("active") else "off", "|", s.get("name"), "|", len(s.get("code") or ""), "chars")
        return
    old, new = sys.argv[2], sys.argv[3]
    apply = "--apply" in sys.argv
    for s in items:
        code = s.get("code") or ""
        n = code.count(old)
        if not n:
            continue
        print(f"#{s['id']} {s.get('name')}: {n} occurrence(s)" + ("" if apply else " (dry run)"))
        if apply:
            r = requests.post(f"{API}/{s['id']}", headers=H, json={"code": code.replace(old, new)}, timeout=60)
            print("   →", r.status_code, (r.json().get("code") or "").count(new) if r.ok else r.text[:200])


if __name__ == "__main__":
    main()
