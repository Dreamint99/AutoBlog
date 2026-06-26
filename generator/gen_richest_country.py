"""Per-country "Richest People in <country>" reports from REAL Forbes data.

Builds one article per country that has Forbes billionaires (>= MIN_COUNT), plus
Qatar and a Dubai (UAE-framed) page explicitly. Deterministic (no LLM) → numbers
always real; re-run on a schedule to auto-update every country page at once.

Usage:  python gen_richest_country.py [min_count]   (default 3)
"""
import os
import sys
import uuid
from collections import defaultdict
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

MIN_COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 3
YEAR = datetime.now(timezone.utc).year
TODAY = datetime.now(timezone.utc).strftime("%B %Y")
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


def _title(disp: str, cnt: int) -> str:
    n = min(cnt, 100)
    if cnt >= 20:
        return f"Top {n} Richest People in {disp} {YEAR}"
    if cnt >= 10:
        return f"Top {cnt} Richest People in {disp} {YEAR}"
    return f"Richest People in {disp} {YEAR}: Billionaires & Net Worth"


def build_body(disp: str, people: list[dict], note: str = "") -> str:
    top = people[:100]
    n1 = top[0]

    podium = []
    for i, p in enumerate(top[:3], 1):
        photo = _photo(p["name"])
        podium.append(
            f'<figure class="cn-rich-card cn-rich-{i}"><span class="cn-rich-medal">#{i}</span>'
            + (f'<img src="{photo}" alt="{escape(p["name"])}" loading="lazy">' if photo else "")
            + f'<figcaption><b>{escape(p["name"])}</b>'
            f'<span class="cn-rich-worth">{fmt_worth(p["worth_b"])}</span>'
            f'<span class="cn-rich-src">{escape(p["source"] or p["industry"])}</span></figcaption></figure>'
        )
    podium_html = '<div class="cn-rich-podium">' + "".join(podium) + "</div>"

    rows = "".join(
        f'<tr><td class="cn-rich-rank">{i}</td><td>{escape(p["name"])}</td>'
        f'<td class="cn-rich-worth">{fmt_worth(p["worth_b"])}</td>'
        f'<td>{escape(p["source"] or p["industry"])}</td></tr>'
        for i, p in enumerate(top, 1)
    )
    table = ('<table class="cn-rich"><thead><tr><th>#</th><th>Name</th>'
             "<th>Net worth</th><th>Source</th></tr></thead><tbody>" + rows + "</tbody></table>")

    note_html = f"<p>{note}</p>" if note else ""
    quick = (
        f"<p>As of <strong>{TODAY}</strong>, the richest person in {disp} is "
        f"<strong>{escape(n1['name'])}</strong> with an estimated net worth of {fmt_worth(n1['worth_b'])}"
        f" ({escape(n1['source'] or n1['industry'])}). {disp} has <strong>{len(people)}</strong> "
        "billionaire(s) on Forbes' Real-Time Billionaires list; the full ranking is below and updates "
        "automatically.</p>" + note_html
    )
    takeaways = (
        '<div class="key-takeaways"><h2>Key takeaways</h2><ul>'
        f"<li>Richest in {disp}: <strong>{escape(n1['name'])}</strong> — {fmt_worth(n1['worth_b'])}.</li>"
        f"<li>{disp} has {len(people)} Forbes billionaire(s), worth "
        f"${sum(p['worth_b'] for p in people):,.1f}B combined.</li>"
        f"<li>Source: Forbes Real-Time Billionaires, auto-updated {TODAY}.</li></ul></div>"
    )
    src = ('<p class="cn-src"><strong>Source:</strong> '
           '<a href="https://www.forbes.com/real-time-billionaires/" rel="nofollow">Forbes Real-Time '
           f"Billionaires</a> — auto-updated {TODAY}. Net worth changes daily; verify before citing.</p>")
    method = (
        "<h2>How this ranking works</h2>"
        f"<p>This list shows every {disp} citizen on Forbes' Real-Time Billionaires feed, ranked by net "
        "worth. Forbes re-estimates each fortune as markets move; private-company stakes are estimates, so "
        f"figures vary by day. Last updated {TODAY}.</p>"
    )
    faq = (
        "<h2>Frequently asked questions</h2>"
        f"<h3>Who is the richest person in {disp}?</h3>"
        f"<p>{escape(n1['name'])} — {fmt_worth(n1['worth_b'])} (Forbes, {TODAY}).</p>"
        f"<h3>How many billionaires does {disp} have?</h3>"
        f"<p>{len(people)} on Forbes' current real-time list.</p>"
    )
    return (quick + takeaways + podium_html
            + f"<h2>{_title(disp, len(people))} — full list</h2>" + table + src + method + faq)


def upsert(disp: str, people: list[dict], note: str = ""):
    title = _title(disp, len(people))
    body = build_body(disp, people, note)
    n1 = people[0]
    key = f"richest people in {disp.lower()}"
    existing = next((a for a in store.list_articles("countly") if key in a["title"].lower()), None)
    fields = {
        "title": title, "body_html": body,
        "excerpt": f"Forbes ranking: {n1['name']} is the richest person in {disp} at {fmt_worth(n1['worth_b'])}. "
                   f"All {len(people)} {disp} billionaires by net worth, auto-updated {TODAY}.",
        "meta_title": title[:60],
        "meta_description": f"Richest people in {disp} ({TODAY}): {n1['name']} leads at {fmt_worth(n1['worth_b'])}. "
                            "Live Forbes net-worth ranking, auto-updated.",
        "keyword": f"richest people in {disp}",
        "tags": ["Richest", disp, "Rankings"],
        "image_url": _photo(n1["name"]),
        "word_count": seo.word_count(body), "reading_time": seo.reading_time(body),
    }
    if existing:
        store.update_article(existing["id"], fields)
        return "upd"
    art = {"id": uuid.uuid4().hex[:12], "site_id": "countly", "slug": seo.make_slug(title, ""),
           "status": "published", "faq": [], "secondary_keywords": [], "is_mock": False,
           "created_at": datetime.now(timezone.utc).isoformat(), **fields}
    art["schema"] = seo.json_ld(art, store.get_site("countly"))
    store.add_article(art)
    return "new"


def main():
    ppl = fetch_billionaires()
    if not ppl:
        log("[richest-country] Forbes fetch failed")
        return
    by = defaultdict(list)
    for p in ppl:
        if p["country"]:
            by[p["country"]].append(p)
    for k in by:
        by[k].sort(key=lambda x: -(x["worth_b"] or 0))

    targets = [c for c, lst in by.items() if len(lst) >= MIN_COUNT]
    if "Qatar" in by and "Qatar" not in targets:
        targets.append("Qatar")
    targets.sort(key=lambda c: -len(by[c]))

    new = upd = 0
    for c in targets:
        try:
            r = upsert(c, by[c])
            new += r == "new"; upd += r == "upd"
        except Exception as e:
            log(f"[richest-country] FAIL {c} - {str(e)[:90]}")

    # Dubai — framed from UAE data (most UAE billionaires are Dubai/Abu Dhabi based).
    if by.get("United Arab Emirates"):
        try:
            upsert("Dubai",
                   by["United Arab Emirates"],
                   note="Note: Forbes ranks billionaires by country, not city. This list shows the United "
                        "Arab Emirates' billionaires — most are based in Dubai or Abu Dhabi.")
        except Exception as e:
            log(f"[richest-country] FAIL Dubai - {str(e)[:90]}")

    log(f"=== richest-country done: {new} new, {upd} updated ({len(targets)} countries + Dubai) ===")


if __name__ == "__main__":
    main()
