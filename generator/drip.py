"""Daily drip — publish a few NEW unique articles per run, until a site hits its target.

This is the Google-safe way to scale: gradual cadence, not a one-shot mass dump.
Runs the full 3-agent SEO pipeline and writes straight to Supabase (no admin server needed),
so it can be scheduled (Windows Task Scheduler / cron).

Usage:
    python drip.py [site_id] [count_per_run] [target_total]
Examples:
    python drip.py qatarexperts 3 50      # 3 new/day until the site has 50
    python drip.py all 1 50               # 1 new/day for EVERY site until each has 50
"""
import sys
import json
import os
import time
from datetime import datetime

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store
from modules import pipeline as _pipe
from modules.pipeline import generate_article, suggest_titles

SITE = sys.argv[1] if len(sys.argv) > 1 else "qatarexperts"
PER_RUN = int(sys.argv[2]) if len(sys.argv) > 2 else 3
TARGET = int(sys.argv[3]) if len(sys.argv) > 3 else 50
# Optional 4th arg: a seed/theme so this run's titles stay in one category
# (e.g. "richest billionaires net worth" for Countly's daily wealth article).
SEED = sys.argv[4] if len(sys.argv) > 4 else ""
# Optional batch knobs (used by the manual-batch workflow):
#   DRIP_TAG   — forced FIRST tag, which sites render as the article's category label
#   DRIP_STYLE — extra writing-style guidance appended to the site's tone
TAG = os.getenv("DRIP_TAG", "").strip()
STYLE = os.getenv("DRIP_STYLE", "").strip()
_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "drip.log")

if TAG:
    _add_article = store.add_article

    def _add_tagged(article: dict) -> dict:
        rest = [t for t in article.get("tags") or [] if t.strip().lower() != TAG.lower()]
        article["tags"] = [TAG] + rest
        return _add_article(article)

    store.add_article = _add_tagged


