"""Free player portraits for event squads.

Wikidata P18 first (cricketers only), then TheSportsDB headshots for names
Wikidata missed. Credits come from Wikimedia Commons imageinfo. Nothing is
fetched from ESPNcricinfo, Cricbuzz or the IPL/BCCI sites.

Writes a JSON object keyed by a normalised name. event_refresh.py stores that
object in D1 (`event_portraits`) on the weekly run.
"""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RETAIN = ROOT / "web/src/sites/ninetymins/events/retentions.ts"
UA = "NinetyMinsEventPages/1.0 (https://ninetymins.com; portraits cache)"
ROLE = (
    ("keeper", "Keeper"),
    ("wicket", "Keeper"),
    ("all-round", "All-rounder"),
    ("all round", "All-rounder"),
    ("bowl", "Bowler"),
    ("batter", "Batter"),
    ("batsman", "Batter"),
)


def names() -> list[str]:
    text = RETAIN.read_text(encoding="utf-8")
    found = []
    for raw in re.findall(r'list\("([^"]+)"\)', text):
        for part in raw.split(","):
            name = re.sub(r"\*", "", part)
            name = re.sub(r"\(T\)", "", name)
            name = re.sub(r"\s+", " ", name).strip()
            if name:
                found.append(name)
    return list(dict.fromkeys(found))


def norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json, application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()


def role_of(label: str) -> str | None:
    low = label.lower()
    for needle, role in ROLE:
        if needle in low:
            return role
    return None


def wikidata(players: list[str]) -> dict[str, dict]:
    values = " ".join(f'"{n}"@en' for n in players)
    query = f"""
SELECT ?name ?image ?posLabel WHERE {{
  VALUES ?name {{ {values} }}
  ?player wdt:P106 wd:Q12299841 ; rdfs:label ?name .
  OPTIONAL {{ ?player wdt:P18 ?image }}
  OPTIONAL {{ ?player wdt:P413 ?pos . ?pos rdfs:label ?posLabel FILTER(LANG(?posLabel) = "en") }}
}}
"""
    url = "https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(query)
    data = json.loads(get(url))
    out: dict[str, dict] = {}
    for row in data.get("results", {}).get("bindings", []):
        name = row["name"]["value"]
        key = norm(name)
        slot = out.setdefault(key, {"name": name, "source": "wikidata"})
        image = row.get("image", {}).get("value")
        if image and "thumb" not in slot:
            slot["file"] = urllib.parse.unquote(image.rsplit("/", 1)[-1])
        pos = row.get("posLabel", {}).get("value")
        if pos:
            mapped = role_of(pos)
            if mapped and "role" not in slot:
                slot["role"] = mapped
    return out


def credits(files: list[str]) -> dict[str, dict]:
    found = {}
    for i in range(0, len(files), 40):
        chunk = files[i:i + 40]
        titles = "|".join("File:" + f for f in chunk)
        url = (
            "https://commons.wikimedia.org/w/api.php?action=query&format=json"
            "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=160&titles="
            + urllib.parse.quote(titles)
        )
        data = json.loads(get(url))
        for page in (data.get("query") or {}).get("pages", {}).values():
            info = (page.get("imageinfo") or [None])[0]
            if not info or not info.get("thumburl"):
                continue
            meta = info.get("extmetadata") or {}
            artist = re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", "") or "")
            artist = re.sub(r"\s+", " ", artist).strip()[:180]
            license_name = (meta.get("LicenseShortName", {}).get("value") or "").strip()
            title = (page.get("title") or "").removeprefix("File:")
            found[title] = {
                "thumb": info["thumburl"],
                "width": int(info.get("thumbwidth") or 160),
                "height": int(info.get("thumbheight") or 160),
                "author": artist or "Wikimedia Commons",
                "license": license_name or "see Commons",
            }
        time.sleep(0.4)
    return found


def thesportsdb(missing: list[str], into: dict[str, dict]) -> None:
    """Secondary headshots. At most 24 lookups, and only hosts TheSportsDB itself."""
    for name in missing[:24]:
        url = "https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=" + urllib.parse.quote(name)
        try:
            data = json.loads(get(url))
        except Exception:
            continue
        for player in data.get("player") or []:
            if str(player.get("strSport") or "").lower() != "cricket":
                continue
            if norm(player.get("strPlayer") or "") != norm(name):
                continue
            thumb = player.get("strCutout") or player.get("strThumb") or ""
            host = urllib.parse.urlparse(thumb).netloc
            if not thumb or "thesportsdb.com" not in host:
                continue
            if any(bad in thumb.lower() for bad in ("espn", "cricbuzz", "iplt20", "bcci")):
                continue
            into[norm(name)] = {
                "name": name,
                "source": "thesportsdb",
                "thumb": thumb,
                "width": 160,
                "height": 160,
                "author": "TheSportsDB",
                "license": "TheSportsDB player image",
                **({"role": into.get(norm(name), {}).get("role")} if into.get(norm(name), {}).get("role") else {}),
            }
            break
        time.sleep(1.2)


def build() -> dict:
    players = names()
    rows = wikidata(players)
    files = [row["file"] for row in rows.values() if row.get("file")]
    info = credits(files)
    out = {}
    for key, row in rows.items():
        face = {"name": row["name"], "source": "wikidata"}
        if row.get("role"):
            face["role"] = row["role"]
        meta = info.get(row.get("file", ""))
        file_low = urllib.parse.unquote(row.get("file", "")).lower().replace("_", " ")
        tokens = row["name"].split()
        first = tokens[0].lower().strip(".")
        last = tokens[-1].lower().strip(".")
        named = first in file_low or (len(first) <= 3 and last in file_low)
        banned = ("family", "john dunlop", "world cup winning", "c1888")
        if meta and named and not any(b in file_low for b in banned):
            face.update(meta)
        if face.get("thumb") or face.get("role"):
            out[key] = face
    missing = [n for n in players if not out.get(norm(n), {}).get("thumb")]
    thesportsdb(missing, out)
    return out


if __name__ == "__main__":
    import sys
    payload = build()
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if dest:
        dest.write_text(text, encoding="utf-8")
        print(f"wrote {dest} ({len(payload)} players)")
    else:
        print(text)
