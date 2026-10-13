"""Research agent — runs BEFORE writing so every article is grounded, not generic.

Produces a compact research brief: the concrete facts/stats/entities a great
article on this topic MUST cover, the real questions people also ask (PAA), the
authoritative sources to cite, and the current-year data points. Best-effort web
snippets (DuckDuckGo) are folded in when reachable; if the web is unreachable it
degrades gracefully to a model-knowledge brief so the headless drip never breaks.
"""
import re

import requests

from modules.llm import chat
from modules.json_utils import parse_llm_json
from modules.agents import time_context

_TAG = re.compile(r"<[^>]+>")


def _web_snippets(query: str, n: int = 5) -> list[str]:
    """Best-effort real-web context via DuckDuckGo HTML. Never raises."""
    try:
        r = requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            timeout=12,
        )
        if r.status_code != 200:
            return []
        # snippet text lives in result__snippet blocks
        raw = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', r.text, re.S)
        out = []
        for s in raw[:n]:
            t = _TAG.sub(" ", s)
            t = re.sub(r"\s+", " ", t).strip()
            if len(t) > 40:
                out.append(t)
        return out
    except Exception:
        return []


def research_topic(site: dict, title: str, log=lambda m: None) -> str:
    """Return a plain-text research brief to inject into the strategist + writer."""
    log("🔎 Agent 0 — research (grounding facts, stats, PAA, sources)…")
    # DuckDuckGo now answers bots with a captcha, so this used to come back empty and the brief
    # was written from model memory. modules/websearch tries Google CSE / Brave / DDG + Wikipedia.
    from modules import websearch
    hits = websearch.serp(title, 6)
    bangla = "bengali" in (site.get("language") or "").lower()
    facts = websearch.wiki(title, 2, lang="bn" if bangla else "en") + (websearch.wiki(title, 2) if bangla else [])
    snippets = [f"{h['title']} — {h['snippet']} ({h['url']})" for h in hits if h.get("snippet")]
    snippets += [f"Wikipedia: {f['title']} — {f['snippet']} ({f['url']})" for f in facts]
    searches = websearch.suggest(title, "bn" if bangla else "en")
    web_ctx = ""
    if searches:
        web_ctx += ("REAL GOOGLE SEARCHES on this topic (Google autocomplete — what people actually type). Answer the "
                    "relevant ones as H2s/FAQ and use their wording:\n" + "\n".join(f"- {s}" for s in searches) + "\n\n")
    rivals = websearch.competitors(hits, site.get("domain", ""))
    if rivals:
        web_ctx += ("COMPETITORS RANKING NOW (their headings + length). Cover every subtopic they cover, then beat them: "
                    "fresher figures, a clearer table, the questions they skip. Never copy their wording:\n"
                    + "\n".join(f"- {r['url']} ({r['words']} words): " + " | ".join(r["headings"][:15]) for r in rivals) + "\n\n")
    if snippets:
        web_ctx += ("REAL WEB SOURCES (current top results + Wikipedia). Use them for facts/figures, rewrite in your own words, "
                   "prefer the most recent figure and say 'as of <month year>' for anything that changes (fees, laws, counts):\n"
                   + "\n".join(f"- {s}" for s in snippets) + "\n\n")
    log(f"   web grounding: {len(hits)} {websearch.source_name()} results, {len(facts)} Wikipedia pages, {len(searches)} Google searches, {len(rivals)} competitors read")

    system = (
        time_context() + "\n\n"
        "You are a meticulous research editor. Before an article is written you gather the "
        "concrete substance it must contain so it is genuinely more useful and accurate than "
        "competing pages. Prefer real, checkable facts and current-year figures. When a number is "
        "an estimate, label it. Return ONLY JSON."
    )
    user = (
        f"Topic / working title: \"{title}\"\n"
        f"Niche: {site.get('niche','')}\nAudience: {site.get('audience','')}\n\n"
        + web_ctx +
        "Produce a research brief. Return JSON:\n"
        "{\n"
        '  "key_facts": ["8-12 specific, current facts/figures/dates the article must include (with rough numbers)"],\n'
        '  "entities": ["key people, companies, places, products, standards to name"],\n'
        '  "paa_questions": ["6-8 real \'people also ask\' questions to answer"],\n'
        '  "data_points": ["3-6 concrete stats worth putting in a comparison table"],\n'
        '  "sources": ["3-5 authoritative source names/domains to cite (e.g. official bodies, well-known publications)"],\n'
        '  "angle": "the single differentiator that would make this article the best result",\n'
        '  "freshness": "what is NEW/changed on this topic in the current year"\n'
        "}"
    )
    try:
        brief = parse_llm_json(chat(system, user, temperature=0.4, max_tokens=2000, json_mode=True))
    except Exception as e:
        log(f"   research brief failed ({e}); writing from model knowledge")
        return ""

    def _list(k):
        return "\n".join(f"  - {x}" for x in (brief.get(k) or []) if str(x).strip())

    parts = [
        "RESEARCH BRIEF (ground the article in these — do not invent contradicting facts):",
        f"Angle: {brief.get('angle','')}",
        f"What's new this year: {brief.get('freshness','')}",
        "Key facts to cover:\n" + _list("key_facts"),
        "Entities to name:\n" + _list("entities"),
        "Questions to answer (use as H2s / FAQ):\n" + _list("paa_questions"),
        "Stats for a comparison table:\n" + _list("data_points"),
        "Authoritative sources to cite:\n" + _list("sources"),
    ]
    if snippets:
        parts.append(f"(Grounded with {len(snippets)} live web snippets.)")
    brief_txt = "\n".join(p for p in parts if p.strip())
    log(f"   ✓ brief: {len(brief.get('key_facts') or [])} facts, "
        f"{len(brief.get('paa_questions') or [])} questions"
        + (f", {len(snippets)} web snippets" if snippets else ", model-knowledge"))
    return brief_txt
