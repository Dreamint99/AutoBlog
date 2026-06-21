"""One-off batch: generate 30 LONG InfKey articles via the DeepSeek 3-agent pipeline.

InfKey niche = AI cost / API pricing / model comparison / automation intelligence.
Titles are hand-picked around real search-driven keyword clusters (calculators,
comparisons, use-cases, cost-optimization). Each is forced to a ~2000-word floor
("long") by bumping Agent-1's target_word_count.

Sequential + resumable: skips titles that already exist for the site.
Writes straight to Supabase (status=published). Progress → output/gen_infkey.log.

Usage:  python gen_infkey.py
"""
import sys
import os
import re
import time
from datetime import datetime

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store
import modules.pipeline as P

WORD_FLOOR = 2000  # "long"
SITE_ID = "infkey"
_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "gen_infkey.log")

TITLES = [
    # ── cost / calculators ──
    "How Much Does the OpenAI API Cost? Real 2026 Pricing Breakdown",
    "How Much Does an AI Chatbot Cost Per Month? The Real API Math",
    "How Much Does AI Video Generation Cost in 2026?",
    "How Much Does a 1-Minute AI Video Cost to Generate?",
    "LLM API Pricing Explained: Tokens, Costs and How to Estimate Yours",
    "How to Calculate AI API Cost Before You Build",
    "RAG Cost Calculator: What Retrieval-Augmented Generation Really Costs",
    "Embedding API Cost: How to Estimate Your Vector Search Spend",
    "AI Agent Cost: What It Really Costs to Run an LLM Agent",
    # ── comparisons ──
    "OpenAI vs Claude vs Gemini API Pricing: Which Is Cheapest in 2026?",
    "DeepSeek vs OpenAI API Cost: Is DeepSeek Really Cheaper?",
    "GPT-4o vs Claude 3.5 Sonnet: Price, Quality and When to Use Each",
    "Gemini 1.5 Flash vs GPT-4o mini: The Cheapest LLM API Compared",
    "Veo vs Kling: AI Video Price, Quality and Audio Compared",
    "Veo vs Sora: Which AI Video API Is Worth the Cost?",
    "Fal.ai vs Replicate: Pricing and Speed for Hosting AI Models",
    "OpenRouter vs Direct API: Does Routing Actually Save Money?",
    "Cheapest AI Video API in 2026: A Full Price Comparison",
    "Cheapest LLM API for High-Volume Apps",
    # ── use-cases ──
    "Best LLM for a Customer Support Chatbot, by Cost and Quality",
    "Best AI API for Bangla: Chat, Voice and Translation",
    "Best Model for PDF and Invoice Data Extraction",
    "Best LLM for RAG: Quality vs Cost Tradeoffs",
    "Best Model for AI Agents and Function Calling",
    "Cheapest Model for Summarization at Scale",
    "Best Long-Context LLM API for Large Documents",
    # ── cost optimization ──
    "How to Reduce Your OpenAI API Bill: 9 Proven Tactics",
    "How to Cut LLM Token Usage Without Hurting Quality",
    "Prompt Caching Explained: How Much It Actually Cuts API Cost",
    "Self-Hosted LLM vs API: Which Is Actually Cheaper?",
]


