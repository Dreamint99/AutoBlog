"""Flight-tracker reference data for probashiinfo.com/flight-tracker/ (snippet #16).

    python flight_data.py build [--src DIR]   # clone/parse VRS standing data -> data/flight_index.json
    python flight_data.py push                # POST data/flight_index.json to /wp-json/pa/v1/ft-data

Source: Virtual Radar Server "standing-data" (CC0, github.com/vradarserver/standing-data):
routes (callsign -> airports), airlines (ICAO <-> IATA, names), airports (code, name, city, lat/lon).
Live positions come from adsb.lol (ODbL) at request time — not stored here.
Kept: every route that touches Bangladesh, the airports those routes use plus a list of hubs, and
the IATA->ICAO airline map (so "EK582" resolves to callsign UAE582).
"""
import base64
import csv
import glob
import json
import os
import subprocess
import sys
import tempfile

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "data", "flight_index.json")
REPO = "https://github.com/vradarserver/standing-data.git"
# extra airports always kept (Gulf, Asia, Europe hubs that Bangladeshi travellers use)
HUBS = ("OTHH OMDB OMAA OMSJ OERK OEJN OEDF OEMA OKKK OOMS OBBI WMKK WSSS VTBS VTBD VHHH ZGGG ZSPD RJAA RKSI "
        "VIDP VABB VECC VOMM VOBL VOHS OPKC OPLA OPIS VCBI VRMM VNKT VQPR LTFM EGLL EGKK LFPG EDDF EHAM LIRF LIMC "
        "LEMD LPPT LGAV LROP LYBE LUKK LWSK KJFK KIAD CYYZ YSSY WIII RPLL VVTS LOWW EPWA LKPR LHBP").split()


def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        yield from csv.DictReader(f)


def build(src=None):
    tmp = None
    if not src:
        tmp = tempfile.mkdtemp()
        src = os.path.join(tmp, "sd")
        subprocess.run(["git", "clone", "-q", "--depth", "1", REPO, src], check=True)
    airports = {}
    for p in glob.glob(os.path.join(src, "airports", "schema-01", "*", "*.csv")):
        for r in read_csv(p):
            icao = (r.get("ICAO") or r.get("Code") or "").strip()
            if icao and r.get("IATA"):
                try:
                    airports[icao] = [r["IATA"], r["Name"], r.get("Location") or "", r.get("CountryISO2") or "",
                                      round(float(r["Latitude"]), 4), round(float(r["Longitude"]), 4)]
                except (ValueError, KeyError):
                    pass
    routes, used = [], set(HUBS)
    for p in glob.glob(os.path.join(src, "routes", "schema-01", "*", "*.csv")):
        for r in read_csv(p):
            codes = (r.get("AirportCodes") or "").split("-")
            if any(c.startswith("VG") for c in codes) and all(c in airports for c in codes):
                routes.append([r["Callsign"], "-".join(codes)])
                used.update(codes)
    airlines, iata2icao = {}, {}
    for r in read_csv(os.path.join(src, "airlines", "schema-01", "airlines.csv")):
        icao, iata = (r.get("ICAO") or "").strip(), (r.get("IATA") or "").strip()
        if len(icao) == 3:
            airlines[icao] = [iata, r.get("Name") or ""]
            if len(iata) == 2:
                iata2icao.setdefault(iata, []).append(icao)
    route_airlines = {cs[:3] for cs, _ in routes}
    data = {
        "ap": {k: airports[k] for k in sorted(used) if k in airports},
        "al": {k: v for k, v in airlines.items() if k in route_airlines},
        "iata": iata2icao,
        "rt": sorted(routes),
        "src": "VRS standing-data (CC0) · live: adsb.lol (ODbL)",
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"airports {len(data['ap'])}, airlines {len(data['al'])}, iata codes {len(iata2icao)}, BD routes {len(routes)}, "
          f"{os.path.getsize(OUT) // 1024} KB -> {OUT}")


def push():
    base = os.environ["PROBASHIINFO_WP_URL"].rstrip("/")
    auth = base64.b64encode(f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()).decode()
    data = json.load(open(OUT, encoding="utf-8"))
    r = requests.post(f"{base}/wp-json/pa/v1/ft-data", headers={"Authorization": f"Basic {auth}", "User-Agent": "AutoBlog/1.0"},
                      json=data, timeout=120)
    print("push", r.status_code, r.text[:200])
    r.raise_for_status()


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "build"
    if cmd == "build":
        build(sys.argv[sys.argv.index("--src") + 1] if "--src" in sys.argv else None)
    elif cmd == "push":
        push()
