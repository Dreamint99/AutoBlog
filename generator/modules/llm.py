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
         max_tokens: int = 4000, json_mode: bool = False) -> str:
    key, base, model = _provider()
    kwargs = {
        "model": model,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    resp = _client(key, base).chat.completions.create(**kwargs)
    return resp.choices[0].message.content
