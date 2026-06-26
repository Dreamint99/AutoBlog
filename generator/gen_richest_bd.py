"""Build a Countly "Richest People in Bangladesh" report.

Bangladesh has NO Forbes-listed billionaires, so there is no real-time source.
This compiles the most prominent, publicly-known Bangladeshi business figures via
the LLM and presents ESTIMATED net worths with a loud disclaimer (NOT Forbes,
disputed, indicative ranges) — same Forbes-style layout as the world report.
"""
import os
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
from modules.llm import have_llm, chat
from modules.json_utils import parse_llm_json
from modules.forbes import fmt_worth
from modules.image import _wikimedia, inline_image

_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "drip.log")


def log(msg: str):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    print(line)
    try:
        with open(_LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def get_people() -> list[dict]:
    system = (
        "You are a careful financial researcher. List the most prominent, REAL, publicly-known "
        "richest people and business families of Bangladesh — heads/owners of major conglomerates. "
        "Only well-known, verifiable public figures; NEVER invent names. Net-worth figures for "
        "Bangladeshi tycoons are NOT officially published and are disputed, so give your best "
        "conservative public-knowledge ESTIMATE as a range. Return ONLY JSON."
    )
    user = (
        "Return a JSON array (richest first, up to 25) of objects: "
        '{"name": "person or family name", "group": "their main company/group", '
        '"worth_b": estimated net worth in USD billions (number, best estimate), '
        '"worth_label": "an indicative range like \\"$1–3B (est.)\\"", '
        '"source": "main industry/business"}. '
        "Include figures like the owners of Bashundhara, Beximco, Square, City Group, Meghna, "
        "PRAN-RFL, S. Alam, Akij, Partex, Summit, Navana, Transcom, BSRM, Abul Khair, Walton, etc. "
        "where they are genuinely among the wealthiest. Keep estimates conservative."
    )
    data = parse_llm_json(chat(system, user, temperature=0.4, max_tokens=3000, json_mode=True))
    if isinstance(data, dict):
        data = data.get("people") or data.get("richest") or list(data.values())
    out = []
    for p in data or []:
        if not isinstance(p, dict) or not p.get("name"):
            continue
        out.append({
            "name": str(p.get("name")).strip(),
            "group": str(p.get("group", "")).strip(),
            "worth_b": float(p.get("worth_b") or 0),
            "worth_label": str(p.get("worth_label", "")).strip(),
            "source": str(p.get("source", "")).strip(),
        })
    out.sort(key=lambda x: -x["worth_b"])
    return out


def _photo(name: str, group: str) -> str:
    return _wikimedia(name) or _wikimedia(group) or inline_image(group or name)


DISCLAIMER = (
    '<div class="cn-note" role="note"><b>Important — these are estimates, not official figures.</b>'
    "<p>Bangladesh has <strong>no Forbes-listed billionaires</strong>, and the net worth of "
    "Bangladeshi business families is <strong>not officially published</strong>. The figures below are "
    "best-available <strong>estimates</strong> compiled from public reporting and are widely disputed — "
    "treat them as indicative ranges only, not verified Forbes/official numbers. Names, company "
    "attributions and figures may be approximate; verify before relying on them.</p></div>"
)


def build_body(people: list[dict], today: str) -> str:
    top = people[:25]
    n1 = top[0] if top else None

    podium = []
    for i, p in enumerate(top[:3], 1):
        photo = _photo(p["name"], p["group"])
        worth = p["worth_label"] or fmt_worth(p["worth_b"]) + " (est.)"
        podium.append(
            f'<figure class="cn-rich-card cn-rich-{i}"><span class="cn-rich-medal">#{i}</span>'
            + (f'<img src="{photo}" alt="{escape(p["name"])}" loading="lazy">' if photo else "")
            + f'<figcaption><b>{escape(p["name"])}</b>'
            f'<span class="cn-rich-worth">{escape(worth)}</span>'
            f'<span class="cn-rich-src">{escape(p["group"] or p["source"])}</span></figcaption></figure>'
        )
    podium_html = '<div class="cn-rich-podium">' + "".join(podium) + "</div>"

    rows = []
    for i, p in enumerate(top, 1):
        worth = p["worth_label"] or (fmt_worth(p["worth_b"]) + " (est.)")
        rows.append(
            f'<tr><td class="cn-rich-rank">{i}</td><td>{escape(p["name"])}</td>'
            f'<td class="cn-rich-worth">{escape(worth)}</td>'
            f'<td>{escape(p["group"])}</td><td>{escape(p["source"])}</td></tr>'
        )
    table = (
        '<table class="cn-rich"><thead><tr><th>#</th><th>Name</th>'
        "<th>Net worth (est.)</th><th>Group</th><th>Source</th></tr></thead><tbody>"
        + "".join(rows) + "</tbody></table>"
    )

    quick = (
        f"<p>Bangladesh's wealthiest people are its big-conglomerate owners. As of {today}, the most "
        f"prominent include <strong>{escape(n1['name'])}</strong> ({escape(n1['group'])}) and other major "
        "business families below. Bangladesh has no Forbes-listed billionaires, so all net-worth figures "
        "here are <strong>estimates</strong>, not official numbers.</p>"
        if n1 else "<p>Estimated ranking of Bangladesh's wealthiest business families.</p>"
    )

    takeaways = (
        '<div class="key-takeaways"><h2>Key takeaways</h2><ul>'
        "<li>Bangladesh has <strong>no Forbes-listed billionaires</strong>; figures here are estimates.</li>"
        f"<li>Wealth is concentrated in large conglomerates ({escape(', '.join(dict.fromkeys([p['group'] for p in top[:5] if p['group']])))}).</li>"
        "<li>Estimates are disputed and not officially published — verify before citing.</li>"
        f"<li>Compiled {today}.</li></ul></div>"
    )

    method = (
        "<h2>How this list is compiled</h2>"
        "<p>Because Bangladesh publishes no official wealth register and no Bangladeshi appears on Forbes' "
        "global billionaires list, this ranking is a best-effort compilation of the country's most prominent "
        "business owners from public reporting. Net-worth figures are rough estimates and ranges — they are "
        "not Forbes or audited numbers and should be treated as indicative only.</p>"
    )

    faq = (
        "<h2>Frequently asked questions</h2>"
        "<h3>Who is the richest person in Bangladesh?</h3>"
        f"<p>{escape(n1['name']) if n1 else 'The largest conglomerate owners'} is widely considered among the "
        "wealthiest, though exact net worth is not officially published.</p>"
        "<h3>Are any Bangladeshis on the Forbes billionaires list?</h3>"
        "<p>No — as of now Forbes lists no Bangladeshi citizens, so these figures are estimates, not Forbes data.</p>"
        "<h3>How accurate are these net worths?</h3>"
        "<p>They are rough public estimates and are disputed. Use them as indicative ranges only.</p>"
    )

    return (DISCLAIMER + quick + takeaways + podium_html
            + f"<h2>Top {len(top)} Richest People in Bangladesh ({today}, estimated)</h2>"
            + table
            + '<p class="cn-src">Estimates compiled from public reporting; not Forbes or official figures. '
            f"Last compiled {today}.</p>" + method + faq)


def main():
    if not have_llm():
        log("[richest-bd] no LLM key; aborting")
        return
    people = get_people()
    if len(people) < 5:
        log(f"[richest-bd] too few people ({len(people)}); aborting")
        return
    today = datetime.now(timezone.utc).strftime("%B %Y")
    body = build_body(people, today)
    n = min(25, len(people))
    title = f"Top {n} Richest People in Bangladesh {datetime.now(timezone.utc).year} (Estimated Net Worth)"

    site = store.get_site("countly")
    existing = next((a for a in store.list_articles("countly")
                     if "richest people in bangladesh" in a["title"].lower()), None)

    n1 = people[0]
    fields = {
        "title": title,
        "body_html": body,
        "excerpt": f"Estimated ranking of the richest people in Bangladesh ({today}) — top conglomerate owners "
                   f"like {n1['name']}. Figures are estimates, not Forbes/official.",
        "meta_title": title[:60],
        "meta_description": f"Top {n} richest people in Bangladesh ({today}): estimated net worth of major "
                            "business families. Not Forbes — figures are estimates and disputed.",
        "keyword": "richest people in Bangladesh",
        "tags": ["Top 10", "Richest", "Bangladesh", "Companies"],
        "image_url": _photo(n1["name"], n1["group"]),
        "word_count": seo.word_count(body),
        "reading_time": seo.reading_time(body),
    }
    if existing:
        store.update_article(existing["id"], fields)
        log(f"[richest-bd] updated '{title}' ({len(people)} people)")
    else:
        import uuid
        art = {
            "id": uuid.uuid4().hex[:12], "site_id": "countly",
            "slug": seo.make_slug(title, ""), "status": "published",
            "faq": [], "secondary_keywords": [], "is_mock": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **fields,
        }
        art["schema"] = seo.json_ld(art, site)
        store.add_article(art)
        log(f"[richest-bd] created '{title}' slug={art['slug']} ({len(people)} people)")


if __name__ == "__main__":
    main()
