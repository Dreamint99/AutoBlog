"""VisaPoint Passport Index → D1.

Builds a ranking of every passport from public visa-policy data (the open
passport-index-dataset on GitHub, MIT licence — credited on the methodology
section of /passport-index) and stores it in D1 so the site updates without a
redeploy:

  pi_passport(iso2, slug, name, numeric, rank, score, free, voa, eta, evisa,
              required, noadm, codes)   — codes = JSON list aligned with pi_meta.dest
  pi_meta(k, v)                          — dest order, updated_at, source

Requirement codes: "F" / "F90" visa-free (days), "A" visa on arrival, "T" eTA,
"E" e-visa, "V" visa required, "X" no admission, "S" own country.
Mobility score = visa-free + visa on arrival + eTA destinations.

Run: python passport_index.py   (env: CLOUDFLARE_API_TOKEN/ACCOUNT_ID in CI;
locally the logged-in wrangler is used).
"""
import csv
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from datetime import datetime, timezone

import pycountry
import requests

SRC = "https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-tidy-iso2.csv"
DB = "autoblog-content"

# Short, familiar English names (pycountry uses formal ISO names).
NAMES = {
    "BO": "Bolivia", "BN": "Brunei", "CD": "DR Congo", "CG": "Congo", "CI": "Ivory Coast", "CV": "Cape Verde",
    "CZ": "Czechia", "FM": "Micronesia", "GB": "United Kingdom", "HK": "Hong Kong", "IR": "Iran", "KP": "North Korea",
    "KR": "South Korea", "LA": "Laos", "MD": "Moldova", "MK": "North Macedonia", "MO": "Macao", "PS": "Palestine",
    "RU": "Russia", "SY": "Syria", "TR": "Turkey", "TW": "Taiwan", "TZ": "Tanzania", "US": "United States",
    "VA": "Vatican City", "VE": "Venezuela", "VN": "Vietnam", "XK": "Kosovo", "SZ": "Eswatini", "FK": "Falkland Islands",
    "VG": "British Virgin Islands", "VI": "US Virgin Islands", "SX": "Sint Maarten", "MF": "Saint Martin",
}
NUMERIC = {"XK": "-99"}  # Kosovo has no ISO numeric (Natural Earth uses -99)


def code(v: str) -> str:
    v = v.strip().lower()
    if v == "-1":
        return "S"
    if v.isdigit():
        return f"F{v}"
    return {"visa free": "F", "visa on arrival": "A", "eta": "T", "e-visa": "E",
            "visa required": "V", "no admission": "X"}.get(v, "V")


def name_of(iso2: str) -> str:
    if iso2 in NAMES:
        return NAMES[iso2]
    c = pycountry.countries.get(alpha_2=iso2)
    return (getattr(c, "common_name", None) or c.name) if c else iso2


def slug_of(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def q(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def wrangler() -> list[str]:
    # Resolved paths: on Windows subprocess can't run a bare "wrangler" (.cmd shim).
    w = shutil.which("wrangler")
    if w:
        return [w]
    npx = shutil.which("npx.cmd") or shutil.which("npx")
    return [npx, "wrangler"]


def d1_file(sql: str) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f:
        f.write(sql)
        path = f.name
    try:
        r = subprocess.run(wrangler() + ["d1", "execute", DB, "--remote", "--file", path, "-y"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode != 0:
            raise RuntimeError((r.stderr or r.stdout)[-1500:])
    finally:
        os.unlink(path)


def main() -> int:
    text = requests.get(SRC, timeout=60).text
    rows = list(csv.DictReader(io.StringIO(text)))
    passports = sorted({r["Passport"] for r in rows})
    dest = sorted({r["Destination"] for r in rows} | set(passports))
    pos = {d: i for i, d in enumerate(dest)}
    grid = {p: ["V"] * len(dest) for p in passports}
    for r in rows:
        grid[r["Passport"]][pos[r["Destination"]]] = code(r["Requirement"])
    for p in passports:
        grid[p][pos[p]] = "S"

    stats = []
    for p in passports:
        cs = grid[p]
        free = sum(c.startswith("F") for c in cs)
        voa, eta, ev = cs.count("A"), cs.count("T"), cs.count("E")
        stats.append({"iso2": p, "free": free, "voa": voa, "eta": eta, "evisa": ev,
                      "required": cs.count("V"), "noadm": cs.count("X"), "score": free + voa + eta})
    # Dense ranking: equal scores share a rank (as the big passport indices do).
    ranks, last, r = {}, None, 0
    for s in sorted(stats, key=lambda x: -x["score"]):
        if s["score"] != last:
            r += 1
            last = s["score"]
        ranks[s["iso2"]] = r

    now = datetime.now(timezone.utc).isoformat()
    sql = [
        "CREATE TABLE IF NOT EXISTS pi_passport (iso2 TEXT PRIMARY KEY, slug TEXT, name TEXT, numeric TEXT, rank INTEGER, "
        "score INTEGER, free INTEGER, voa INTEGER, eta INTEGER, evisa INTEGER, required INTEGER, noadm INTEGER, codes TEXT);",
        "CREATE INDEX IF NOT EXISTS idx_pi_slug ON pi_passport(slug);",
        "CREATE TABLE IF NOT EXISTS pi_meta (k TEXT PRIMARY KEY, v TEXT);",
    ]
    for s in stats:
        iso = s["iso2"]
        c = pycountry.countries.get(alpha_2=iso)
        num = NUMERIC.get(iso) or (c.numeric if c else None)
        name = name_of(iso)
        sql.append(
            "INSERT INTO pi_passport VALUES ("
            + ",".join(q(v) for v in [iso, slug_of(name), name, num, ranks[iso], s["score"], s["free"], s["voa"],
                                       s["eta"], s["evisa"], s["required"], s["noadm"], json.dumps(grid[iso], separators=(",", ":"))])
            + ") ON CONFLICT(iso2) DO UPDATE SET slug=excluded.slug, name=excluded.name, numeric=excluded.numeric, "
            "rank=excluded.rank, score=excluded.score, free=excluded.free, voa=excluded.voa, eta=excluded.eta, "
            "evisa=excluded.evisa, required=excluded.required, noadm=excluded.noadm, codes=excluded.codes;"
        )
    dest_meta = [{"iso2": d, "name": name_of(d), "slug": slug_of(name_of(d)),
                  "numeric": NUMERIC.get(d) or getattr(pycountry.countries.get(alpha_2=d), "numeric", None)} for d in dest]
    for k, v in {"dest": json.dumps(dest_meta, separators=(",", ":")), "updated_at": now, "source": SRC}.items():
        sql.append(f"INSERT INTO pi_meta VALUES ({q(k)},{q(v)}) ON CONFLICT(k) DO UPDATE SET v=excluded.v;")
    d1_file("\n".join(sql))
    top = sorted(stats, key=lambda x: -x["score"])[:3]
    print(f"stored {len(stats)} passports × {len(dest)} destinations at {now}; top: "
          + ", ".join(f"{name_of(t['iso2'])} {t['score']}" for t in top))
    bd = next((s for s in stats if s["iso2"] == "BD"), None)
    if bd:
        print(f"Bangladesh: rank {ranks['BD']}, score {bd['score']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
