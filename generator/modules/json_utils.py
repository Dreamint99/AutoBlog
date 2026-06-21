"""Tolerant JSON parsing for LLM output (markdown fences, trailing commas, etc.)."""
import json

try:
    from json_repair import repair_json
except Exception:  # dependency optional; degrade gracefully
    repair_json = None


def parse_llm_json(raw: str):
    if not raw:
        raise ValueError("Empty LLM response")
    text = raw.strip()

    # Strip ```json ... ``` fences
    if text.startswith("```"):
        parts = text.split("```")
        text = max(parts, key=len)
        if text.lstrip().lower().startswith("json"):
            text = text.lstrip()[4:]
    text = text.strip()

    # Trim to the outermost JSON bracket pair
    starts = [i for i in (text.find("{"), text.find("[")) if i != -1]
    if starts:
        start = min(starts)
        ends = [i for i in (text.rfind("}"), text.rfind("]")) if i != -1]
        if ends:
            text = text[start:max(ends) + 1]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        if repair_json is None:
            raise
        return json.loads(repair_json(text))
