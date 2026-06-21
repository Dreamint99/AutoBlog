"""Orchestrator — the 3-agent AI-friendly SEO pipeline for one article.

  title → [Agent1 strategist] → [Agent2 writer] → [Agent3 optimizer]
        → inline images (Pixabay) → internal links → SEO assemble → publish

Falls back to a single mock draft if no DeepSeek key is configured.
`log` is an optional callback(str) for streaming progress to the admin.
"""
import uuid
from datetime import datetime, timezone

from modules import store, seo, indexnow
from modules.agents import strategize, write_draft, optimize
from modules.image import feature_image, embed_inline_images
from modules.internal_links import apply_internal_links
from modules.writer import write_article as _mock_write
from modules.keyword import research_keywords
from modules.competitor import analyze_competitors
from modules.llm import have_llm, chat
from modules.json_utils import parse_llm_json


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _unique_slug(site_id: str, base_slug: str) -> str:
    existing = {a.get("slug") for a in store.list_articles(site_id)}
    if base_slug not in existing:
        return base_slug
    i = 2
    while f"{base_slug}-{i}" in existing:
        i += 1
    return f"{base_slug}-{i}"


def _three_agent(site, title, log):
    log("🧠 Agent 1/3 — SEO strategist (keywords + outline)…")
    strat = strategize(site, title)
    log(f"   🎯 {strat.get('primary_keyword')} · {len(strat.get('outline', []))} sections · {strat.get('search_intent')}")

    log("✍️  Agent 2/3 — expert writer (draft + tables + image slots)…")
    draft = write_draft(site, title, strat)

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

    log("🖼️  Embedding inline images (Pixabay)…")
    body = embed_inline_images(body)

    log("🔗 Adding internal links…")
    siblings = store.list_articles(site["id"])
    cands = [{"slug": a["slug"], "title": a["title"], "keyword": a.get("keyword", "")}
             for a in siblings]
    body = apply_internal_links(body, cands)

    body = seo.assemble_body({
        "body_html": body,
        "key_takeaways": data["key_takeaways"],
        "faq": data["faq"],
    })

    slug = _unique_slug(site["id"], seo.make_slug(final_title, article_id))
    image_url = feature_image(final_title, site, data.get("feature_image_q") or data["keyword"])

    article = {
        "id": article_id,
        "site_id": site["id"],
        "title": final_title,
        "slug": slug,
        "meta_title": data["meta_title"] or seo.meta_title(final_title, site["name"]),
        "meta_description": data["meta_description"] or seo.meta_description(data["excerpt"], body),
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
    titles: list[str] = []
    tries = 0
    while len(titles) < count and tries < (count // 10 + 4):
        tries += 1
        need = min(12, count - len(titles))
        system = ("You are an SEO editor planning a content calendar around keywords people actually "
                  "search on Google.\n\n" + SEO_PLAYBOOK + "\n\nReturn ONLY a JSON array of strings.")
        recent = "; ".join(list(avoid_set)[-40:])
        user = (f'Niche: {site["niche"]}\nAudience: {site["audience"]}\n'
                + (f'Focus area / seed keyword: {seed}\n' if seed else "")
                + (f'HIGH-PRIORITY trending Bangladesh search terms (Google Trends) — prefer topics around '
                   f'these where they fit the niche: {", ".join(hot)}\n' if hot else "")
                + f'Give {need} NEW, unique, specific, search-driven blog titles targeting real Google '
                  'keywords with first-page potential. Make them clickable and shareable (viral-leaning) '
                  'but accurate — no clickbait that misleads. Cover DIFFERENT subtopics/keywords each.\n'
                + (f'Do NOT repeat or rephrase any of these: {recent}\n' if recent else '')
                + 'JSON array of strings only.')
        try:
            data = parse_llm_json(chat(system, user, temperature=1.0, max_tokens=1500))
            if isinstance(data, dict):
                data = data.get("titles") or list(data.values())
            for t in data:
                t = str(t).strip()
                k = t.lower()
                if t and k not in avoid_set:
                    avoid_set.add(k)
                    titles.append(t)
        except Exception:
            break
    return titles[:count]
