"""Refresh research/agencies.json from BMET RAIMS (https://raims.oep.gov.bd/agencies, public HTML table).

Columns: (blank), License No, Agent Name, Address, Office Phone, License Status, License validity date.
Fails (exit 1) instead of writing when the page looks wrong (too few rows), so a broken fetch never empties the site.
"""
import datetime as dt
import html
import json
import os
import re
import sys

import requests

H = os.path.dirname(os.path.abspath(__file__))
URL = "https://raims.oep.gov.bd/agencies"


def clean(x):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", x)).split())


def main():
    r = requests.get(URL, timeout=120, headers={"User-Agent": "Mozilla/5.0 (compatible; probashiinfo-data/1.0)"})
    r.raise_for_status()
    rows = []
    for tr in re.findall(r"<tr>(.*?)</tr>", r.text, re.S):
        td = [clean(x) for x in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
        if len(td) != 7 or not re.match(r"RL\d+$", td[1]):
            continue
        try:
            exp = dt.datetime.strptime(td[6], "%d/%b/%Y").date().isoformat()
        except ValueError:
            exp = ""
        rows.append({"rl": td[1], "name": td[2], "address": td[3], "phone": td[4], "email": "", "status": td[5], "expiry": exp, "source": URL})
    if len(rows) < 2000:
        sys.exit(f"only {len(rows)} agencies parsed — not writing")
    counts = {}
    for a in rows:
        counts[a["status"]] = counts.get(a["status"], 0) + 1
    out = {"accessed": dt.date.today().isoformat(), "source": URL,
           "source_note": "RAIMS (Recruiting Agency Information Management System) of BMET, public table.",
           "status_counts": counts, "count": len(rows), "agencies": rows}
    json.dump(out, open(os.path.join(H, "research", "agencies.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(rows), "agencies", counts)


if __name__ == "__main__":
    main()
