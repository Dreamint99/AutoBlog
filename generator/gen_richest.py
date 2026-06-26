"""Build/refresh the Countly "Richest People in the World" report from REAL,
current Forbes Real-Time Billionaires data — deterministic (no LLM), so numbers
are always accurate and can be re-run on a schedule to auto-update.

Forbes-style layout: a top-3 podium (with photos) + a ranked net-worth table.
Updates the existing article in place (keeps its slug/URL).

Usage:  python gen_richest.py [top_n]      (default 25 in the table)
"""
import os
import re
import sys
from datetime import datetime, timezone
from html import escape

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store, seo
from modules.forbes import fetch_billionaires, fmt_worth
from modules.image import _wikimedia, inline_image

TOP_N = int(sys.argv[1]) if len(sys.argv) > 1 else 25
_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "drip.log")


def log(msg: str):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    print(line)
    try:
        with open(_LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def _photo(name: str) -> str:
    return _wikimedia(name) or inline_image(name)


def build_body(people: list[dict], today: str) -> str:
    top = people[:TOP_N]
    n1, n2, n3 = (top + [None, None, None])[:3]
    total_top10 = sum((p["worth_b"] or 0) for p in top[:10])

    # podium (top 3 with photos)
    podium = []
    for i, p in enumerate(top[:3], 1):
        photo = _photo(p["name"])
        podium.append(
            f'<figure class="cn-rich-card cn-rich-{i}">'
            f'<span class="cn-rich-medal">#{i}</span>'
            + (f'<img src="{photo}" alt="{escape(p["name"])}" loading="lazy">' if photo else "")
            + f'<figcaption><b>{escape(p["name"])}</b>'
            f'<span class="cn-rich-worth">{fmt_worth(p["worth_b"])}</span>'
            f'<span class="cn-rich-src">{escape(p["source"] or p["industry"])}</span>'
            f"</figcaption></figure>"
        )
    podium_html = '<div class="cn-rich-podium">' + "".join(podium) + "</div>"

    # table
    rows = []
    for p in top:
        rows.append(
            "<tr>"
            f'<td class="cn-rich-rank">{p["rank"]}</td>'
            f'<td>{escape(p["name"])}</td>'
            f'<td class="cn-rich-worth">{fmt_worth(p["worth_b"])}</td>'
            f'<td>{escape(p["source"] or p["industry"])}</td>'
            f'<td>{escape(p["country"])}</td>'
            "</tr>"
        )
    table = (
        '<table class="cn-rich"><thead><tr>'
        "<th>#</th><th>Name</th><th>Net worth</th><th>Source</th><th>Country</th>"
        "</tr></thead><tbody>" + "".join(rows) + "</tbody></table>"
    )

    src_line = (
        '<p class="cn-src"><strong>Source:</strong> '
        '<a href="https://www.forbes.com/real-time-billionaires/" rel="nofollow">Forbes Real-Time '
        f"Billionaires</a> — auto-updated {today}. Net worth changes daily with markets; verify before citing.</p>"
    )

    quick = (
        f"<p>As of <strong>{today}</strong>, the richest person in the world is "
        f"<strong>{escape(n1['name'])}</strong> with a net worth of {fmt_worth(n1['worth_b'])}"
        + (f", ahead of {escape(n2['name'])} ({fmt_worth(n2['worth_b'])})" if n2 else "")
        + (f" and {escape(n3['name'])} ({fmt_worth(n3['worth_b'])})" if n3 else "")
        + ". These are live figures from Forbes' Real-Time Billionaires list and update automatically.</p>"
    )

    takeaways = (
        '<div class="key-takeaways"><h2>Key takeaways</h2><ul>'
        f"<li>#1 is <strong>{escape(n1['name'])}</strong> at {fmt_worth(n1['worth_b'])} ({escape(n1['source'] or n1['industry'])}).</li>"
        f"<li>The top 10 hold roughly <strong>${total_top10/1000:,.2f} trillion</strong> combined.</li>"
        f"<li>{sum(1 for p in top if p['country']=='United States')} of the top {len(top)} are from the United States.</li>"
        f"<li>Data: Forbes Real-Time Billionaires, auto-updated {today}.</li>"
        "</ul></div>"
    )

    who = (
        f"<h2>Who is the richest person in the world right now?</h2>"
        f"<p>{escape(n1['name'])} is the world's richest person as of {today}, with an estimated "
        f"net worth of {fmt_worth(n1['worth_b'])}, built mainly through {escape(n1['source'] or n1['industry'])}. "
        f"Rankings at the very top can change week to week as share prices move.</p>"
    )

    method = (
        "<h2>How this ranking is compiled</h2>"
        "<p>Figures come directly from Forbes' Real-Time Billionaires feed, which re-estimates each "
        "fortune as markets move using share prices, exchange rates and Forbes' own asset valuations. "
        "Private-company stakes are estimates, so exact numbers vary by source and day. This page is "
        f"refreshed automatically (last update {today}).</p>"
    )

    faq = (
        "<h2>Frequently asked questions</h2>"
        f"<h3>Who is the richest person in the world in {today.split()[-1]}?</h3>"
        f"<p>{escape(n1['name'])} — {fmt_worth(n1['worth_b'])} (Forbes, {today}).</p>"
        "<h3>How often is this list updated?</h3>"
        "<p>It mirrors Forbes' real-time data and is refreshed automatically; net worth moves daily.</p>"
        "<h3>Are these net worths exact?</h3>"
        "<p>No — they are best-available estimates. Private holdings especially are approximations.</p>"
    )

    return (quick + takeaways + podium_html
            + f"<h2>Top {len(top)} Richest People in the World ({today})</h2>"
            + table + src_line + who + method + faq)


def main():
    people = fetch_billionaires(limit=max(TOP_N, 25))
    if not people:
        log("[richest] Forbes fetch failed — aborting (article left unchanged)")
        return
    today = datetime.now(timezone.utc).strftime("%B %Y")
    body = build_body(people, today)

    site = store.get_site("countly")
    art = next((a for a in store.list_articles("countly")
                if "richest people in the world" in a["title"].lower()), None)

    n1 = people[0]
    fields = {
        "body_html": body,
        "excerpt": f"Live Forbes ranking: {n1['name']} is the world's richest at {fmt_worth(n1['worth_b'])}. "
                   f"Top {min(TOP_N,len(people))} billionaires by net worth, auto-updated {today}.",
        "meta_description": f"The richest people in the world ({today}): {n1['name']} leads at "
                            f"{fmt_worth(n1['worth_b'])}. Live Forbes net-worth ranking, auto-updated.",
        "image_url": _photo(n1["name"]),
        "word_count": seo.word_count(body),
        "reading_time": seo.reading_time(body),
    }
    if art:
        store.update_article(art["id"], fields)
        log(f"[richest] updated '{art['title']}' — #1 {n1['name']} {fmt_worth(n1['worth_b'])} ({len(people)} pulled)")
    else:
        log("[richest] existing world article not found; nothing updated")


if __name__ == "__main__":
    main()
