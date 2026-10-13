"""Re-rank a site's demand queue by real GOOGLE search volume (Semrush phrase_these CSV).

    python google_volume.py <site_id> list     → prints up to 100 queued queries, ';'-joined
                                                   (paste as the Semrush phrase_these "phrase")
    python google_volume.py <site_id> <csv>    → applies the Semrush CSV result

Bing's keyword API only knows Bing searches; Semrush gives Google's volume per country.
Queries get "gvol"; the queue is re-ordered: gold first, then by Google volume (unknown last),
and Bing-only keywords with zero Google volume drop out. Used by the daily cloud routine
"AutoBlog Ubersuggest gold keywords".
"""
import csv
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# Semrush regional database that matches each site's readers
DB = {"countly": "us", "infkey": "us", "walvi": "us", "gccguide": "ae", "ninetymins": "uk", "probashiinfo": "bd"}


def main():
    sid, arg = sys.argv[1], sys.argv[2]
    path = os.path.join(HERE, "data", f"demand_{sid}.json")
    d = json.load(open(path, encoding="utf-8"))
    qs = d.get("queries", [])
    if arg == "list":
        todo = [q["q"] for q in qs if "gvol" not in q and q.get("src") != "gold"][:100]
        print(f"database={DB.get(sid, 'us')}")
        print(";".join(todo))
        return
    text = open(arg, encoding="utf-8").read()
    vol = {}
    for row in csv.DictReader(io.StringIO(text), delimiter=";"):
        try:
            vol[row["Keyword"].strip().lower()] = int(row["Search Volume"] or 0)
        except (KeyError, ValueError):
            continue
    for q in qs:
        if q["q"].lower() in vol:
            q["gvol"] = vol[q["q"].lower()]
    qs = [q for q in qs if not (q.get("src") == "bingkw" and q.get("gvol") == 0)]
    gold = [q for q in qs if q.get("src") == "gold"]
    rest = sorted((q for q in qs if q.get("src") != "gold"), key=lambda q: -(q.get("gvol") if q.get("gvol") is not None else -1))
    d["queries"] = gold + rest
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    top = [q for q in rest if q.get("gvol")][:5]
    print(f"{sid}: {len(vol)} Google volumes applied; top: " + ", ".join(f"{q['q']} ({q['gvol']})" for q in top))


if __name__ == "__main__":
    main()
