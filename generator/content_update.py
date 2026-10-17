"""Content maintenance on the free LLM chain — two jobs:

  fill    : write an article for every pillar keyword (pillars.json) that has none
  refresh : rewrite articles IN PLACE (same URL) with current facts, prices and year — first the
            ones Google/Bing already show but rarely click, then old dated posts ("… 2025")
            and posts older than N days

    python content_update.py fill infkey 4
    python content_update.py refresh all 1 --days 60
    python content_update.py fill infkey 4 --dry-run
"""
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from modules import store
from modules.pipeline import generate_article, suggest_titles, too_similar

ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
DRY = "--dry-run" in sys.argv
JOB = ARGS[0] if ARGS else "fill"
SITE = ARGS[1] if len(ARGS) > 1 else "all"
N = int(ARGS[2]) if len(ARGS) > 2 else 1
DAYS = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 60
ACTIVE = ["infkey", "countly", "walvi", "ninetymins", "gccguide"]
YEAR = datetime.now(timezone.utc).year


def log(msg: str):
    print(f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}", flush=True)


def published(site_id: str) -> list:
    return [a for a in store.list_articles(site_id) if (a.get("status") or "published") == "published"]


def covered(kw: str, arts: list) -> bool:
    words = [w for w in re.findall(r"[a-z0-9]+", kw.lower()) if w not in {"how", "to", "for", "the", "a", "best", "free", "ai"}]
    for a in arts:
        t = f"{a.get('title', '')} {a.get('keyword', '')}".lower()
        if words and all(w.rstrip("s") in t for w in words):
            return True
    return bool(too_similar(kw, [a.get("keyword", "") for a in arts], 0.8))


def fill(site: dict, n: int) -> int:
    pillars = json.load(open(os.path.join(ROOT, "pillars.json"), encoding="utf-8")).get(site["id"], [])
    arts = published(site["id"])
    todo = [k for k in pillars if not covered(k, arts)]
    log(f"[{site['id']}] pillars: {len(pillars)} · missing: {len(todo)}")
    for k in todo:
        log(f"   missing → {k}")
    if DRY:
        return 0
    avoid = [a.get("title", "") for a in arts] + [a.get("keyword", "") for a in arts]
    done = 0
    for kw in todo:
        if done >= n:
            break
        titles = suggest_titles(site, count=1, seed=f"PILLAR KEYWORD (use this exact phrase in the title): {kw}", avoid=avoid)
        if not titles:
            continue
        try:
            art = generate_article(site, titles[0])
            avoid.append(art["title"])
            done += 1
            log(f"[{site['id']}] ✅ PILLAR {art['title']} ← {kw}")
        except Exception as e:
            log(f"[{site['id']}] ❌ {kw} — {e}")
    return done


def _toks(s: str) -> set:
    return {w for w in re.findall(r"[a-z0-9]+", s.lower()) if len(w) > 2 and not w.isdigit()}


def search_demand(site_id: str, arts: list) -> dict:
    """slug → search impressions it already gets but barely converts: Google page impressions
    (data/gsc_<site>.json) plus Bing query impressions whose words sit in the title
    (data/bing_<site>.json). Pages Bing/Google already show are the cheapest wins to refresh."""
    dem = {}
    try:
        g = json.load(open(os.path.join(ROOT, "data", f"gsc_{site_id}.json"), encoding="utf-8"))
        for p in g.get("pages", []):
            slug = p["url"].rstrip("/").rsplit("/", 1)[-1]
            if p.get("clicks", 0) <= p.get("impressions", 0) * 0.02:
                dem[slug] = dem.get(slug, 0) + p.get("impressions", 0)
    except Exception:
        pass
    try:
        b = json.load(open(os.path.join(ROOT, "data", f"bing_{site_id}.json"), encoding="utf-8"))
        titles = [(a["slug"], _toks(a.get("title", "") + " " + a["slug"].replace("-", " "))) for a in arts]
        for q in b.get("queries", []):
            qt = _toks(q.get("q", ""))
            if len(qt) < 2 or q.get("clicks", 0) > q.get("impr", 0) * 0.05:
                continue
            best = max(titles, key=lambda t: len(qt & t[1]), default=None)
            if best and len(qt & best[1]) >= max(2, int(len(qt) * 0.6 + 0.5)):
                dem[best[0]] = dem.get(best[0], 0) + q.get("impr", 0)
    except Exception:
        pass
    return dem


def stale(arts: list, site_id: str = "") -> list:
    cutoff = datetime.now(timezone.utc) - timedelta(days=DAYS)
    recent = datetime.now(timezone.utc) - timedelta(days=21)
    dem = search_demand(site_id, arts) if site_id else {}
    out = []
    for a in arts:
        title = a.get("title", "")
        try:
            created = datetime.fromisoformat(str(a.get("created_at", "")).replace("Z", "+00:00"))
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        years = [int(y) for y in re.findall(r"\b(20[2-3]\d)\b", title)]
        old_year = bool(years) and max(years) < YEAR
        d = dem.get(a.get("slug"), 0)
        if d >= 100 and created < recent:
            # already shown by Google/Bing but hardly clicked: refresh these first, biggest first
            out.append((-1, -d, a))
        elif old_year or created < cutoff:
            # then old-year titles, then oldest
            out.append((0 if old_year else 1, created.timestamp(), a))
    return [a for _, _, a in sorted(out, key=lambda x: (x[0], x[1]))]


def refresh(site: dict, n: int) -> int:
    cands = stale(published(site["id"]), site["id"])
    log(f"[{site['id']}] stale candidates: {len(cands)} (older than {DAYS} days or a past year in the title)")
    for a in cands[:5]:
        log(f"   {str(a.get('created_at'))[:10]}  {a.get('title')}")
    if DRY:
        return 0
    done = 0
    for a in cands[:n]:
        title = re.sub(r"\b20[2-3]\d\b", str(YEAR), a.get("title", ""))
        try:
            art = generate_article(site, title, replace={"id": a["id"], "slug": a["slug"]})
            done += 1
            log(f"[{site['id']}] ♻️  REFRESHED /{a['slug']} → {art['title']}")
        except Exception as e:
            log(f"[{site['id']}] ❌ refresh {a.get('slug')} — {e}")
    return done


def main():
    sites = {s["id"]: s for s in store.load_sites()}
    ids = ACTIVE if SITE == "all" else [SITE]
    total = 0
    for sid in ids:
        if sid in sites:
            total += (fill if JOB == "fill" else refresh)(sites[sid], N)
    log(f"=== {JOB} done: {total} article(s)")


if __name__ == "__main__":
    main()
