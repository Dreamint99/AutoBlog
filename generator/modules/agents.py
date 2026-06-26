"""The 3-agent AI-friendly SEO writing pipeline (the key feature).

  Agent 1  SEO Strategist  → keyword cluster (Google intent) + GEO-aware outline
  Agent 2  Expert Writer   → full semantic-HTML draft with tables + inline-image slots
  Agent 3  SEO Optimizer   → helpful-content / E-E-A-T / AI-Overview polish + meta

Every agent is "trained" on modules/seo_playbook.SEO_PLAYBOOK so output follows
current Google ranking + AI-answer-engine (GEO/AEO) best practice.
Inline images are marked in the body as `[[IMG: <keyword>]]` and resolved later.
"""
from datetime import datetime, timezone

from modules.llm import chat
from modules.json_utils import parse_llm_json
from modules.seo_playbook import SEO_PLAYBOOK


def time_context() -> str:
    """Dynamic 'today' line injected into every agent so articles always use the
    CURRENT year + latest framing, instead of the model defaulting to an old year."""
    now = datetime.now(timezone.utc)
    today = now.strftime("%B %Y")          # e.g. "June 2026"
    year = now.year
    return (
        f"CURRENT DATE: today is {today}. Write for the CURRENT year ({year}). "
        f"Use {year} (NOT an older year like 2025) in titles, headings and content wherever a year "
        f"is relevant, and present information as the latest available, stated 'as of {today}'. "
        "Keep following the honesty rules: estimate when unsure, cite official sources, and note that "
        "figures/rules change over time."
    )


# ── Agent 1: SEO Strategist ──────────────────────────────
def strategize(site: dict, topic: str) -> dict:
    system = (
        time_context() + "\n\n"
        "You are a senior SEO content strategist. You plan articles that rank #1 on Google "
        "AND get cited by AI answer engines (Google AI Overviews, ChatGPT, Perplexity).\n\n"
        + SEO_PLAYBOOK + "\n\nReturn ONLY JSON."
    )
    user = (
        f"Site: {site['name']} — niche: {site['niche']}\nAudience: {site['audience']}\n"
        f"Language: {site['language']}\n"
        f"Topic / working title: \"{topic}\"\n\n"
        "Plan the article. Return JSON:\n"
        "{\n"
        '  "primary_keyword": "the ONE focus keyword people search — MUST be SHORT (2-4 words max), in the SAME language as the Language above (do NOT translate it into the audience\'s native language); NOT the full title, no year unless essential",\n'
        '  "secondary_keywords": ["6-10 long-tail + semantic keywords/entities to include"],\n'
        '  "search_intent": "informational|commercial|transactional",\n'
        '  "target_word_count": integer (>=1500 to beat the top results),\n'
        '  "angle": "the differentiator that earns #1",\n'
        '  "quick_answer": "a 2-3 sentence direct answer to put at the very top (AI-Overview bait)",\n'
        '  "feature_image_en": "an ENGLISH stock-photo search query for the hero image (concrete subject, no text)",\n'
        '  "outline": [{"heading": "H2 as a real question/subtopic", "key_points": ["3-5 points to cover"], "image_keyword": "a concrete photo subject in ENGLISH for this section (or empty)"}]\n'
        "}"
    )
    return parse_llm_json(chat(system, user, temperature=0.5, max_tokens=2000, json_mode=True))


