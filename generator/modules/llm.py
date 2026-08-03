"""LLM wrapper. Switches between DeepSeek (direct) and OpenRouter (many models)
via LLM_PROVIDER. Both are OpenAI-compatible, so one client works for both.
"""
from config.settings import (
    DEEPSEEK_API_KEY, DEEPSEEK_MODEL, DEEPSEEK_BASE_URL,
    LLM_PROVIDER, OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_MODEL,
)

_clients = {}


def _provider():
    """Return (api_key, base_url, model) for the active provider."""
    if LLM_PROVIDER == "openrouter" and OPENROUTER_API_KEY:
        return OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_MODEL
    return DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL


def have_llm() -> bool:
    key, _, _ = _provider()
    return bool(key)


def _client(key, base):
    if base not in _clients:
        from openai import OpenAI
        # OpenRouter likes identifying headers; harmless for DeepSeek.
        _clients[base] = OpenAI(api_key=key, base_url=base, default_headers={
            "HTTP-Referer": "https://autoblog.local", "X-Title": "AutoBlog",
        })
    return _clients[base]


def chat(system: str, user: str, temperature: float = 0.7,
         max_tokens: int = 4000, json_mode: bool = False, model: str = "") -> str:
    key, base, default_model = _provider()
    # Per-call model override (e.g. use the stronger v4-pro for long article bodies),
    # only honoured for the DeepSeek provider so OpenRouter routing is unaffected.
    use_model = model if (model and LLM_PROVIDER == "deepseek") else default_model
    kwargs = {
        "model": use_model,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    client = _client(key, base)
    # deepseek-v4 intermittently returns empty content (reasoning quirk / transient),
    # which used to abort a whole drip run (0 titles → 0 articles). Retry on empty.
    last = ""
    for attempt in range(3):
        resp = client.chat.completions.create(**kwargs)
        msg = resp.choices[0].message
        content = (msg.content or "").strip()
        if not content:  # some reasoning models stash the answer here
            content = (getattr(msg, "reasoning_content", "") or "").strip()
        if content:
            return content
        last = f"finish_reason={resp.choices[0].finish_reason}"
    raise RuntimeError(f"LLM returned empty content after 3 tries ({last})")