def log(msg: str):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    print(line, flush=True)
    try:
        with open(_LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


# ── force "long" ──────────────────────────────────────────────────────
# DeepSeek often under-writes vs the target, so we (1) floor Agent-1's
# target_word_count and (2) run an explicit expand pass on any draft/edit
# that lands under the floor. Reuses the real agents + llm.chat.

def _wc(html: str) -> int:
    return len(re.sub(r"<[^>]+>", " ", html or "").split())


def _expand(topic: str, body: str, floor: int) -> str:
    system = (
        "You are an expert writer making an article more thorough and genuinely useful. "
        "Body HTML only; allowed tags: <h2> <h3> <p> <ul> <ol> <li> <strong> <em> <blockquote> "
        "<table> <thead> <tbody> <tr> <th> <td> <a>. KEEP every existing [[IMG: ...]] marker and "
        "every <table>; do not delete sections. Add real depth: worked cost examples, an extra "
        "comparison table where useful, edge cases, and a richer FAQ. No padding, no repetition. "
        "Return ONLY JSON {\"body_html\": \"...\"}."
    )
    user = (
        f"Topic: \"{topic}\"\nThe body is ~{_wc(body)} words; expand it to AT LEAST {floor} words "
        f"of substantive, accurate content.\n\nBODY HTML:\n{body}\n\nReturn JSON with the full expanded body_html."
    )
    try:
        data = P.parse_llm_json(P.chat(system, user, temperature=0.6, max_tokens=8000, json_mode=True))
        new = (data or {}).get("body_html", "")
        return new if _wc(new) > _wc(body) else body
    except Exception:
        return body


def _to_floor(topic: str, body: str, floor: int, tries: int = 2) -> str:
    for _ in range(tries):
        if _wc(body) >= floor:
            break
        body = _expand(topic, body, floor)
    return body


_orig_strategize = P.strategize
_orig_write = P.write_draft
_orig_optimize = P.optimize


def _long_strategize(site, topic):
    strat = _orig_strategize(site, topic)
    try:
        cur = int(strat.get("target_word_count") or 0)
    except Exception:
        cur = 0
    strat["target_word_count"] = max(cur, WORD_FLOOR)
    return strat


def _long_write(site, topic, strategy):
    draft = _orig_write(site, topic, strategy)
    if isinstance(draft, dict):
        draft["body_html"] = _to_floor(topic, draft.get("body_html", ""), WORD_FLOOR)
    return draft


def _long_optimize(site, topic, strategy, draft):
    final = _orig_optimize(site, topic, strategy, draft)
    if isinstance(final, dict) and final.get("body_html"):
        final["body_html"] = _to_floor(topic, final["body_html"], WORD_FLOOR)
    return final


P.strategize = _long_strategize
P.write_draft = _long_write
P.optimize = _long_optimize


_DONE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "gen_infkey_done.txt")


def _load_done() -> set:
    try:
        with open(_DONE_FILE, "r", encoding="utf-8") as f:
            return {ln.strip().lower() for ln in f if ln.strip()}
    except Exception:
        return set()


def _mark_done(title: str):
    try:
        with open(_DONE_FILE, "a", encoding="utf-8") as f:
            f.write(title + "\n")
    except Exception:
        pass


def main():
    sites = [s for s in store.load_sites() if s["id"] == SITE_ID]
    if not sites:
        log(f"unknown site '{SITE_ID}' — is it in sites_config.json?")
        return
    site = dict(sites[0])
    site["default_word_count"] = max(site.get("default_word_count", 1500), WORD_FLOOR)

    # Dedup on SOURCE titles (the pipeline rewrites article titles, so store
    # titles can't be matched back). A local done-file makes reruns resumable.
    done_set = _load_done()
    todo = [t for t in TITLES if t.strip().lower() not in done_set]
    have = len(store.list_articles(SITE_ID))

    log(f"=== InfKey batch: {len(todo)}/{len(TITLES)} to write (site has {have}) · floor={WORD_FLOOR}w ===")
    done = 0
    for i, title in enumerate(todo, 1):
        t0 = time.time()
        try:
            art = P.generate_article(site, title)
            _mark_done(title)
            done += 1
            log(f"[{i}/{len(todo)}] ✅ {art['title']} — {art['word_count']}w in {time.time()-t0:.0f}s")
        except Exception as e:
            log(f"[{i}/{len(todo)}] ❌ {title} — {type(e).__name__}: {e}")
        time.sleep(2)  # be gentle on the APIs
    log(f"=== batch complete: +{done}/{len(todo)} published → infkey total {have + done} ===")


if __name__ == "__main__":
    main()
