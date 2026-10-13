"""Rewrite Rank Math titles/descriptions of probashiinfo posts that rank but get few clicks.

Targets come from data/gsc_probashiinfo.json (Search Console, refreshed by hand or by
Supermetrics): pages on the first two result pages (position <= 15) with >= 300
impressions and CTR under 3%. For each, an LLM writes a title + description that use
the page's real search queries and only facts found in the post itself. Every change is
appended to data/ctr_log_probashiinfo.json with the before-values and the GSC baseline,
so the result can be measured (and reverted) later.

    python wp_ctr.py                # dry run: print proposals
    python wp_ctr.py --apply [N]    # write the first N (default all) to WordPress

Rank Math's meta keys are not exposed over REST by default, so --apply first installs a
Code Snippet ("AutoBlog Rank Math REST meta") that registers them for editors.
"""
import base64
import html
import json
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone

import requests

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import llm  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data", "gsc_probashiinfo.json")
LOG = os.path.join(HERE, "data", "ctr_log_probashiinfo.json")
# Hand-written fixes ({url, title?, description?}), applied with --overrides.
OVERRIDES = os.path.join(HERE, "data", "ctr_overrides_probashiinfo.json")
APPLY = "--apply" in sys.argv
LIMIT = next((int(a) for a in sys.argv[1:] if a.isdigit()), 0)
YEAR = datetime.now(timezone.utc).year
# Pages whose article facts need a human check before a number goes into the title.
SKIP = {"https://probashiinfo.com/list-of-schengen-countries-in-europe-2026/"}  # title + facts fixed by hand in the overrides file

BASE = os.environ["PROBASHIINFO_WP_URL"].rstrip("/")
AUTH = base64.b64encode(f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()).decode()
H = {"Authorization": f"Basic {AUTH}", "User-Agent": "AutoBlog/1.0"}

SNIPPET_NAME = "AutoBlog Rank Math REST meta"
SNIPPET_CODE = """/* Expose Rank Math title/description to the REST API for editors (managed by AutoBlog generator/wp_ctr.py). */
add_action( 'init', function () {
\tforeach ( array( 'rank_math_title', 'rank_math_description', 'rank_math_focus_keyword' ) as $key ) {
\t\tregister_post_meta( 'post', $key, array(
\t\t\t'type' => 'string', 'single' => true, 'show_in_rest' => true,
\t\t\t'auth_callback' => function () { return current_user_can( 'edit_posts' ); },
\t\t) );
\t}
} );
"""

SYSTEM = """You write Google search snippets for a Bangla website that helps Bangladeshi migrant workers (probashi).
Return JSON: {"title": "...", "description": "..."}.
Rules:
- Bangla, natural, no clickbait or false promises. Use ONLY facts that appear in the article text given (costs, salaries, numbers, steps). Never invent numbers.
- title: 40-60 characters. Put the main search query words first. Add the year %d when the topic is time-sensitive. Add one concrete hook from the article (a number, a cost, "ধাপে ধাপে", a count of countries). No site name, no pipes, no emoji.
- description: 120-155 characters, one or two complete sentences ending with "।". Say exactly what the reader gets (cost, salary, documents, process) and why it is current.
- Correct, fluent Bangla grammar (e.g. "কোন কোন দেশে যাওয়া যায়", not "যায়"). Read it back before answering.
- Never mention an earlier year than %d.
- Different from the current title — the current one gets few clicks.""" % (YEAR, YEAR)


def wp(method, path, **kw):
    for i in range(3):
        try:
            r = requests.request(method, f"{BASE}/wp-json/{path}", headers=H, timeout=60, **kw)
            if r.status_code < 500:
                return r
        except requests.RequestException:
            pass
        time.sleep(3 * (i + 1))
    return r


def ensure_snippet():
    api = "code-snippets/v1/snippets"
    existing = next((s for s in wp("GET", api).json() if s.get("name") == SNIPPET_NAME), None)
    body = {"name": SNIPPET_NAME, "code": SNIPPET_CODE, "scope": "global", "active": True}
    r = wp("POST", f"{api}/{existing['id']}" if existing else api, json=body)
    r.raise_for_status()
    if not existing:
        wp("POST", f"{api}/{r.json()['id']}/activate")
    print("snippet ok", r.json().get("id"))


def find_post(url):
    slug = urllib.parse.unquote(urllib.parse.urlparse(url).path.strip("/").split("/")[-1])
    if not slug:
        return None
    r = wp("GET", "wp/v2/posts", params={"slug": slug, "context": "edit", "status": "publish"})
    rows = r.json() if r.ok else []
    return rows[0] if rows else None


def plain(s, n):
    s = re.sub(r"<(script|style).*?</\1>", " ", s or "", flags=re.S)
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))
    return re.sub(r"\s+", " ", s).strip()[:n]


