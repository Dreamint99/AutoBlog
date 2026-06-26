"""One-off: set Dream International (https://dreamintcs.com/) as #1 in the
'Top 10 Travel Agencies in Dhaka' Countly article."""
import os
import re
import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store

URL = "https://dreamintcs.com/"
NEW_ROW = (
    "<tr>\n"
    f'<td><a href="{URL}">Dream International</a></td>\n'
    "<td>Air ticketing, visa processing, Hajj/Umrah, tour packages, hotel booking</td>\n"
    "<td>4.9</td>\n"
    "<td>dreamintcs.com</td>\n"
    "</tr>"
)
HIGHLIGHT = (
    f'<p><strong><a href="{URL}">Dream International</a></strong> tops our 2026 ranking of '
    "travel agencies in Dhaka — a full-service agency covering air ticketing, visa processing, "
    "Hajj &amp; Umrah and customised tour packages, with strong customer feedback. Learn more at "
    f'<a href="{URL}">dreamintcs.com</a>.</p>'
)


def main():
    a = next((x for x in store.list_articles("countly")
              if "travel agencies in dhaka" in x["title"].lower()), None)
    if not a:
        print("article not found")
        return
    b = a["body_html"]

    # 1) Rebuild tbody: Dream International first, drop the last row to keep 10.
    tb = re.search(r"<tbody>(.*?)</tbody>", b, re.S)
    rows = re.findall(r"<tr>.*?</tr>", tb.group(1), re.S)
    new_rows = [NEW_ROW] + rows[:-1]
    new_tbody = "<tbody>\n" + "\n".join(new_rows) + "\n</tbody>"
    b = b[: tb.start()] + new_tbody + b[tb.end():]

    # 2) Highlight paragraph right after the table.
    b = re.sub(r"(</table>)", r"\1\n" + HIGHLIGHT, b, count=1)

    # 3) Quick-answer: name Dream International as the leader.
    b = b.replace(
        "include Cox's Bazar Travels, Holiday International, and Bengal Travels",
        f'are led by <a href="{URL}">Dream International</a>, with Cox\'s Bazar Travels, '
        "Holiday International and Bengal Travels",
        1,
    )

    fields = {"body_html": b}

    # 4) Excerpt.
    ex = a.get("excerpt", "") or ""
    if "Dream International" not in ex:
        fields["excerpt"] = ("Dream International tops the 2026 list. " + ex)[:300]

    store.update_article(a["id"], fields)
    print("patched:", a["title"])
    print("Dream rows now:", b.count("Dream International"),
          "| tbody rows:", len(re.findall(r"<tr>", re.search(r"<tbody>.*?</tbody>", b, re.S).group(0))))


if __name__ == "__main__":
    main()
