"""One-off: generate more Countly data reports, steered across the site's six
content categories (AI & ChatGPT, Social Media, Companies, Internet, Countries,
Rankings) so each /topic landing page is populated.

Writes to whatever STORAGE_BACKEND is configured (supabase in prod → live on
countly.net immediately, since the web pages are force-dynamic).

Usage:  python gen_countly_topics.py [per_category]   (default 2)
"""
import os
import sys
from datetime import datetime

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store
from modules.pipeline import generate_article, suggest_titles

PER_CAT = int(sys.argv[1]) if len(sys.argv) > 1 else 2

# (display label, seed terms that steer titles into this category)
CATS = [
    ("AI & ChatGPT", "ChatGPT users statistics, AI adoption numbers, OpenAI revenue, global AI market size"),
    ("Social Media", "social media users by country, Instagram TikTok YouTube user statistics, time spent on social media"),
    ("Companies", "largest companies by revenue, company employee counts, big tech market capitalisation, brand value statistics"),
    ("Internet", "global internet users, ecommerce statistics, website traffic and smartphone usage by country"),
    ("Countries", "country statistics, GDP and population data, digital adoption and internet users by country"),
    ("Rankings", "world rankings, largest and fastest-growing and most valuable companies and brands"),
]

_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "drip.log")


def log(msg: str):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    print(line)
    try:
        with open(_LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def main():
    site = store.get_site("countly")
    if not site:
        log("countly site not found")
        return
    existing = store.list_articles("countly")
    avoid = [a.get("title", "") for a in existing] + [a.get("keyword", "") for a in existing]
    total = 0
    for label, seed in CATS:
        titles = suggest_titles(site, count=PER_CAT, seed=seed, avoid=avoid)
        log(f"[countly/{label}] planning {len(titles)}")
        for t in titles:
            try:
                art = generate_article(site, t)
                avoid.append(t)
                total += 1
                log(f"[countly/{label}] OK {art['title']} ({art['word_count']}w)")
            except Exception as e:
                log(f"[countly/{label}] FAIL {t} - {e}")
    log(f"=== countly topics done +{total} ===")


if __name__ == "__main__":
    main()