def live_snippet(url):
    try:
        t = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30).text
    except requests.RequestException:
        return "", ""
    title = re.search(r"<title[^>]*>(.*?)</title>", t, re.S)
    desc = re.search(r'<meta name="description" content="([^"]*)"', t)
    return html.unescape(title.group(1)).strip() if title else "", html.unescape(desc.group(1)) if desc else ""


def to_bn(n):
    return str(n).translate(str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")).zfill(2)


def propose(page, post, cur_title, cur_desc):
    queries = ", ".join(f"{q} ({imp})" for q, imp, *_ in page["queries"][:6]) or "(Google hides the queries; infer from the article)"
    user = (f"Search queries people use (impressions): {queries}\n"
            f"Google position: {page['position']}, impressions 90d: {page['impressions']}, CTR: {page['ctr']*100:.1f}%\n"
            f"Current title: {cur_title}\nCurrent description: {cur_desc}\n\n"
            f"Article title: {plain(post['title']['raw'], 200)}\n"
            f"Article text (start): {plain(post['content']['raw'], 3500)}")
    stale = re.compile(r"(20|২০)(%s)" % "|".join(f"{y % 100:02d}|{to_bn(y % 100)}" for y in range(YEAR - 6, YEAR)))
    problem = ""
    for _ in range(3):
        out = json.loads(llm.chat(SYSTEM, user + (f"\n\nYour previous answer was rejected: {problem}. Fix it." if problem else ""),
                                  temperature=0.5, max_tokens=600, json_mode=True))
        t, d = out["title"].strip(), out["description"].strip()
        if not 30 <= len(t) <= 62:
            problem = f"title is {len(t)} characters, must be 40-60"
        elif not 100 <= len(d) <= 158:
            problem = f"description is {len(d)} characters, must be 120-155"
        elif stale.search(t + d):
            problem = f"it mentions an old year; the current year is {YEAR}"
        else:
            return t, d
    raise ValueError(problem)


def apply_overrides():
    rows = json.load(open(OVERRIDES, encoding="utf-8"))
    ensure_snippet()
    for o in rows:
        post = find_post(o["url"])
        if not post:
            print("  - no published post for", o["url"])
            continue
        meta = {k: v for k, v in (("rank_math_title", o.get("title")), ("rank_math_description", o.get("description"))) if v}
        body = {"meta": meta}
        if o.get("replace"):  # exact-text corrections in the article itself
            html = post["content"]["raw"]
            for old, new in o["replace"]:
                print(("   ✓ " if old in html else "   ✗ not found: ") + old[:60])
                html = html.replace(old, new)
            if html != post["content"]["raw"]:
                body["content"] = html
        r = wp("POST", f"wp/v2/posts/{post['id']}", json=body)
        print(f"#{post['id']} {r.status_code} {o.get('title', '')}")


def main():
    if "--overrides" in sys.argv:
        return apply_overrides()
    pages = json.load(open(DATA, encoding="utf-8"))["pages"]
    targets = [p for p in pages if p["impressions"] >= 300 and p["ctr"] < 0.03 and p["position"] <= 15]
    log = json.load(open(LOG, encoding="utf-8")) if os.path.exists(LOG) else []
    done = {e["url"] for e in log}
    targets = [p for p in targets if p["url"] not in done and p["url"] not in SKIP]
    if LIMIT:
        targets = targets[:LIMIT]
    print(f"{len(targets)} pages to rewrite ({'APPLY' if APPLY else 'dry run'})")
    if APPLY:
        ensure_snippet()
    changed = 0
    for p in targets:
        post = find_post(p["url"])
        if not post:
            print("  - no published post for", p["url"])
            continue
        cur_t, cur_d = live_snippet(p["url"])
        try:
            t, d = propose(p, post, cur_t, cur_d)
        except Exception as e:
            print("  ! LLM failed", p["url"], e)
            continue
        print(f"\n#{post['id']} {p['impressions']} impr, CTR {p['ctr']*100:.1f}%, pos {p['position']}\n  OLD {cur_t}\n  NEW {t}\n  DSC {d}")
        if not APPLY:
            continue
        r = wp("POST", f"wp/v2/posts/{post['id']}", json={"meta": {"rank_math_title": t, "rank_math_description": d}})
        if not r.ok:
            print("  ! update failed", r.status_code, r.text[:200])
            continue
        log.append({"url": p["url"], "post_id": post["id"], "date": datetime.now(timezone.utc).date().isoformat(),
                    "old_title": cur_t, "old_description": cur_d, "new_title": t, "new_description": d,
                    "baseline": {k: p[k] for k in ("impressions", "clicks", "ctr", "position")}})
        changed += 1
        json.dump(log, open(LOG, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n{changed} posts updated")


if __name__ == "__main__":
    main()
