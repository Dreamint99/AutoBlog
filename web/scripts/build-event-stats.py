#!/usr/bin/env python3
"""Derive competition stats from Cricsheet JSON zips (ODC-By).

Reads ball-by-ball files, writes a compact JSON the event hubs import.
Does not copy Cricsheet's match files into the repo.

Usage: python web/scripts/build-event-stats.py /tmp/cricsheet
"""
from __future__ import annotations

import json
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

LEAGUES = {
    "ipl": ("ipl_json.zip", "Indian Premier League"),
    "ilt20": ("ilt_json.zip", "International League T20"),
    "bbl": ("bbl_json.zip", "Big Bash League"),
    "sa20": ("sat_json.zip", "SA20"),
    "psl": ("psl_json.zip", "Pakistan Super League"),
}

RETRIEVED = "2026-11-21"


def runs_of(innings: dict) -> int:
    total = 0
    for over in innings.get("overs") or []:
        for delivery in over.get("deliveries") or []:
            total += int((delivery.get("runs") or {}).get("total") or 0)
    return total


def load(path: Path) -> list[dict]:
    out = []
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            if not name.endswith(".json"):
                continue
            try:
                doc = json.loads(z.read(name))
            except json.JSONDecodeError:
                continue
            info = doc.get("info") or {}
            dates = info.get("dates") or []
            if not dates or not info.get("teams"):
                continue
            out.append(
                {
                    "date": dates[0],
                    "season": str(info.get("season") or dates[0][:4]),
                    "teams": list(info.get("teams") or []),
                    "venue": info.get("venue") or "",
                    "city": info.get("city") or "",
                    "toss": info.get("toss") or {},
                    "outcome": info.get("outcome") or {},
                    "innings": doc.get("innings") or [],
                }
            )
    out.sort(key=lambda m: m["date"])
    return out


def decided(m: dict) -> str | None:
    outcome = m["outcome"]
    if outcome.get("result") in {"no result", "tie", "draw", "abandoned"}:
        return None
    winner = outcome.get("winner")
    return winner if winner in m["teams"] else None


def clean_chase(m: dict) -> bool:
    """Two completed innings, a winner, and no rain or super-over method."""
    method = str(m["outcome"].get("method") or "")
    if method:
        return False
    if decided(m) is None:
        return False
    return len(m["innings"]) >= 2 and bool(m["innings"][0].get("overs")) and bool(m["innings"][1].get("overs"))


def rate(n: int, w: int) -> float | None:
    return round(w / n, 3) if n else None


