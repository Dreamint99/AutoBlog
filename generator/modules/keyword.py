"""Keyword research — agent 1 of the pipeline.

Priority:
  1. Semrush (if SEMRUSH_API_KEY set)   ← real search volume / difficulty  [TODO: wire REST]
  2. DeepSeek brainstorm (if key)       ← realistic keyword cluster from the title
  3. Heuristic fallback                 ← derived from the title, always works
"""
from config.settings import SEMRUSH_API_KEY
from modules.llm import have_llm, chat
from modules.json_utils import parse_llm_json


def _fallback(title: str) -> dict:
    base = title.strip().rstrip("?.!").lower()
    return {
        "primary": base,
        "secondary": [f"{base} guide", f"how to {base}", f"{base} 2025", f"best {base}"],
        "intent": "informational",
        "source": "heuristic",
    }


def _llm_keywords(site: dict, title: str) -> dict:
    system = (
        "You are an SEO keyword strategist. Given a blog topic and niche, return a tight "
        "keyword cluster a writer should target. Return ONLY JSON."
    )
    user = (
        f'Niche: {site["niche"]}\n'
        f'Topic / working title: "{title}"\n\n'
        'Return JSON: {"primary": "main keyword (what people actually search)", '
        '"secondary": ["4-7 supporting long-tail keywords"], '
        '"intent": "informational|commercial|transactional|navigational"}'
    )
    data = parse_llm_json(chat(system, user, temperature=0.4, max_tokens=600, json_mode=True))
    return {
        "primary": (data.get("primary") or title).strip(),
        "secondary": data.get("secondary") or [],
        "intent": data.get("intent") or "informational",
        "source": "deepseek",
    }


def research_keywords(site: dict, title: str) -> dict:
    # 1. Semrush — real volume/difficulty. Left as an explicit integration point:
    #    the standalone server would call Semrush's REST API with SEMRUSH_API_KEY here.
    if SEMRUSH_API_KEY:
        # TODO: GET https://api.semrush.com/?type=phrase_this&key=...&phrase=<primary>&database=us
        pass
    # 2. LLM brainstorm
    if have_llm():
        try:
            return _llm_keywords(site, title)
        except Exception:
            pass
    # 3. Always-works fallback
    return _fallback(title)
