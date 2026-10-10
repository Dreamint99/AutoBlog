"""Try every LLM_CHAIN entry on its own with a short Bengali prompt and report status, speed and length.

    python llm_test.py            # all entries
    python llm_test.py openrouter # only entries whose provider matches
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config.settings import LLM_CHAIN, PROVIDERS  # noqa: E402
from openai import OpenAI  # noqa: E402

only = sys.argv[1] if len(sys.argv) > 1 else ""
for entry in [e.strip() for e in LLM_CHAIN.split(",") if e.strip()]:
    name, _, model = entry.partition(":")
    if only and name != only:
        continue
    p = PROVIDERS.get(name)
    if not p or not p.get("key"):
        print(f"SKIP  {entry:55} (no key)")
        continue
    if name == "workersai":
        print(f"SKIP  {entry:55} (workers ai not tested here)")
        continue
    t = time.time()
    try:
        c = OpenAI(api_key=p["key"], base_url=p["base"], timeout=90)
        r = c.chat.completions.create(model=model or p["model"], max_tokens=300, temperature=0.7, messages=[
            {"role": "user", "content": "প্রবাসী শ্রমিকদের জন্য বৈধ পথে দেশে টাকা পাঠানোর সুবিধা নিয়ে বাংলায় তিন বাক্য লিখুন।"}])
        txt = (r.choices[0].message.content or "").strip().replace("\n", " ")
        u = getattr(r, "usage", None)
        print(f"OK    {entry:55} {time.time() - t:5.1f}s  {len(txt):4} chars  tokens={getattr(u, 'total_tokens', '?')}  | {txt[:90]}")
    except Exception as e:
        print(f"FAIL  {entry:55} {time.time() - t:5.1f}s  {str(e)[:160]}")
