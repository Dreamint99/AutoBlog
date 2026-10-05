"""LLM wrapper with a free-tier fallback chain.

Every provider here speaks the OpenAI chat API, so one client type covers all of them.
LLM_PROVIDER=chain (default) walks LLM_CHAIN in order: when a provider is out of quota,
overloaded or errors, the call moves on to the next one. LLM_PROVIDER=deepseek|openrouter|
gemini|groq|mistral|cerebras pins a single provider (the old behaviour).
"""
import sys
import time

from config.settings import (
    LLM_PROVIDER, LLM_CHAIN, PROVIDERS,
)

_clients = {}
# Providers that hit a hard stop this process (no balance / daily quota / bad key) —
# skipped for the rest of the run so we don't burn retries on them every call.
_dead: set[str] = set()
_last_used = ""


def _chain():
    """[(provider, model)] in try order, only for providers that have a key."""
    if LLM_PROVIDER != "chain":
        p = PROVIDERS.get(LLM_PROVIDER)
        return [(LLM_PROVIDER, p["model"])] if p and p["key"] else []
    out = []
    for entry in LLM_CHAIN.split(","):
        entry = entry.strip()
        if not entry:
            continue
        # split on the FIRST colon only — model ids like "qwen/x:free" contain one
        name, _, model = entry.partition(":")
        p = PROVIDERS.get(name)
        if p and p["key"]:
            out.append((name, model or p["model"]))
    return out


def have_llm() -> bool:
    return bool(_chain())


def _client(name):
    if name not in _clients:
        from openai import OpenAI
        p = PROVIDERS[name]
        # OpenRouter likes identifying headers; harmless for the others.
        _clients[name] = OpenAI(api_key=p["key"], base_url=p["base"], timeout=240, max_retries=0,
                                default_headers={"HTTP-Referer": "https://autoblog.local",
                                                 "X-Title": "AutoBlog"})
    return _clients[name]


def _classify(e: Exception) -> str:
    """'account' = the whole provider is unusable this run (bad key / no balance),
    'model' = this model's daily quota is gone (other models may still have theirs),
    'next' = transient — just try the next entry now."""
    status = getattr(e, "status_code", None)
    msg = str(e).lower()
    if status in (401, 402, 403) or "insufficient balance" in msg or "credit" in msg:
        return "account"
    if status == 429 and any(w in msg for w in ("per day", "daily", "quota", "resource_exhausted",
                                                 "tokens per day", "free-models-per-day")):
        return "model"
    return "next"


def _call(name, model, system, user, temperature, max_tokens, json_mode):
    kwargs = {
        "model": model,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    if name == "gemini":
        # Thinking tokens count against max_tokens on Gemini; keep them small so long
        # article bodies aren't cut off (or returned empty).
        kwargs["reasoning_effort"] = "low"
    resp = _client(name).chat.completions.create(**kwargs)
    msg = resp.choices[0].message
    content = (msg.content or "").strip()
    if not content:  # some reasoning models stash the answer here
        content = (getattr(msg, "reasoning_content", "") or "").strip()
    if not content:
        raise RuntimeError(f"empty content (finish_reason={resp.choices[0].finish_reason})")
    return content


def chat(system: str, user: str, temperature: float = 0.7,
         max_tokens: int = 4000, json_mode: bool = False, model: str = "") -> str:
    global _last_used
    chain = _chain()
    if not chain:
        raise RuntimeError("no LLM provider configured (set GEMINI_API_KEY / GROQ_API_KEY / ...)")
    errors = []
    # Two passes: the second gives overloaded (503/429-per-minute) providers a moment
    # to recover before we give up on the call entirely.
    alive = lambda n, m: n not in _dead and f"{n}:{m}" not in _dead
    for rnd in range(2):
        for name, default_model in chain:
            # Per-call model override (e.g. deepseek-v4-pro for long bodies) only makes
            # sense for DeepSeek; every other provider uses its chain model.
            use_model = model if (model and name == "deepseek") else default_model
            if not alive(name, use_model):
                continue
            for attempt in range(2):  # one quick retry on empty/garbled output
                try:
                    out = _call(name, use_model, system, user, temperature, max_tokens, json_mode)
                    if _last_used != f"{name}:{use_model}":
                        _last_used = f"{name}:{use_model}"
                        print(f"LLM: using {_last_used}", file=sys.stderr, flush=True)
                    return out
                except Exception as e:
                    kind = _classify(e)
                    errors.append(f"{name}:{use_model} → {str(e)[:160]}")
                    if kind in ("account", "model"):
                        _dead.add(name if kind == "account" else f"{name}:{use_model}")
                        print(f"LLM: {name}:{use_model} disabled for this run ({str(e)[:120]})",
                              file=sys.stderr, flush=True)
                        break
                    if "empty content" in str(e) and attempt == 0:
                        continue
                    break
        if rnd == 0 and any(alive(n, m) for n, m in chain):
            time.sleep(20)
    raise RuntimeError("all LLM providers failed: " + " | ".join(errors[-6:]))
