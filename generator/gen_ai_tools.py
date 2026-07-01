"""Best AI Tools directory — seed + daily live refresh for the countly `ai_tools` table.

Two modes:
  python gen_ai_tools.py --seed       # upsert the curated dataset (data/ai_tools_seed.json)
  python gen_ai_tools.py --refresh    # daily: pull live GitHub stars, growth%, url liveness

Design / honesty:
  - Editorial `rank` (curated best-first) is the primary order and stays stable.
  - The daily "count that grows/shrinks" is REAL, FREE data: GitHub stargazers for the
    open-source tools (api.github.com, 60 req/hr unauth is plenty for one run/day).
  - Closed tools (ChatGPT, Midjourney…) have no free live user API, so they carry only a
    clearly-labelled `users_est` (publicly-reported scale) and no fabricated growth number.
  - `url_ok` is set by a live HEAD check so dead outbound links get hidden automatically.
"""
import argparse
import json
import math
import os
import sys
import time

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config.settings import SUPABASE_URL, SUPABASE_SERVICE_KEY  # noqa: E402

SEED_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "ai_tools_seed.json")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
UA = "Mozilla/5.0 (compatible; AutoBlog-AiTools/1.0; +https://countly.net)"
TABLE = f"{SUPABASE_URL}/rest/v1/ai_tools"


def _sb_headers(extra: dict | None = None) -> dict:
    h = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


# ── GitHub live stars ──────────────────────────────────
def github_stats(repo: str) -> dict | None:
    """Return {stars, forks} for 'owner/repo', or None if it 404s / errors."""
    if not repo or "/" not in repo:
        return None
    headers = {"Accept": "application/vnd.github+json", "User-Agent": UA}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    try:
        r = requests.get(f"https://api.github.com/repos/{repo}", headers=headers, timeout=20)
        if r.status_code != 200:
            return None
        d = r.json()
        return {"stars": int(d.get("stargazers_count", 0)), "forks": int(d.get("forks_count", 0))}
    except Exception:
        return None


def url_alive(url: str) -> bool:
    """Conservative liveness: only a hard 404/410 or a total connection failure counts
    as dead. Many real sites (Claude, Midjourney, Meta AI…) return 403/401/429 to
    non-browser requests, so those must NOT hide the tool."""
    if not url:
        return False
    got_response = False
    for method in (requests.head, requests.get):
        try:
            r = method(url, headers={"User-Agent": UA}, timeout=15, allow_redirects=True)
            got_response = True
            if r.status_code in (404, 410):
                return False
            if r.status_code < 400:
                return True
            # 401/403/405/429/5xx → site exists but blocks bots; treat as alive.
        except Exception:
            continue
    return got_response


# ── Seed ───────────────────────────────────────────────
def seed():
    with open(SEED_PATH, encoding="utf-8") as f:
        data = json.load(f)
    cats = data.get("categories", data if isinstance(data, list) else [])
    rows = []
    for ci, cat in enumerate(cats):
        tools = cat.get("tools", [])
        for ti, t in enumerate(tools):
            rows.append({
                "slug": t["slug"],
                "name": t["name"],
                "category": cat.get("category", cat.get("name", "")),
                "category_key": cat.get("key", ""),
                "heading_keyword": cat.get("heading_keyword", ""),
                "category_blurb": cat.get("blurb", ""),
                "url": t["url"].rstrip("/"),
                "blurb": t.get("blurb", ""),
                "pricing": t.get("pricing", ""),
                "github_repo": (t.get("github", "") or "").strip(),
                "users_est": t.get("users_est", ""),
                "tags": t.get("tags", []),
                "highlight": t.get("highlight", ""),
                "cat_order": ci,
                "rank": ti + 1,
                "score": float(len(tools) - ti),  # editorial prior; refresh blends stars in
            })
    # Upsert on the slug primary key.
    r = requests.post(
        TABLE,
        headers=_sb_headers({"Prefer": "resolution=merge-duplicates,return=minimal"}),
        json=rows,
        timeout=60,
    )
    r.raise_for_status()
    print(f"Seeded {len(rows)} tools across {len(cats)} categories.")


# ── Daily refresh ──────────────────────────────────────
def refresh():
    r = requests.get(f"{TABLE}?select=*", headers=_sb_headers(), timeout=60)
    r.raise_for_status()
    rows = r.json()
    updated = 0
    for row in rows:
        patch = {"url_ok": url_alive(row.get("url", "")), "updated_at": "now()"}
        repo = (row.get("github_repo") or "").strip()
        if repo:
            gs = github_stats(repo)
            if gs:
                old = int(row.get("stars") or 0)
                new = gs["stars"]
                growth = round((new - old) / old * 100, 2) if old > 0 else 0.0
                patch.update({
                    "stars": new,
                    "stars_prev": old,
                    "forks": gs["forks"],
                    "growth_pct": growth,
                    # popularity score (log stars) — used only for the optional "trending" sort
                    "score": round(math.log10(new + 1) * 10, 3),
                })
            time.sleep(0.4)  # be gentle with the unauth GitHub rate limit
        pr = requests.patch(
            f"{TABLE}?slug=eq.{row['slug']}",
            headers=_sb_headers({"Prefer": "return=minimal"}),
            json=patch,
            timeout=30,
        )
        if pr.ok:
            updated += 1
    print(f"Refreshed {updated}/{len(rows)} tools (GitHub stars + url liveness).")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", action="store_true")
    ap.add_argument("--refresh", action="store_true")
    args = ap.parse_args()
    if args.seed:
        seed()
    elif args.refresh:
        refresh()
    else:
        print("Use --seed or --refresh")