def log(msg: str):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    print(line)
    try:
        with open(_LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def _coverage(site_id: str):
    # DRIP_COVERAGE=<name> picks data/coverage_<name>.json (e.g. probashiinfo_visa); default: coverage_<site>.json
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", f"coverage_{os.getenv('DRIP_COVERAGE') or site_id}.json")
    try:
        return json.load(open(p, encoding="utf-8"))
    except Exception:
        return None


def coverage_seed(cov: dict, titles: list[str]) -> str:
    """Least-covered country first, then its least-covered topic, then the next idea for that cell —
    so a site like GCCGuide fills every country x topic instead of writing about one country."""
    import re as _re
    cs = {c: _re.compile(v[0], _re.I) for c, v in cov["countries"].items()}
    ts = [(t, _re.compile(t["re"], _re.I)) for t in cov["topics"]]
    if cov.get("once"):  # one guide per country, in list order; "" when every country is covered
        tr = _re.compile(cov["topics"][0]["re"], _re.I)
        todo = [c for c, r in cs.items() if not any(r.search(x) and tr.search(x) for x in titles)]
        if not todo:
            return ""
        c = todo[0]
        return (f"{cov['countries'][c][1]} — {cov['topics'][0]['ideas'][0]}. The title MUST name {c} explicitly and the whole article "
                f"must be about working in {c} only.")
    cnt = {c: sum(1 for x in titles if r.search(x)) for c, r in cs.items()}
    country = min(cnt, key=lambda c: (cnt[c], list(cs).index(c)))
    mine = [x for x in titles if cs[country].search(x)]
    tc = [(sum(1 for x in mine if r.search(x)), i, t) for i, (t, r) in enumerate(ts)]
    have, _, topic = min(tc, key=lambda z: (z[0], z[1]))
    idea = topic["ideas"][have % len(topic["ideas"])]
    label = cov["countries"][country][1]
    return (f"{label}: {idea}. The title MUST name {country} explicitly and be about {country} only "
            f"(not Qatar or another GCC country unless it is {country}).")


# Words that say how people ask, not what about: "how many people speak english" is about {english}.
_GENERIC = set("how many much people person top best popular most largest biggest world worlds number numbers list use used "
               "using play playing speak count users user there are is the in of for and to by what which who whats does do "
               "2024 2025 2026 2027 10 20 50 100 mobile online today now new latest".split()) | {
    "কত", "টাকা", "লাগে", "লাগবে", "কি", "কী", "কোন", "দেশ", "দেশের", "দেশে", "যেতে", "যাওয়ার", "উপায়", "নিয়ম", "সহজ",
    "সালে", "বর্তমানে", "আছে", "চালু", "করতে", "করার"}


_BRANDS = ("countly", "visapoint", "infkey", "gccguide", "ninetymins", "probashi", "প্রবাসী ইনফো", "colours of bangladesh")


def _topic_words(text: str) -> set:
    return {w for w in _pipe._tokens(text) if w not in _GENERIC}


def _covers(title_tokens: set, core: set) -> bool:
    """Every topic word of the query appears in the title (prefix match covers speak/speakers, user/users)."""
    stem = lambda w: (w[:-1] if len(w) > 3 and w.endswith("s") else w)[:5]
    have = {stem(w) for w in title_tokens}
    return all(stem(w) in have for w in core)


def drip_site(site: dict):
    if STYLE:
        site = dict(site, tone=f"{site['tone']} STYLE FOR THIS BATCH: {STYLE}")
    existing = store.list_articles(site["id"])
    have = len(existing)
    if have >= TARGET:
        log(f"[{site['id']}] at target ({have}/{TARGET}) — skip")
        return 0
    n = min(PER_RUN, TARGET - have)
    avoid = [a.get("title", "") for a in existing] + [a.get("keyword", "") for a in existing]
    try:  # never reuse a hero photo another article already has
        from modules import image as _img
        _img._USED.update(a.get("image_url") for a in existing if a.get("image_url"))
    except Exception:
        pass
    # Real demand first: Search Console / Bing AI queries (data/demand_<site>.json) that no
    # existing article answers yet. Covered = an existing title holds all the query's topic words.
    demand_titles = []
    if not SEED:
        try:
            dq = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", f"demand_{site['id']}.json"),
                                encoding="utf-8")).get("queries", [])
        except Exception:
            dq = []
        have_tok = [_pipe._tokens(t) for t in avoid if t]
        for q in dq:
            if len(demand_titles) >= n:
                break
            core = _topic_words(q["q"])
            # a search for our own brand ("countly analytics" = the Countly company) is not a topic to write
            if any(b in q["q"].lower() for b in _BRANDS):
                continue
            if not core or any(_covers(h, core) for h in have_tok) or _pipe.too_similar(q["q"], avoid + demand_titles):
                continue
            seed = (f"Write the article that directly answers this REAL search query: \"{q['q']}\" "
                    f"({q.get('impr', '?')} searches/AI citations seen). The title must use the query's own words "
                    f"and promise the specific answer.")
            log(f"[{site['id']}] demand seed: {q['q']}")
            got = suggest_titles(site, count=1, seed=seed, avoid=avoid + demand_titles)
            demand_titles += got
            have_tok.append(core)  # one article per query even if the title drifts
        n -= len(demand_titles)
    cov = None if SEED else _coverage(site["id"])
    if n <= 0:
        titles = []
    elif cov:
        seen = [a.get("title", "") for a in existing]
        titles = []
        for _ in range(n):
            seed = coverage_seed(cov, seen + titles)
            if not seed:
                log(f"[{site['id']}] coverage complete — normal topic")
                titles += suggest_titles(site, count=1, seed=SEED, avoid=avoid + titles)
                continue
            log(f"[{site['id']}] coverage seed: {seed[:110]}")
            got = []
            for wait in (0, 20, 45):  # free LLM chain sometimes returns nothing when rate-limited
                if wait:
                    time.sleep(wait)
                got = suggest_titles(site, count=1, seed=seed, avoid=avoid + titles)
                if got:
                    break
            titles += got
    else:
        titles = suggest_titles(site, count=n, seed=SEED, avoid=avoid)
    titles = demand_titles + titles
    log(f"[{site['id']}] planning {len(titles)} new ({have}/{TARGET})" + (f" [seed: {SEED}]" if SEED else ""))
    done = 0
    for t in titles:
        # One retry: a rejected draft (thin, wrong language, all providers briefly
        # rate-limited) usually succeeds on a second pass.
        for attempt in (1, 2):
            try:
                # The 900-word floor exists to catch truncated stubs. On the retry a complete
                # 780+ word draft is accepted, so one slightly short article (e.g. when the main
                # LLM is out of quota and a smaller fallback writes it) does not fail the whole run.
                _pipe.MIN_PUBLISH_WORDS = 900 if attempt == 1 else 780
                art = generate_article(site, t, log=lambda m, sid=site["id"]: log(f"[{sid}] {m.strip()}")
                                       if any(k in m for k in ("grounding", "humanizer", "brief")) else None)
                done += 1
                log(f"[{site['id']}] ✅ {art['title']} ({art['word_count']}w)")
                break
            except Exception as e:
                log(f"[{site['id']}] ❌ {t} — {e}" + (" — retrying" if attempt == 1 else ""))
                if attempt == 1 and "near-duplicate" in str(e):
                    # the same title would clash again — ask for a different angle instead
                    avoid.append(t)
                    t = (suggest_titles(site, count=1, seed=SEED, avoid=avoid + titles) or [t])[0]
    log(f"[{site['id']}] drip done +{done} → {have + done}/{TARGET}")
    if done == 0:
        _FAILED.append(site["id"])
    return done


# Sites that were below target but published nothing — makes the run exit non-zero so
# a dead LLM key shows up as a red CI run instead of weeks of silent "success".
_FAILED: list[str] = []


def main():
    if SITE == "all":
        # `all` only touches sites with drip_enabled != false. Sites turned off here
        # (or covered by their own dedicated task, e.g. probashiinfo) are skipped.
        sites = [s for s in store.load_sites() if s.get("drip_enabled", True)]
    else:
        # Explicit site arg always runs, even if drip_enabled is false (dedicated tasks).
        sites = [s for s in store.load_sites() if s["id"] == SITE]
    if not sites:
        log(f"unknown site '{SITE}'")
        return
    total = sum(drip_site(s) for s in sites)
    log(f"=== run complete: +{total} article(s) ===")
    if _FAILED:
        log(f"FAILED: no article published for {', '.join(_FAILED)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
