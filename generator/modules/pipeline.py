"""Orchestrator — the 3-agent AI-friendly SEO pipeline for one article.

  title → [Agent1 strategist] → [Agent2 writer] → [Agent3 optimizer]
        → inline images (Pixabay) → internal links → SEO assemble → publish

Falls back to a single mock draft if no DeepSeek key is configured.
`log` is an optional callback(str) for streaming progress to the admin.
"""
import re
import uuid
from datetime import datetime, timezone

SEO_TARGET = 95   # quality-loop pushes each article's on-page score to this or higher
MIN_PUBLISH_WORDS = 900  # never publish a thin/truncated article below this


def _related_sibling(text: str, cands: list) -> dict | None:
    """Pick the sibling article sharing the most meaningful words with `text` — used
    to guarantee at least one genuinely-related internal link so no post is orphaned."""
    stop = {"the", "a", "an", "of", "in", "on", "for", "and", "or", "to", "by", "with",
            "2026", "2025", "best", "top", "guide", "how", "what", "your"}
    words = {w for w in re.findall(r"[a-z0-9]+", (text or "").lower()) if len(w) > 3 and w not in stop}
    best, best_score = None, 0
    for c in cands:
        cw = set(re.findall(r"[a-z0-9]+", f"{c.get('keyword','')} {c.get('title','')}".lower()))
        score = len(words & cw)
        if score > best_score:
            best, best_score = c, score
    return best if best_score >= 1 else None


def _seo_nudge(body_html: str, keyword: str) -> str:
    """Cheap, safe deterministic SEO wins: make sure at least one inline image's
    alt text mentions the focus keyword (helps the kw-in-alt check) without an LLM."""
    if not keyword or "<img" not in body_html.lower():
        return body_html
    if re.search(r'alt="[^"]*' + re.escape(keyword) + r'[^"]*"', body_html, re.I):
        return body_html

    def _fix(m):
        tag = m.group(0)
        if re.search(r'\balt="', tag, re.I):
            return re.sub(r'alt="([^"]*)"', lambda a: f'alt="{a.group(1)} — {keyword}"'.replace(' — "', '"'), tag, count=1, flags=re.I)
        return tag[:-1] + f' alt="{keyword}">' if tag.endswith(">") else tag
    return re.sub(r"<img[^>]*>", _fix, body_html, count=1, flags=re.I)

from modules import store, seo, indexnow, seo_score
from modules.agents import strategize, write_draft, optimize, boost, time_context
from modules.research import research_topic
from modules.image import feature_image, embed_inline_images
from modules.internal_links import apply_internal_links
from modules.writer import write_article as _mock_write
from modules.keyword import research_keywords
from modules.competitor import analyze_competitors
from modules.llm import have_llm, chat
from modules.json_utils import parse_llm_json


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# Arabic + every Indic script (Devanagari … Sinhala, incl. Bengali and Tamil).
_NON_LATIN = re.compile(r"[؀-ۿऀ-෿]")
_MONTHS = ("january february march april may june july august september october "
           "november december").split()


def _wrong_script(site: dict, *texts: str) -> bool:
    """True when an English site's text contains Bengali/Tamil/Hindi/Arabic script —
    smaller fallback models sometimes drift into the audience's language."""
    lang = (site.get("language") or "").lower()
    if not (lang.startswith("en") or lang.startswith("english")):
        return False
    return any(_NON_LATIN.search(t or "") for t in texts)


def _stale_today(title: str) -> bool:
    """'Matches today July 12' published in October — a dated 'today' title whose month
    isn't the current one is stale on arrival (and misleads readers)."""
    t = (title or "").lower()
    if "today" not in t and "tonight" not in t:
        return False
    now = _MONTHS[datetime.now(timezone.utc).month - 1]
    return any(m in t for m in _MONTHS if m != now)


