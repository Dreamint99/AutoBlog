"""Conservative noindex audit. Missing Search Console rows are unknown, never zero.

Write the report before --apply can write any noindex decisions to D1.
Requires an explicit zero-impression page row for a full >=90-day window,
and a page published before that window. Does not delete article URLs.
"""
import argparse
import datetime as dt
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / "web/node_modules/wrangler/bin/wrangler.js"

def query(sql):
    r = subprocess.run(["node", str(CLI), "d1", "execute", "autoblog-content", "--remote", "--json", "--command", sql], cwd=ROOT / "web", capture_output=True, text=True, encoding="utf-8", check=True)
    return json.loads(r.stdout)[0]["results"]

def audit(site, apply=False):
    data = json.loads((ROOT / f"generator/data/gsc_{site}.json").read_text(encoding="utf-8"))
    dates = re.findall(r"\d{4}-\d{2}-\d{2}", data.get("source", ""))
    full = len(dates) >= 2 and (dt.date.fromisoformat(dates[1]) - dt.date.fromisoformat(dates[0])).days + 1 >= 90
    pages = {}
    for p in data.get("pages", []):
        path = re.sub(r"^https?://[^/]+", "", p["url"]).split("?")[0].strip("/")
        path = re.sub(rf"^s/{site}/", "", path)
        # Legacy aliases and canonical URLs both protect an article.
        pages[path] = max(pages.get(path, 0), p.get("impressions", 0))
    rows = query(f"SELECT slug,title,created_at,body_html FROM articles WHERE site_id='{site}' AND status='published'")
    decisions = []
    for a in rows:
        body = a.get("body_html") or ""
        # Keep tables, named primary sources and number-rich content for review.
        data_rich = bool(re.search(r"<table|worldbank|imf\.org|un\.org|espn|fotmob|statistics|\b\d+(?:\.\d+)?%", body, re.I))
        old = bool(dates) and a["created_at"][:10] <= dates[0]
        impressions = pages.get(a["slug"])
        eligible = full and old and impressions == 0 and not data_rich
        decisions.append({"slug": a["slug"], "title": a["title"], "impressions": impressions, "data_requires_review": data_rich,
            "action": "noindex" if eligible else "keep", "reason": "explicit zero over complete 90-day window; no unique-data signals" if eligible else "positive impressions" if impressions else "missing/insufficient evidence or data page: protected"})
    report = {"site": site, "generated": dt.datetime.now(dt.timezone.utc).isoformat(), "gsc_source": data.get("source"), "complete_90_days": full, "decisions": decisions,
              "warning": "Search Console performance rows do not establish indexing status. Absent rows are unknown. Data heuristics are conservative."}
    out = ROOT / f"generator/data/seo_prune_{site}.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    # Report exists on disk before any mutation. Applying is repeatable.
    candidates = [d for d in decisions if d["action"] == "noindex"]
    if apply and candidates:
        quote = lambda s: "'" + s.replace("'", "''") + "'"
        for d in candidates:
            query("INSERT OR IGNORE INTO seo_pruning(site_id,slug,reason,evidence,applied_at) VALUES(" + ",".join(map(quote, [site, d["slug"], d["reason"], data["source"], report["generated"]])) + ")")
    print(json.dumps({"report": str(out), "reviewed": len(decisions), "noindex": len(candidates), "applied": apply and bool(candidates)}))

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("site", choices=["ninetymins", "countly", "infkey", "walvi", "gccguide"]); p.add_argument("--apply", action="store_true")
    args = p.parse_args(); audit(args.site, args.apply)