# ── Agent 2: Expert Writer ───────────────────────────────
def write_draft(site: dict, topic: str, strategy: dict) -> dict:
    system = (
        time_context() + "\n\n"
        "You are an elite subject-matter expert writer. You write genuinely useful, original, "
        "people-first articles in clean semantic HTML.\n\n" + SEO_PLAYBOOK + "\n\n"
        "LANGUAGE (critical): write the ENTIRE article — title, headings, body, tables, FAQ and key "
        "takeaways — in the language given in the 'Language:' field below, REGARDLESS of the audience's "
        "nationality or which country the topic is about. If Language says English, write 100% in English "
        "even for a Bangladeshi/South-Asian audience. Never switch or code-switch to another language.\n"
        "HTML rules: body only. Allowed: <h2> <h3> <p> <ul> <ol> <li> <strong> <em> <blockquote> "
        "<table> <thead> <tbody> <tr> <th> <td> <a>. NO <h1>, NO markdown, NO page wrappers.\n"
        "Start with a 2-3 sentence direct 'quick answer'. Cover every outline heading. "
        "Include at least one real data/comparison <table>.\n"
        "RANK MATH 90+ (mandatory): use the EXACT focus keyword in (a) the first sentence, (b) at least "
        "one H2/H3 heading, and naturally through the body (~once per 100 words, no stuffing). Include at "
        "least ONE outbound dofollow link to an authoritative external source as <a href=\"https://...\">. "
        "The title must START with the focus keyword and also contain a number and a power word.\n"
        "For 2-4 sections add an inline image on its own line as [[IMG: <concrete photo subject IN ENGLISH>]] "
        "— image queries must be English even though the article is not.\n"
        "LENGTH: write a COMPREHENSIVE article of at least 1500 words. Develop every section fully with "
        "concrete details, real numbers, examples and steps. Do NOT stop early or summarise sections. "
        "Return ONLY JSON."
    )
    outline_txt = "\n".join(
        f"- {o.get('heading','')}: {', '.join(o.get('key_points', []))}"
        + (f"  (image: {o.get('image_keyword')})" if o.get("image_keyword") else "")
        for o in strategy.get("outline", [])
    )
    user = (
        f"Site: {site['name']} — {site['niche']}\nTone: {site['tone']}\n"
        f"Language: {site['language']}\nTopic: \"{topic}\"\n\n"
        f"Primary keyword: {strategy.get('primary_keyword')}\n"
        f"Secondary keywords: {', '.join(strategy.get('secondary_keywords', []))}\n"
        f"Search intent: {strategy.get('search_intent')}\n"
        f"Target length: ~{strategy.get('target_word_count', site.get('default_word_count', 1500))} words\n"
        f"Angle: {strategy.get('angle','')}\n"
        f"Quick answer to open with: {strategy.get('quick_answer','')}\n\n"
        f"Outline:\n{outline_txt}\n\n"
        "Return JSON:\n"
        '{"title": "SEO title <=60 chars with primary keyword", '
        '"excerpt": "<=155 char summary", '
        '"body_html": "the full article with [[IMG: ...]] inline-image markers", '
        '"tags": ["5-8 tags"], '
        '"faq": [{"q":"...","a":"..."}], '
        '"key_takeaways": ["3-5 bullets"]}'
    )
    return parse_llm_json(chat(system, user, temperature=0.7, max_tokens=8000, json_mode=True))


# ── Agent 3: SEO Optimizer / Editor ──────────────────────
def optimize(site: dict, topic: str, strategy: dict, draft: dict) -> dict:
    system = (
        time_context() + "\n\n"
        "You are a meticulous SEO editor. You upgrade a draft to maximise Google ranking and "
        "AI-Overview citation without changing the facts.\n\n" + SEO_PLAYBOOK + "\n\n"
        "LANGUAGE: keep the article in the EXACT same language as the draft you receive — never translate "
        "it into another language.\n"
        "Keep the same HTML rules and KEEP the [[IMG: ...]] markers, the external dofollow link, and "
        "tables. Ensure a direct quick-answer opener, strong scannable structure, and tighten weak/fluffy "
        "sentences (a key-takeaways box is added later — don't add one).\n"
        "RANK MATH 90+: the focus keyword must appear in the first sentence, in at least one H2/H3, and "
        "naturally in the body. meta_title MUST start with the focus keyword and include a number + a power "
        "word (<=60 chars). meta_description MUST contain the focus keyword once (<=155 chars). "
        "Return ONLY JSON."
    )
    user = (
        f"Topic: \"{topic}\"\nPrimary keyword: {strategy.get('primary_keyword')}\n"
        f"Secondary: {', '.join(strategy.get('secondary_keywords', []))}\n\n"
        f"DRAFT TITLE: {draft.get('title')}\n"
        f"DRAFT BODY HTML:\n{draft.get('body_html','')}\n\n"
        "Improve it. Return JSON:\n"
        '{"title": "final SEO title <=60 chars", '
        '"meta_title": "<=60 chars", '
        '"meta_description": "compelling <=155 chars with primary keyword", '
        '"excerpt": "<=155 chars", '
        '"body_html": "the improved article, keeping [[IMG: ...]] markers and tables", '
        '"tags": ["5-8 tags"], '
        '"faq": [{"q":"...","a":"..."}], '
        '"key_takeaways": ["3-5 bullets"], '
        '"internal_link_keywords": ["2-5 phrases in the body that should link to related articles"]}'
    )
    return parse_llm_json(chat(system, user, temperature=0.5, max_tokens=8000, json_mode=True))
