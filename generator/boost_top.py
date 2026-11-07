"""Strengthen the articles search engines already show — the cheapest traffic win.

Picks the top N articles across the 5 Next sites by search demand (Google Search Console
page impressions in data/gsc_<site>.json + Bing query impressions in data/bing_<site>.json
matched to the article by title words) and, for each one, in place (same URL):

  1. title + meta description rewritten around the queries people actually type
     (CTR: these pages get impressions but almost no clicks)
  2. a "Quick answer" paragraph at the top — 2-3 sentences that answer the main query
  3. up to 4 new FAQ items answering the real search queries, written ONLY from facts
     already in the article (FAQ field, FAQ section in the body and FAQPage JSON-LD)
  4. Article schema dateModified set to now
  5. incoming internal links: up to 3 related articles on the same site get a
     "Related:" link to it (a page linked from nowhere but the sitemap is what Google
     leaves "Discovered – currently not indexed")

White-hat only: no new facts are invented, nothing is hidden, links are topical and few.
Reruns replace the blocks (marked <!-- ab-boost --> / <!-- ab-rel -->), never stack them.
Changed URLs are pinged to IndexNow. Every article's previous fields are saved to
output/boost_backup/ (uploaded as a workflow artifact) and a summary goes to data/boost_log.json.

    python boost_top.py                 # dry run: print the picks and the new title/description
    python boost_top.py --apply [N]     # N = how many articles (default 50)
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from modules import llm, indexnow, store  # noqa: E402

APPLY = "--apply" in sys.argv
N = next((int(a) for a in sys.argv[1:] if a.isdigit()), 50)
SITES = ["countly", "walvi", "infkey", "gccguide", "ninetymins"]
PER_SITE_CAP = 15
WEB = os.path.join(HERE, "..", "web")
LOG = os.path.join(HERE, "data", "boost_log.json")
BACKUP = os.path.join(HERE, "output", "boost_backup")
BOOST = re.compile(r"\s*<!-- ab-boost -->.*?<!-- /ab-boost -->", re.S)
QA_BLOCK = re.compile(r"\s*<!-- ab-boost-qa -->.*?<!-- /ab-boost-qa -->", re.S)
REL = re.compile(r"\s*<!-- ab-rel -->(.*?)<!-- /ab-rel -->", re.S)
FILLER = re.compile(r"\b(complete|essential|ultimate|comprehensive|definitive)\b", re.I)
NOW = datetime.now(timezone.utc)


def log(m: str):
    print(f"{datetime.now():%H:%M:%S} {m}", flush=True)


# ── D1 ────────────────────────────────────────────────────────────────
def _wrangler(args: list, timeout=180) -> str:
    for npx in ("npx.cmd", "npx"):
        try:
            r = subprocess.run([npx, "wrangler", "d1", "execute", "autoblog-content", "--remote", *args],
                               cwd=WEB, capture_output=True, text=True, timeout=timeout,
                               encoding="utf-8", errors="replace", env=store._wrangler_env())
            break
        except FileNotFoundError:
            continue
    else:
        raise RuntimeError("wrangler not found")
    if r.returncode != 0:
        raise RuntimeError(f"wrangler failed: {(r.stdout + r.stderr)[-400:]}")
    return r.stdout


def d1_query(sql: str) -> list:
    data = json.loads(_wrangler(["--command", sql, "--json"]))
    return data[0].get("results", []) if isinstance(data, list) and data else []


def d1_update(article_id: str, fields: dict):
    sets = ", ".join(f"{c} = {store._d1_sql_val(c, v)}" for c, v in fields.items())
    sql = f"UPDATE articles SET {sets} WHERE id = {store._d1_sql_val('id', article_id)};"
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f:
        f.write(sql)
        path = f.name
    try:
        out = _wrangler(["--file", path, "--yes"])
        if "Executed" not in out and "success" not in out.lower():
            raise RuntimeError(f"D1 update not confirmed: {out[-300:]}")
    finally:
        os.unlink(path)


def full_article(site_id: str, slug: str) -> dict | None:
    q = lambda s: "'" + s.replace("'", "''") + "'"
    rows = d1_query(f"SELECT * FROM articles WHERE site_id={q(site_id)} AND slug={q(slug)} AND status='published' LIMIT 1;")
    if not rows:
        return None
    a = rows[0]
    for c in store._D1_JSON:
        if isinstance(a.get(c), str):
            try:
                a[c] = json.loads(a[c])
            except Exception:
                pass
    return a


# ── picking ───────────────────────────────────────────────────────────
def toks(s: str) -> set:
    return {w for w in re.findall(r"[a-z0-9]+", s.lower()) if len(w) > 2 and not w.isdigit()}


def demand(site_id: str, arts: list) -> dict:
    """slug -> {"impr": n, "queries": [(query, impressions, position)]}"""
    out: dict = {}
    slugs = {a["slug"] for a in arts}

    def add(slug, q, imp, pos):
        d = out.setdefault(slug, {"impr": 0, "queries": []})
        d["impr"] += imp
        if q and q != "(unknown)" and not q.startswith("site:") and len(q.split()) >= 2:
            d["queries"].append((q, imp, pos))

    try:
        for p in json.load(open(os.path.join(HERE, "data", f"gsc_{site_id}.json"), encoding="utf-8"))["pages"]:
            slug = p["url"].rstrip("/").rsplit("/", 1)[-1]
            if slug not in slugs:
                continue
            d = out.setdefault(slug, {"impr": 0, "queries": []})
            d["impr"] += p.get("impressions", 0)
            for q, imp, clk, pos in p.get("queries", []):
                if q and q != "(unknown)" and not q.startswith("site:") and len(q.split()) >= 2:
                    d["queries"].append((q, imp, pos))  # page impressions are already counted
    except Exception as e:
        log(f"[{site_id}] no GSC data ({e})")
    try:
        titles = [(a["slug"], toks(a.get("title", "") + " " + a["slug"].replace("-", " "))) for a in arts]
        for q in json.load(open(os.path.join(HERE, "data", f"bing_{site_id}.json"), encoding="utf-8")).get("queries", []):
            qt = toks(q.get("q", ""))
            if len(qt) < 2:
                continue
            best = max(titles, key=lambda t: len(qt & t[1]), default=None)
            if best and len(qt & best[1]) >= max(2, int(len(qt) * 0.6 + 0.5)):
                add(best[0], q["q"], q.get("impr", 0), q.get("pos", 0))
    except Exception as e:
        log(f"[{site_id}] no Bing data ({e})")
    for d in out.values():
        seen, qs = set(), []
        for q, imp, pos in sorted(d["queries"], key=lambda x: -x[1]):
            if q.lower() not in seen:
                seen.add(q.lower())
                qs.append((q, imp, pos))
        d["queries"] = qs[:8]
    return out


def boosted_recently(days=30) -> set:
    try:
        rows = json.load(open(LOG, encoding="utf-8"))
    except Exception:
        return set()
    cut = NOW.timestamp() - days * 86400
    return {f"{r['site']}/{r['slug']}" for r in rows if datetime.fromisoformat(r["at"]).timestamp() > cut}


# ── writing ───────────────────────────────────────────────────────────
SYSTEM = """You are an SEO editor improving an existing English article so it answers what searchers typed.
Return JSON only:
{"meta_title": "...", "meta_description": "...", "quick_answer": "...", "faq": [{"q": "...", "a": "..."}]}
Rules:
- Use ONLY facts, numbers and names that appear in the article text. Never invent figures, dates, fees or laws.
- meta_title: 40-60 characters, starts with the main search topic, plain and specific (a number or year when the
  article has one). No clickbait, no ALL CAPS, never the words Complete, Essential, Ultimate, Comprehensive.
