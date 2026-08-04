# -*- coding: utf-8 -*-
"""AI Morning — daily AI-news collector.

Pulls the last ~24h of AI news from free RSS feeds, dedupes, scores importance,
keeps the Top N, writes a clean 1-sentence English summary + natural Bengali
translation with DeepSeek, and saves to Cloudflare D1 (table `aim_news`).

  python gen_aim_news.py [top_n]     # default 12

Run daily (00:00 UTC) via GitHub Actions — the app reads today's briefing.
"""
import html
import json
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import feedparser

from modules.llm import chat, have_llm
from modules.json_utils import parse_llm_json
from gen_ai_tools_d1 import _run_sql, _query, _sql_str, _batched  # reuse D1 helpers

TOP_N = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 12

# (feed_url, source_label, reputation_weight)
FEEDS = [
    ("https://techcrunch.com/category/artificial-intelligence/feed/", "TechCrunch", 5),
    ("https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", "The Verge", 5),
    ("https://venturebeat.com/category/ai/feed/", "VentureBeat", 4),
    ("https://blog.google/technology/ai/rss/", "Google AI", 5),
    ("https://openai.com/news/rss.xml", "OpenAI", 6),
    ("https://huggingface.co/blog/feed.xml", "Hugging Face", 4),
    ("https://www.technologyreview.com/topic/artificial-intelligence/feed", "MIT Tech Review", 4),
    ("https://the-decoder.com/feed/", "The Decoder", 3),
    ("https://www.artificialintelligence-news.com/feed/", "AI News", 3),
]

# high-signal words → importance + breaking detection
BIG = ["gpt-5", "gpt5", "gpt-4", "claude", "gemini", "llama", "midjourney", "sora", "grok",
       "launch", "launches", "release", "releases", "unveil", "announce", "introduc",
       "funding", "raises", "acquisition", "acquires", "billion", "regulation", "lawsuit",
       "open-source", "open source", "breakthrough", "model", "agent"]
BREAKING = ["gpt-5", "gpt5", "claude", "gemini", "sora", "acquisition", "acquires",
            "billion", "launch", "releases", "unveil"]

_TAG = re.compile(r"<[^>]+>")


def _clean(t: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(_TAG.sub(" ", t or ""))).strip()


def _norm_title(t: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (t or "").lower()).strip()


def collect() -> list:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=36)
    items, seen = [], set()
    for url, source, weight in FEEDS:
        try:
            feed = feedparser.parse(url)
        except Exception as e:
            print(f"  feed fail {source}: {e}")
            continue
        for e in feed.entries[:25]:
            title = _clean(e.get("title", ""))
            if not title:
                continue
            key = _norm_title(title)[:60]
            if key in seen:
                continue
            # published time
            pub = None
            for f in ("published_parsed", "updated_parsed"):
                if e.get(f):
                    pub = datetime(*e[f][:6], tzinfo=timezone.utc)
                    break
            if pub and pub < cutoff:
                continue
            seen.add(key)
            desc = _clean(e.get("summary", e.get("description", "")))[:600]
            img = ""
            if e.get("media_content"):
                img = e["media_content"][0].get("url", "")
            elif e.get("links"):
                for lk in e["links"]:
                    if lk.get("type", "").startswith("image"):
                        img = lk.get("href", "")
            low = title.lower()
            score = weight + sum(2 for w in BIG if w in low)
            if pub:
                age_h = (datetime.now(timezone.utc) - pub).total_seconds() / 3600
                score += max(0, 12 - age_h) * 0.3  # recency boost
            items.append({
                "title": title, "source": source, "url": e.get("link", ""),
                "desc": desc, "image": img, "published": pub, "score": round(score, 2),
                "breaking": any(w in low for w in BREAKING),
            })
    items.sort(key=lambda x: x["score"], reverse=True)
    return items[:TOP_N]


def enrich(it: dict) -> dict:
    """DeepSeek: 1-sentence EN summary + natural Bengali title/summary."""
    if not have_llm():
        it["summary_en"] = it["desc"][:160]
        it["title_bn"] = it["title"]
        it["summary_bn"] = it["summary_en"]
        return it
    system = ("You are a bilingual AI-news editor. Write a crisp 1-sentence English summary, then "
              "translate the title and summary into NATURAL, professional Bengali (not literal/Google "
              "style). Keep product names (GPT-5, Claude, Gemini) in English. Return ONLY JSON.")
    user = (f"Headline: {it['title']}\nSource: {it['source']}\nContext: {it['desc']}\n\n"
            'Return JSON: {"summary_en":"one clear sentence","title_bn":"...","summary_bn":"..."}')
    d = None
    for _ in range(3):  # v4-flash is occasionally flaky; retry for full Bengali coverage
        try:
            r = parse_llm_json(chat(system, user, temperature=0.4, max_tokens=600, json_mode=True))
            if isinstance(r, dict) and r.get("summary_bn"):
                d = r
                break
        except Exception:
            pass
    if d:
        it["summary_en"] = (d.get("summary_en") or it["desc"][:160]).strip()
        it["title_bn"] = (d.get("title_bn") or it["title"]).strip()
        it["summary_bn"] = (d.get("summary_bn") or it["summary_en"]).strip()
    else:
        print("  enrich fail -> fallback")
        it["summary_en"] = it["desc"][:160]
        it["title_bn"] = it["title"]
        it["summary_bn"] = it["summary_en"]
    return it


def save(items: list):
    _run_sql("""
CREATE TABLE IF NOT EXISTS aim_news (
  id TEXT PRIMARY KEY, day TEXT, rank INTEGER, title_en TEXT, title_bn TEXT, source TEXT, url TEXT,
  image_url TEXT, summary_en TEXT, summary_bn TEXT, category TEXT, importance REAL, breaking INTEGER,
  published TEXT, created_at TEXT
);""")
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc).isoformat()
    # fresh set for the day
    _run_sql(f"DELETE FROM aim_news WHERE day='{day}';")
    stmts = []
    for i, it in enumerate(items, 1):
        rid = f"{day}-{i}"
        pub = it["published"].isoformat() if it.get("published") else now
        cols = ["id", "day", "rank", "title_en", "title_bn", "source", "url", "image_url",
                "summary_en", "summary_bn", "category", "importance", "breaking", "published", "created_at"]
        vals = [_sql_str(rid), _sql_str(day), str(i), _sql_str(it["title"]), _sql_str(it["title_bn"]),
                _sql_str(it["source"]), _sql_str(it["url"]), _sql_str(it["image"]),
                _sql_str(it["summary_en"]), _sql_str(it["summary_bn"]), _sql_str("AI"),
                str(it["score"]), "1" if it["breaking"] else "0", _sql_str(pub), _sql_str(now)]
        stmts.append(f"INSERT OR REPLACE INTO aim_news ({', '.join(cols)}) VALUES ({', '.join(vals)});")
    _batched(stmts)
    print(f"Saved {len(items)} news items for {day} -> D1 aim_news")


def main():
    print("Collecting AI news…")
    items = collect()
    print(f"  {len(items)} top stories selected")
    for it in items:
        enrich(it)
        time.sleep(0.2)
    save(items)


if __name__ == "__main__":
    main()