def summarise(matches: list[dict], label: str, filename: str) -> dict:
    seasons: dict[str, list[dict]] = defaultdict(list)
    for m in matches:
        seasons[m["season"]].append(m)
    latest_key = max(seasons, key=lambda s: max(x["date"] for x in seasons[s]))
    latest = seasons[latest_key]

    def chase_toss(rows: list[dict]) -> dict:
        chase_n = chase_w = 0
        toss = {"bat": [0, 0], "field": [0, 0]}
        for m in rows:
            winner = decided(m)
            toss_winner = m["toss"].get("winner")
            decision = m["toss"].get("decision")
            if winner and decision in toss and toss_winner in m["teams"]:
                toss[decision][0] += 1
                if toss_winner == winner:
                    toss[decision][1] += 1
            if not clean_chase(m):
                continue
            chase_n += 1
            if m["innings"][1].get("team") == winner:
                chase_w += 1
        return {
            "chase": {"matches": chase_n, "wins": chase_w, "rate": rate(chase_n, chase_w)},
            "toss": {
                side: {"chosen": n, "wins": w, "rate": rate(n, w)}
                for side, (n, w) in toss.items()
            },
        }

    teams: dict[str, dict] = {}
    for m in latest:
        winner = decided(m)
        for name in m["teams"]:
            row = teams.setdefault(name, {"name": name, "p": 0, "w": 0, "l": 0, "nr": 0, "results": []})
            row["p"] += 1
            if winner is None:
                row["nr"] += 1
                row["results"].append("N")
            elif winner == name:
                row["w"] += 1
                row["results"].append("W")
            else:
                row["l"] += 1
                row["results"].append("L")
    team_rows = []
    for row in teams.values():
        team_rows.append({**{k: row[k] for k in ("name", "p", "w", "l", "nr")}, "form": "".join(row["results"][-5:])})
    team_rows.sort(key=lambda r: (-r["w"], -r["p"], r["name"]))

    venues: dict[str, dict] = {}
    for m in latest:
        key = m["venue"] or "Unknown venue"
        v = venues.setdefault(key, {"name": key, "city": m["city"], "matches": 0, "firstRuns": 0, "firstN": 0, "chaseN": 0, "chaseW": 0})
        v["matches"] += 1
        if m["city"]:
            v["city"] = m["city"]
        if m["innings"] and m["innings"][0].get("overs"):
            v["firstRuns"] += runs_of(m["innings"][0])
            v["firstN"] += 1
        if clean_chase(m):
            v["chaseN"] += 1
            if m["innings"][1].get("team") == decided(m):
                v["chaseW"] += 1
    venue_rows = []
    for v in venues.values():
        venue_rows.append(
            {
                "name": v["name"],
                "city": v["city"],
                "matches": v["matches"],
                "firstInningsAvg": round(v["firstRuns"] / v["firstN"]) if v["firstN"] else None,
                "chaseMatches": v["chaseN"],
                "chaseWins": v["chaseW"],
                "chaseRate": rate(v["chaseN"], v["chaseW"]),
            }
        )
    venue_rows.sort(key=lambda r: (-r["matches"], r["name"]))

    h2h: dict[tuple[str, str], list[int]] = {}
    for m in latest:
        winner = decided(m)
        if winner is None or len(m["teams"]) != 2:
            continue
        a, b = sorted(m["teams"])
        cell = h2h.setdefault((a, b), [0, 0, 0])
        cell[0] += 1
        if winner == a:
            cell[1] += 1
        elif winner == b:
            cell[2] += 1
    h2h_rows = [{"a": a, "b": b, "matches": n, "aWins": aw, "bWins": bw} for (a, b), (n, aw, bw) in sorted(h2h.items())]

    dates = [m["date"] for m in matches]
    return {
        "label": label,
        "file": filename,
        "license": "Open Data Commons Attribution License (ODC-By) v1.0",
        "source": "https://cricsheet.org/",
        "retrieved": RETRIEVED,
        "matches": len(matches),
        "from": dates[0] if dates else None,
        "to": dates[-1] if dates else None,
        "all": chase_toss(matches),
        "latest": {
            "season": latest_key,
            "matches": len(latest),
            "from": latest[0]["date"],
            "to": latest[-1]["date"],
            "teams": team_rows,
            "venues": venue_rows,
            "h2h": h2h_rows,
            **chase_toss(latest),
        },
        "notes": [
            "Win rates use matches with a named winner. No-results, ties and draws are counted separately and left out of the rate.",
            "Chase rate uses matches with two innings of balls and no method tag (rain rule or super over are excluded).",
            "First-innings average is the mean of ball totals in the first innings, including extras.",
            "Team names are the names in the Cricsheet file for that season.",
        ],
    }


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/cricsheet")
    out = {}
    for key, (filename, label) in LEAGUES.items():
        path = root / filename
        if not path.exists():
            print(f"missing {path}", file=sys.stderr)
            return 1
        matches = load(path)
        out[key] = summarise(matches, label, filename)
        latest = out[key]["latest"]
        print(f"{key}: {out[key]['matches']} matches, latest {latest['season']} ({latest['matches']})")
    dest = Path(__file__).resolve().parents[1] / "src/sites/ninetymins/events/stats.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {dest} ({dest.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