- meta_description: 120-155 characters, ONE OR TWO full sentences ending with a period, says what the reader gets.
- quick_answer: 2-3 short sentences (max 320 characters) that directly answer the main search query, the way a
  featured snippet would. Start with the answer itself, not "This article".
- faq: up to 4 items, one per search query that the article's existing FAQ does not already answer. "q" is the query
  rewritten as a natural question; "a" is 1-3 sentences (max 300 characters) answered from the article. If the article
  does not contain the answer, leave that query out.
- No markdown, no emoji, no HTML."""


def plain(html: str, n: int) -> str:
    t = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", html or "")
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"&nbsp;|&#160;", " ", t)
    return re.sub(r"\s+", " ", t).strip()[:n]


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def write_boost(a: dict, queries: list) -> dict | None:
    old_faq = [f.get("q", "") for f in (a.get("faq") or []) if isinstance(f, dict)]
    user = (
        f"Current title: {a['title']}\nCurrent meta title: {a.get('meta_title') or ''}\n"
        f"Current meta description: {a.get('meta_description') or ''}\n"
        "Search queries this page already appears for (impressions, average position):\n"
        + "\n".join(f"- {q} ({imp}, pos {pos})" for q, imp, pos in queries)
        + "\nExisting FAQ questions:\n" + "\n".join(f"- {q}" for q in old_faq)
        + f"\n\nArticle text:\n{plain(BOOST.sub('', a['body_html']), 9000)}"
    )
    problem = ""
    for _ in range(3):
        try:
            out = json.loads(llm.chat(SYSTEM, user + (f"\n\nYour previous answer was rejected: {problem}" if problem else ""),
                                      temperature=0.3, max_tokens=1800, json_mode=True))
        except Exception as e:
            problem = f"invalid JSON ({str(e)[:80]})"
            continue
        mt = (out.get("meta_title") or "").strip()
        md = re.sub(r"\s+", " ", (out.get("meta_description") or "").strip())
        qa = re.sub(r"\s+", " ", (out.get("quick_answer") or "").strip())
        errs = []
        if not 30 <= len(mt) <= 62:
            errs.append(f"meta_title is {len(mt)} chars, need 40-60")
        if FILLER.search(mt):
            errs.append("meta_title uses a banned filler word")
        if not 110 <= len(md) <= 160 or not md.endswith((".", "!", "?")):
            errs.append(f"meta_description is {len(md)} chars or does not end with a full stop, need 120-155")
        if not 60 <= len(qa) <= 360:
            errs.append("quick_answer must be 2-3 sentences, max 320 chars")
        if errs:
            problem = "; ".join(errs)
            continue
        seen = {re.sub(r"\W+", "", q.lower()) for q in old_faq}
        faq = []
        for f in out.get("faq") or []:
            q, ans = (f.get("q") or "").strip(), (f.get("a") or "").strip()
            key = re.sub(r"\W+", "", q.lower())
            if q and ans and len(ans) <= 400 and key not in seen:
                seen.add(key)
                faq.append({"q": q, "a": ans})
        return {"meta_title": mt, "meta_description": md, "quick_answer": qa, "faq": faq[:4]}
    log(f"   ! no usable rewrite: {problem}")
    return None


def apply_boost(a: dict, b: dict) -> dict:
    body = QA_BLOCK.sub("", BOOST.sub("", a["body_html"]))
    stamp = NOW.strftime("%B %Y")
    quick = (f'<!-- ab-boost --><p class="quick-answer"><strong>Quick answer:</strong> {esc(b["quick_answer"])}'
             f' <small>(Updated {stamp})</small></p><!-- /ab-boost -->\n')
    body = quick + body.lstrip()
    if b["faq"]:
        items = "".join(f"<div class='faq-item'><h3>{esc(f['q'])}</h3><p>{esc(f['a'])}</p></div>" for f in b["faq"])
        block = f"<!-- ab-boost-qa -->{items}<!-- /ab-boost-qa -->"
        m = re.search(r"<h2[^>]*>\s*(Frequently asked questions|FAQs?)\s*</h2>", body, re.I)
        if m:
            # after the existing FAQ items: before the next <h2> following the FAQ heading
            nxt = re.search(r"<h2\b", body[m.end():])
            at = m.end() + nxt.start() if nxt else len(body)
            body = body[:at] + block + body[at:]
        else:
            body = body.rstrip() + f"\n<h2>Frequently asked questions</h2>{block}"
    faq = [f for f in (a.get("faq") or []) if isinstance(f, dict)]
    faq += b["faq"]
    schema = a.get("schema") if isinstance(a.get("schema"), dict) else {}
    graph = schema.get("@graph") if isinstance(schema.get("@graph"), list) else []
    graph = [g for g in graph if g.get("@type") != "FAQPage"]
    art = next((g for g in graph if g.get("@type") in ("Article", "NewsArticle", "BlogPosting")), None)
    if art is None:
        art = {"@type": "Article", "headline": a["title"], "datePublished": a.get("created_at")}
        graph.insert(0, art)
    art["dateModified"] = NOW.isoformat()
    art["description"] = b["meta_description"]
    if faq:
        graph.append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in faq]})
    return {
        "meta_title": b["meta_title"],
        "meta_description": b["meta_description"],
        "body_html": body,
        "faq": faq,
        "schema": {"@context": "https://schema.org", "@graph": graph},
    }


def add_incoming(site_id: str, target: dict, arts: list, exclude: set) -> list:
    """Give the target up to 3 topical links from sibling articles. Returns source slugs changed."""
    tt = toks(target["title"] + " " + (target.get("keyword") or ""))
    scored = []
    for s in arts:
        if s["slug"] in exclude or s["slug"] == target["slug"]:
            continue
        common = len(tt & toks(s.get("title", "") + " " + (s.get("keyword") or "")))
        if common >= 2:
            scored.append((common, s))
    scored.sort(key=lambda x: -x[0])
    changed = []
    for _, s in scored[:6]:
        if len(changed) >= 3:
            break
        src = full_article(site_id, s["slug"])
        if not src or f'href="/{target["slug"]}"' in src["body_html"]:
            continue
        body = src["body_html"]
        m = REL.search(body)
        links = re.findall(r"<a [^>]+>.*?</a>", m.group(1)) if m else []
        if len(links) >= 3:
            continue
        links.append(f'<a href="/{target["slug"]}">{esc(target["title"])}</a>')
        block = f'<!-- ab-rel --><p class="ab-related"><strong>Related:</strong> {" · ".join(links)}</p><!-- /ab-rel -->'
        body = REL.sub("", body)
        f = re.search(r"<h2[^>]*>\s*(Frequently asked questions|FAQs?)\s*</h2>", body, re.I)
        body = body[:f.start()] + block + body[f.start():] if f else body.rstrip() + block
        if APPLY:
            d1_update(src["id"], {"body_html": body})
        changed.append(s["slug"])
    return changed


def main():
    sites = {s["id"]: s for s in store.load_sites()}
    recent = boosted_recently()
    picks = []
    lists = {}
    for sid in SITES:
        arts = d1_query(f"SELECT id, slug, title, keyword, created_at FROM articles WHERE site_id='{sid}' AND status='published';")
        lists[sid] = arts
        dem = demand(sid, arts)
        ranked = sorted(((d["impr"], slug, d) for slug, d in dem.items() if d["impr"] > 0 and f"{sid}/{slug}" not in recent),
                        key=lambda x: -x[0])[:PER_SITE_CAP]
        log(f"[{sid}] {len(arts)} articles, {len(dem)} with search demand → {len(ranked)} candidates")
        picks += [(imp, sid, slug, d) for imp, slug, d in ranked]
    # Best demand first, but no site may take more than its cap.
    picks.sort(key=lambda x: -x[0])
    picks = picks[:N]
    log(f"{len(picks)} articles to strengthen ({'APPLY' if APPLY else 'dry run'})")
    os.makedirs(BACKUP, exist_ok=True)
    try:
        rows = json.load(open(LOG, encoding="utf-8"))
    except Exception:
        rows = []
    pinged: dict = {}
    done = 0
    for imp, sid, slug, d in picks:
        a = full_article(sid, slug)
        if not a:
            continue
        log(f"\n[{sid}] {imp} impr  /{slug}")
        for q, qi, pos in d["queries"][:4]:
            log(f"     q: {q}  ({qi}, pos {pos})")
        b = write_boost(a, d["queries"])
        if not b:
            continue
        log(f"   title: {a.get('meta_title') or a['title']}\n       → {b['meta_title']}")
        log(f"   desc → {b['meta_description']}")
        log(f"   quick → {b['quick_answer']}")
        for f in b["faq"]:
            log(f"   + Q {f['q']}")
        if not APPLY:
            continue
        json.dump({k: a.get(k) for k in ("id", "site_id", "slug", "meta_title", "meta_description", "body_html", "faq", "schema")},
                  open(os.path.join(BACKUP, f"{sid}__{slug}.json"), "w", encoding="utf-8"), ensure_ascii=False)
        d1_update(a["id"], apply_boost(a, b))
        srcs = add_incoming(sid, a, lists[sid], exclude={p[2] for p in picks if p[1] == sid and p[2] != slug} | set())
        log(f"   ✓ updated; incoming links from {len(srcs)}: {', '.join(srcs)}")
        rows.append({"at": NOW.isoformat(), "site": sid, "slug": slug, "impr": imp,
                     "queries": [q for q, _, _ in d["queries"][:6]],
                     "old_title": a.get("meta_title") or a["title"], "new_title": b["meta_title"],
                     "old_desc": a.get("meta_description"), "new_desc": b["meta_description"],
                     "faq_added": len(b["faq"]), "linked_from": srcs})
        dom = sites[sid]["domain"]
        pinged.setdefault(dom, []).extend([f"https://{dom}/{slug}"] + [f"https://{dom}/{s}" for s in srcs])
        done += 1
        time.sleep(1)
    if APPLY:
        json.dump(rows, open(LOG, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        for dom, urls in pinged.items():
            try:
                indexnow.submit_urls(dom, sorted(set(urls)), log=log)
            except Exception as e:
                log(f"IndexNow {dom}: {e}")
    log(f"\n{done} articles strengthened")


if __name__ == "__main__":
    main()