def _cap_first(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s


def _unique_slug(site_id: str, base_slug: str) -> str:
    existing = {a.get("slug") for a in store.list_articles(site_id)}
    if base_slug not in existing:
        return base_slug
    i = 2
    while f"{base_slug}-{i}" in existing:
        i += 1
    return f"{base_slug}-{i}"


def _three_agent(site, title, log):
    brief = research_topic(site, title, log)

    log("🧠 Agent 1 — SEO strategist (keywords + outline)…")
    strat = strategize(site, title, research=brief)
    log(f"   🎯 {strat.get('primary_keyword')} · {len(strat.get('outline', []))} sections · {strat.get('search_intent')}")

    log("✍️  Agent 2 — expert writer (draft + tables + image slots)…")
    draft = write_draft(site, title, strat, research=brief)

    log("🔧 Agent 3/3 — SEO optimizer (helpful-content + AI-Overview polish)…")
    try:
        final = optimize(site, title, strat, draft)
    except Exception as e:
        log(f"   optimizer skipped ({e}); using draft")
        final = {}

    pick = lambda k, d="": final.get(k) or draft.get(k) or d
    return {
        "title": pick("title", title),
        "excerpt": pick("excerpt"),
        "meta_title": final.get("meta_title", ""),
        "meta_description": final.get("meta_description", ""),
        "body_html": pick("body_html"),
        "tags": pick("tags", []),
        "faq": pick("faq", []),
        "key_takeaways": pick("key_takeaways", []),
        "keyword": strat.get("primary_keyword", title),
        "secondary": strat.get("secondary_keywords", []),
        "feature_image_q": strat.get("feature_image_en", ""),
    }


def _mock_path(site, title, log):
    log("✍️  Writing (mock — no DeepSeek key)…")
    kw = research_keywords(site, title)
    comp = analyze_competitors(site, kw["primary"], site.get("default_word_count", 1500))
    w = _mock_write(site, title, kw, comp)
    return {
        "title": w.get("title", title), "excerpt": w.get("excerpt", ""),
        "meta_title": "", "meta_description": "", "body_html": w.get("body_html", ""),
        "tags": w.get("tags", []), "faq": w.get("faq", []),
        "key_takeaways": w.get("key_takeaways", []),
        "keyword": kw["primary"], "secondary": kw.get("secondary", []),
        "mock": True,
    }


def generate_article(site: dict, title: str, log=lambda m: None) -> dict:
    article_id = uuid.uuid4().hex[:12]

    if have_llm():
        try:
            data = _three_agent(site, title, log)
        except Exception as e:
            log(f"⚠️  3-agent failed ({e}); falling back to mock")
            data = _mock_path(site, title, log)
    else:
        data = _mock_path(site, title, log)

    final_title = data["title"]
    body = data["body_html"]

    log("🖼️  Embedding inline images…")
    body = embed_inline_images(body)

    log("🔗 Adding internal links…")
    siblings = store.list_articles(site["id"])
    cands = [{"slug": a["slug"], "title": a["title"], "keyword": a.get("keyword", "")}
             for a in siblings]
    body = apply_internal_links(body, cands)
    # Guarantee at least one internal link (avoids an orphan page + satisfies the
    # internal-link SEO check) when keyword auto-linking found no match in the body.
    if not re.search(r'<a[^>]+href="/', body):
        rel = _related_sibling(f"{data['keyword']} {final_title}", cands)
        if rel:
            body += (f'<p class="related-read"><strong>Related:</strong> '
                     f'<a href="/{rel["slug"]}">{rel["title"]}</a></p>')

    # ── Agent 4 — quality / SEO-score loop (push on-page score to 95+) ──
    slug = _unique_slug(site["id"], seo.make_slug(final_title, article_id))
    keyword = data["keyword"]
    meta_title = data["meta_title"] or seo.meta_title(final_title, site["name"])
    meta_description = data["meta_description"] or seo.meta_description(data["excerpt"], body)
    body = _seo_nudge(body, keyword)

    wa = {"title": final_title, "keyword": keyword, "body_html": body, "slug": slug,
          "meta_title": meta_title, "meta_description": meta_description,
          "excerpt": data["excerpt"], "faq": data["faq"]}
    res = seo_score.evaluate(wa)
    log(f"📊 SEO score {res['score']}/100 ({res['words']}w · kw {res['density']}%)")
    tries = 0
    while res["score"] < SEO_TARGET and tries < 2 and have_llm():
        tries += 1
        miss = ", ".join(cid for cid, _ in res["failed"][:6])
        log(f"🚀 Agent 4 — boosting to {SEO_TARGET}+ (try {tries}) — fixing: {miss}")
        try:
            b = boost(site, wa, res["failed"], SEO_TARGET)
        except Exception as e:
            log(f"   boost skipped ({e})")
            break
        nb = _seo_nudge(b.get("body_html") or wa["body_html"], keyword)
        cand = {"title": (b.get("title") or wa["title"])[:70], "keyword": keyword,
                "body_html": nb, "slug": slug,
                "meta_title": b.get("meta_title") or wa["meta_title"],
                "meta_description": b.get("meta_description") or wa["meta_description"],
                "excerpt": b.get("excerpt") or wa["excerpt"],
                "faq": b.get("faq") or wa["faq"]}
        cres = seo_score.evaluate(cand)
        if _wrong_script(site, cand["title"], cand["meta_title"], cand["body_html"]):
            log("   boost drifted out of the site language — keeping previous version")
        elif cres["score"] >= res["score"] and cres["words"] >= 800:
            wa, res = cand, cres
            data["faq"] = cand["faq"]
            data["key_takeaways"] = b.get("key_takeaways") or data["key_takeaways"]
            data["tags"] = b.get("tags") or data["tags"]
        log(f"   → {res['score']}/100")

    log(f"📊 Final SEO score {res['score']}/100 ({res['words']}w)")
    # Hard quality floor: never publish a thin/truncated draft (v4 can occasionally
    # return a stub). Raising here makes the drip skip + log it instead of shipping junk.
    if res["words"] < MIN_PUBLISH_WORDS:
        raise ValueError(f"article too thin ({res['words']}w < {MIN_PUBLISH_WORDS}) — skipping")
    if _wrong_script(site, wa["title"], wa["meta_title"], wa["body_html"]):
        raise ValueError("article contains non-English script on an English site — skipping")
    if _stale_today(wa["title"]):
        raise ValueError(f"stale dated 'today' title ({wa['title']}) — skipping")

    wa["title"] = _cap_first(wa["title"])
    wa["meta_title"] = _cap_first(wa["meta_title"])
    final_title = wa["title"]
    keyword = wa["keyword"]
    meta_title, meta_description = wa["meta_title"], wa["meta_description"]
    data["excerpt"] = wa["excerpt"]

    body = seo.assemble_body({
        "body_html": wa["body_html"],
        "key_takeaways": data["key_takeaways"],
        "faq": data["faq"],
    })

    image_url = feature_image(final_title, site, data.get("feature_image_q") or keyword)

    article = {
        "id": article_id,
        "site_id": site["id"],
        "title": final_title,
        "slug": slug,
        "meta_title": meta_title,
        "meta_description": meta_description,
        "excerpt": data["excerpt"],
        "body_html": body,
        "tags": data["tags"],
        "faq": data["faq"],
        "keyword": data["keyword"],
        "secondary_keywords": data["secondary"],
        "image_url": image_url,
        "word_count": seo.word_count(body),
        "reading_time": seo.reading_time(body),
        "status": "published",
        "is_mock": bool(data.get("mock")),
        "created_at": _now(),
    }
    article["schema"] = seo.json_ld(article, site)
    if site.get("publish_target") == "wordpress":
        # WordPress re-sources real photos at publish time (modules/photos.py); give it the English query.
        article["image_query"] = data.get("feature_image_q") or ""

    store.add_article(article)
    log(f"✅ Published: {final_title} ({article['word_count']} words)")

    # IndexNow: instant Bing + Yandex notification (no-op for unconnected domains)
    try:
        indexnow.submit_article(site, article, log)
    except Exception as e:
        log(f"IndexNow skipped: {e}")

    return article


def suggest_titles(site: dict, count: int = 10, seed: str = "", avoid: list | None = None) -> list:
    """AI keyword ideas (Google-style) → clickable, viral-leaning SEO titles.
    Batches + dedupes for large counts so all titles are unique. Mock-templated without a key."""
    avoid_set = set((a or "").lower() for a in (avoid or []))
    if not have_llm():
        base = seed or site["niche"].split(",")[0]
        return [f"{base}: complete guide ({i + 1})" for i in range(count)]

    from modules.seo_playbook import SEO_PLAYBOOK
    # Best-effort: real trending Bangladesh search terms to bias topic selection.
    try:
        from modules.trends import hot_keywords
        hot = hot_keywords(site) if not seed else []
    except Exception:
        hot = []
    # Trends are pulled with hl=bn-BD; Bengali terms pull English sites' titles (and then
    # the whole article) into Bengali, so only keep terms in the site's own script.
    hot = [h for h in hot if not _wrong_script(site, h)]
    titles: list[str] = []
    tries = 0
    empty_streak = 0
    while len(titles) < count and tries < (count // 5 + 6):
        tries += 1
        need = min(12, count - len(titles))
        system = (time_context() + "\n\n"
                  "You are an SEO editor planning a content calendar around keywords people actually "
                  "search on Google.\n\n" + SEO_PLAYBOOK + '\n\nReturn ONLY a JSON object: {"titles": ["..."]}.')
        recent = "; ".join(list(avoid_set)[-40:])
        user = (f'Niche: {site["niche"]}\nAudience: {site["audience"]}\n'
                + f'Language: {site["language"]} — write EVERY title in this language, not the audience\'s native tongue.\n'
                + (f'Focus area / seed keyword: {seed}\n' if seed else "")
                + (f'HIGH-PRIORITY trending Bangladesh search terms (Google Trends) — prefer topics around '
                   f'these where they fit the niche: {", ".join(hot)}\n' if hot else "")
                + f'Give {need} NEW, unique, specific, search-driven blog titles targeting real Google '
                  'keywords with first-page potential. Make them clickable and shareable (viral-leaning) '
                  'but accurate — no clickbait that misleads. Cover DIFFERENT subtopics/keywords each.\n'
                + (f'Do NOT repeat or rephrase any of these: {recent}\n' if recent else '')
                + 'JSON array of strings only.')
        try:
            data = parse_llm_json(chat(system, user, temperature=1.0, max_tokens=1500, json_mode=True))
            if isinstance(data, dict):
                data = data.get("titles") or next((v for v in data.values() if isinstance(v, list)), [])
            added = 0
            for t in data:
                t = str(t).strip()
                k = t.lower()
                if t and k not in avoid_set:
                    avoid_set.add(k)
                    titles.append(t)
                    added += 1
            empty_streak = empty_streak + 1 if added == 0 else 0
            if empty_streak >= 3:  # model stuck returning dupes/empties — stop wasting calls
                break
        except Exception as e:
            # Retry within the tries budget instead of aborting the whole run — v4-flash
            # is occasionally flaky (empty / non-JSON). Only give up after the budget.
            print(f"WARN suggest_titles retry ({e})", flush=True)
            empty_streak += 1
            if empty_streak >= 4:
                break
    return titles[:count]
