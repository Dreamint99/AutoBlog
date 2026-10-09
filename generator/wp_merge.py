"""Merge duplicate probashiinfo posts: keep the longest post of each group, set the
others to draft, and 301 their old URLs to the kept post through one Code Snippet
("AutoBlog 301 redirects"), so nothing is deleted and links keep working.

    python wp_merge.py            # dry run: print the plan
    python wp_merge.py --apply
"""
import base64
import json
import os
import re
import sys

import requests

GROUPS = [
    ["canada-express-entry-2025-bangla-guide", "canada-express-entry-2025-bangla-complete-guide", "canada-express-entry-2025-complete-guide"],
    ["serbia-to-italy", "serbia-to-italy-2"],
    ["bangladesh-to-europe-work-visa-easy-countries-2025", "bangladesh-to-europe-work-visa-easy-countries-2025-2"],
]
SNIPPET_NAME = "AutoBlog 301 redirects"

BASE = os.environ["PROBASHIINFO_WP_URL"].rstrip("/")
AUTH = base64.b64encode(f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()).decode()
H = {"Authorization": f"Basic {AUTH}", "User-Agent": "AutoBlog/1.0"}
APPLY = "--apply" in sys.argv


def post(slug: str) -> dict | None:
    r = requests.get(f"{BASE}/wp-json/wp/v2/posts", headers=H, timeout=60,
                     params={"slug": slug, "status": "publish,draft", "context": "edit", "_fields": "id,slug,status,link,title,content"})
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else None


def words(p: dict) -> int:
    html = (p.get("content") or {}).get("raw") or (p.get("content") or {}).get("rendered") or ""
    return len(re.sub(r"<[^>]+>", " ", html).split())


def snippet_code(redirects: dict) -> str:
    rows = "\n".join(f"\t'{k}' => '{v}'," for k, v in sorted(redirects.items()))
    return (
        "/* Merged duplicate posts → the kept article (managed by AutoBlog generator/wp_merge.py). */\n"
        "add_action( 'template_redirect', function () {\n"
        "\t$map = array(\n" + rows + "\n\t);\n"
        "\t$path = trim( (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ), '/' );\n"
        "\tif ( isset( $map[ $path ] ) ) { wp_redirect( home_url( '/' . $map[ $path ] . '/' ), 301 ); exit; }\n"
        "}, 1 );\n"
    )


def main():
    redirects: dict[str, str] = {}
    drafts = []
    for g in GROUPS:
        posts = [p for p in (post(s) for s in g) if p]
        if len(posts) < 2:
            print(f"skip {g}: found {len(posts)}")
            continue
        # Keep the original URL (no "-2" suffix): it is the older one most likely to rank.
        slugs = {p["slug"] for p in posts}
        copy = lambda p: bool(re.search(r"-\d{1,2}$", p["slug"])) and re.sub(r"-\d{1,2}$", "", p["slug"]) in slugs
        posts.sort(key=lambda p: (p["status"] != "publish", copy(p), -words(p)))
        keep = posts[0]
        print(f"KEEP  {keep['slug']} ({words(keep)} words)")
        for p in posts[1:]:
            print(f"  301 {p['slug']} ({words(p)} words, {p['status']}) → {keep['slug']}")
            redirects[p["slug"]] = keep["slug"]
            if p["status"] == "publish":
                drafts.append(p)
    if not APPLY or not redirects:
        print("dry run" if not APPLY else "nothing to do")
        return
    # 1) redirect snippet first, so no URL is ever a 404
    api = f"{BASE}/wp-json/code-snippets/v1/snippets"
    existing = next((s for s in requests.get(api, headers=H, timeout=60).json() if s.get("name") == SNIPPET_NAME), None)
    if existing:
        old = dict(re.findall(r"'([^']+)' => '([^']+)'", existing.get("code") or ""))
        redirects = {**old, **redirects}
    body = {"name": SNIPPET_NAME, "code": snippet_code(redirects), "scope": "front-end", "active": True}
    r = requests.post(f"{api}/{existing['id']}" if existing else api, headers=H, json=body, timeout=60)
    print("snippet", r.status_code, r.json().get("id") if r.ok else r.text[:300])
    r.raise_for_status()
    if existing is None:  # some versions ignore "active" on create
        sid = r.json().get("id")
        requests.post(f"{api}/{sid}/activate", headers=H, timeout=60)
    # 2) take the duplicates out of the sitemap / listings
    for p in drafts:
        r = requests.post(f"{BASE}/wp-json/wp/v2/posts/{p['id']}", headers=H, json={"status": "draft"}, timeout=60)
        print("draft", p["slug"], r.status_code)
    print(json.dumps(redirects, indent=1))


if __name__ == "__main__":
    main()
