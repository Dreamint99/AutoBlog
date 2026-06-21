"""Competitor / SERP analysis — agent 2 of the pipeline.

Produces the brief the writer must beat: target length, sub-topics that the
top-ranking pages cover, and the angle that makes our article better.

Real SERP scraping needs a search API (Serper / SerpAPI). For now we use the
LLM to simulate "what the top 10 results cover" — a solid MVP. The real
search-API call is the documented upgrade point.
"""
from modules.llm import have_llm, chat
from modules.json_utils import parse_llm_json


def _fallback(keyword: str, default_wc: int) -> dict:
    return {
        "target_word_count": default_wc,
        "must_cover": [
            f"What is {keyword}",
            f"Step-by-step: {keyword}",
            "Common mistakes to avoid",
            "Costs / requirements",
            "FAQ",
        ],
        "angle": "More practical and up-to-date than the current top results, with a clear checklist.",
        "source": "heuristic",
    }


def analyze_competitors(site: dict, keyword: str, default_wc: int = 1500) -> dict:
    if have_llm():
        try:
            system = (
                "You are an SEO content strategist analysing the Google SERP. Given a target "
                "keyword, infer what the current top-ranking articles most likely cover, find the "
                "gaps, and define how to win. Return ONLY JSON."
            )
            user = (
                f'Niche: {site["niche"]}\n'
                f'Target keyword: "{keyword}"\n\n'
                'Return JSON: {'
                '"target_word_count": integer (length needed to compete), '
                '"must_cover": ["6-9 subtopics/questions the article must cover to match + beat the top results"], '
                '"angle": "one sentence: the differentiator that earns the #1 spot"}'
            )
            data = parse_llm_json(chat(system, user, temperature=0.5, max_tokens=900, json_mode=True))
            return {
                "target_word_count": int(data.get("target_word_count") or default_wc),
                "must_cover": data.get("must_cover") or [],
                "angle": data.get("angle") or "",
                "source": "deepseek",
            }
        except Exception:
            pass
    return _fallback(keyword, default_wc)
