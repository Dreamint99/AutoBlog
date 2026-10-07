"""Build web/src/data/world-facts.json for the VisaPoint travel map.

Sources (all free, no key):
  - mledoze/countries (ODbL 1.0): capital, languages, currencies, area, lat/lng, borders
  - World Bank API SP.POP.TOTL (CC BY 4.0): latest population
  - pytz: IANA time zones per country
Attribution is shown on /travel-map.
"""
import json
import os
import sys

import pytz
import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "..", "web", "src", "data", "world-facts.json")
LIST = os.path.join(ROOT, "..", "web", "src", "data", "world-countries.json")


def main() -> int:
    wanted = {c["iso2"] for c in json.load(open(LIST, encoding="utf-8"))}
    md = requests.get("https://raw.githubusercontent.com/mledoze/countries/master/countries.json", timeout=60).json()
    cca3_to_2 = {c["cca3"]: c["cca2"] for c in md}

    pop: dict[str, int] = {}
    url = "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=20000&mrnev=1"
    rows = requests.get(url, timeout=90).json()[1]
    for r in rows:
        iso3 = r.get("countryiso3code")
        if iso3 in cca3_to_2 and r.get("value"):
            pop[cca3_to_2[iso3]] = int(r["value"])

    out = {}
    for c in md:
        iso = c["cca2"]
        if iso not in wanted:
            continue
        out[iso] = {
            "cap": (c.get("capital") or [""])[0],
            "pop": pop.get(iso, 0),
            "area": int(c.get("area") or 0),
            "lang": sorted((c.get("languages") or {}).values()),
            "cur": sorted(v.get("name", "") for v in (c.get("currencies") or {}).values()),
            "tz": len(pytz.country_timezones.get(iso, [])) or 1,
            "ll": [round(x, 2) for x in (c.get("latlng") or [0, 0])[:2]],
            "nb": sorted(cca3_to_2[b] for b in c.get("borders") or [] if b in cca3_to_2 and cca3_to_2[b] in wanted),
        }
    missing = sorted(wanted - set(out))
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {len(out)} countries to {OUT}; missing: {missing}; world pop sum={sum(v['pop'] for v in out.values()):,}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
