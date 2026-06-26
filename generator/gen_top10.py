"""Daily worldwide "Top 10" generator for Countly.

Produces ranked listicle reports — "Top 10 <category> in <place>" — for the
Countly site's dedicated /top10 page. Targets high-search queries WORLDWIDE
(not only Bangladesh / Qatar): the LLM acts as keyword strategist, steered by a
broad category × place seed, and picks high-interest combinations.

Writes to the configured STORAGE_BACKEND (supabase in prod → live immediately,
and auto-categorised onto /top10 because each title contains "Top 10").

Usage:  python gen_top10.py [count]     (default 4 per run)
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

COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 4

# Steering seed — broad so the LLM can pick high-search "Top 10" queries from
# anywhere in the world. Categories × places, plus global ("in the world").
SEED = (
    "Generate 'Top 10' listicle titles people actually search on Google, WORLDWIDE. "
    "Use the format 'Top 10 <category> in <country or city>' (or 'Top 10 <category> in the World'). "
    "Categories: banks, universities, hospitals, travel agencies, hotels, restaurants, "
    "IT/software companies, tech startups, real estate companies, insurance companies, schools, "
    "shopping malls / hypermarkets, gyms, e-commerce websites, car brands, airlines, law firms, "
    "digital marketing agencies, richest people, largest companies. "
    "Places: Bangladesh, Dhaka, Qatar, Doha, UAE, Dubai, Saudi Arabia, Riyadh, India, Mumbai, USA, "
    "New York, UK, London, Canada, Australia, Singapore, Malaysia, Kuala Lumpur, Nigeria, Lagos, "
    "Pakistan, Indonesia, Germany, Japan, Brazil, South Africa, and the World. "
    "Pick HIGH-search, high-interest combinations and vary categories AND regions across the globe — "
    "do not repeat the same category or country. Every title MUST start with 'Top 10'."
)

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

    # Ask for extra titles, then keep only real "Top 10 …" ones.
    titles = suggest_titles(site, count=COUNT + 3, seed=SEED, avoid=avoid)
    titles = [t for t in titles if "top 10" in t.lower() or "top ten" in t.lower()][:COUNT]
    log(f"[countly/top10] planning {len(titles)}")

    done = 0
    for t in titles:
        try:
            art = generate_article(site, t)
            done += 1
            log(f"[countly/top10] OK {art['title']} ({art['word_count']}w)")
        except Exception as e:
            log(f"[countly/top10] FAIL {t} - {e}")
    log(f"=== countly top10 done +{done} ===")


if __name__ == "__main__":
    main()
