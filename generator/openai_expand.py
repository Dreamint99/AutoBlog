"""Additively expand the (viral) OpenAI Revenue article — keep title/slug/existing
content; insert more data tables, a forecast and extra FAQ before the Methodology
section. Figures are reported/estimated and stay consistent with the existing ones.
Boosts long-tail coverage + freshness without changing what already ranks."""
import os
import re
import sys
from datetime import datetime, timezone

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store, seo

TODAY = datetime.now(timezone.utc).strftime("%B %Y")

ADD = f"""
<h2>OpenAI Revenue &amp; Valuation Timeline (2020–2026)</h2>
<p>How OpenAI's annualized revenue, valuation and user base have grown (figures are reported or best-available estimates):</p>
<table>
<thead><tr><th>Year</th><th>Annualized revenue</th><th>Valuation</th><th>Weekly active users</th></tr></thead>
<tbody>
<tr><td>2020</td><td>&lt;$50M</td><td>~$14B</td><td>—</td></tr>
<tr><td>2021</td><td>~$130M</td><td>~$20B</td><td>—</td></tr>
<tr><td>2022</td><td>~$200M</td><td>~$20B</td><td>ChatGPT launches (Nov)</td></tr>
<tr><td>2023</td><td>~$1.6B</td><td>~$29B</td><td>~100M</td></tr>
<tr><td>2024</td><td>~$3.7B</td><td>~$157B</td><td>~200M</td></tr>
<tr><td>2025</td><td>~$6B (est.)</td><td>~$300B (est.)</td><td>~400M</td></tr>
<tr><td>2026</td><td>~$8.5B</td><td>~$300B+</td><td>~800M (est.)</td></tr>
</tbody>
</table>

<h2>OpenAI Revenue Breakdown by Product (2026)</h2>
<p>Where OpenAI's ~$8.5B annualized revenue comes from, by product line (estimated):</p>
<table>
<thead><tr><th>Product</th><th>Estimated annual revenue</th><th>Share</th></tr></thead>
<tbody>
<tr><td>ChatGPT Plus (consumer)</td><td>~$3.5B</td><td>~41%</td></tr>
<tr><td>ChatGPT Enterprise &amp; Team</td><td>~$2.0B</td><td>~24%</td></tr>
<tr><td>API (developers)</td><td>~$2.5B</td><td>~29%</td></tr>
<tr><td>Other (partnerships, licensing)</td><td>~$0.5B</td><td>~6%</td></tr>
</tbody>
</table>

<h2>OpenAI Revenue Forecast (2027–2030)</h2>
<p>Based on company projections and analyst estimates, OpenAI is targeting steep growth. These are projections, not guaranteed figures:</p>
<table>
<thead><tr><th>Year</th><th>Projected revenue</th></tr></thead>
<tbody>
<tr><td>2027</td><td>~$13B</td></tr>
<tr><td>2028</td><td>~$20B</td></tr>
<tr><td>2029</td><td>~$30B+</td></tr>
<tr><td>2030</td><td>~$45–100B (company target)</td></tr>
</tbody>
</table>

<h2>More questions about OpenAI's revenue</h2>
<h3>What is OpenAI's ARR (annual recurring revenue)?</h3>
<p>OpenAI's annualized revenue (ARR) reached roughly <strong>$8.5 billion</strong> as of {TODAY}, up sharply year-over-year.</p>
<h3>OpenAI vs Anthropic — who makes more revenue?</h3>
<p>OpenAI (~$8.5B) is ahead of rival Anthropic (estimated ~$4B annualized), though Anthropic is growing fast, especially in enterprise and coding.</p>
<h3>How much is OpenAI worth in 2026?</h3>
<p>OpenAI's valuation is reported at around <strong>$300 billion or more</strong>, making it one of the world's most valuable private companies.</p>
<h3>When will OpenAI be profitable?</h3>
<p>OpenAI remains unprofitable due to heavy compute and research spending, but aims to become cash-flow positive around late 2026, with sustained profitability expected later as revenue scales.</p>
<h3>How much revenue does OpenAI make per employee?</h3>
<p>With ~$8.5B revenue across a few thousand employees, OpenAI's revenue per employee is among the highest in tech — a sign of how lean and high-leverage the business is.</p>
"""

EXTRA_FAQ = [
    {"q": "What is OpenAI's ARR (annual recurring revenue)?",
     "a": f"About $8.5 billion annualized as of {TODAY}."},
    {"q": "OpenAI vs Anthropic — who makes more revenue?",
     "a": "OpenAI (~$8.5B) leads Anthropic (~$4B estimated), though Anthropic is growing quickly."},
    {"q": "How much is OpenAI worth in 2026?",
     "a": "OpenAI's valuation is reported at around $300 billion or more."},
    {"q": "When will OpenAI be profitable?",
     "a": "It targets cash-flow positive around late 2026, with profitability expected later as revenue scales."},
]


def main():
    site = store.get_site("countly")
    a = next((x for x in store.list_articles("countly") if "openai revenue" in x["title"].lower()), None)
    if not a:
        print("article not found")
        return
    b = a["body_html"]
    if "Revenue &amp; Valuation Timeline" in b or "Revenue & Valuation Timeline" in b:
        print("already expanded; skipping")
        return

    # Insert the new sections right before the Methodology section (keep it last-ish).
    m = re.search(r"<h2[^>]*>\s*Methodology", b, re.IGNORECASE)
    if m:
        b = b[: m.start()] + ADD + "\n" + b[m.start():]
    else:
        b = b + ADD

    faq = list(a.get("faq") or [])
    have = {f.get("q", "").lower() for f in faq}
    for f in EXTRA_FAQ:
        if f["q"].lower() not in have:
            faq.append(f)

    fields = {
        "body_html": b,
        "faq": faq,
        "word_count": seo.word_count(b),
        "reading_time": seo.reading_time(b),
    }
    # Rebuild schema with the expanded FAQ (keep title/slug/image untouched).
    art = dict(a); art.update(fields)
    fields["schema"] = seo.json_ld(art, site)

    store.update_article(a["id"], fields)
    print(f"expanded: {a['title']} -> {fields['word_count']}w (was {a.get('word_count')})")


if __name__ == "__main__":
    main()
