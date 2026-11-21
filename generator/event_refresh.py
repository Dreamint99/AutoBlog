"""Refresh NinetyMins event hubs.

Every run: read the cricket feed already stored in D1 (`cricapi_current` — no extra
CricAPI call) and, if the matches for an event hub changed, save a per-slug
lastmod and ping IndexNow.

With FULL=1 (weekly): re-download Cricsheet and store derived stats in D1
(`nm_feed` key `event_stats`). The site prefers that row and falls back to the
JSON shipped in the repo.

Squads, auction results and broadcasters are not fetched. Due items are printed
from web/src/sites/ninetymins/events/manual.ts.

Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID. FULL=1 for Cricsheet.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = "autoblog-content"
INDEXNOW_KEY = os.getenv("INDEXNOW_KEY", "7cb730425493bd6250188aee25110d83")
ZIPS = {
    "ipl_json.zip": "https://cricsheet.org/downloads/ipl_json.zip",
    "ilt_json.zip": "https://cricsheet.org/downloads/ilt_json.zip",
    "bbl_json.zip": "https://cricsheet.org/downloads/bbl_json.zip",
    "sat_json.zip": "https://cricsheet.org/downloads/sat_json.zip",
    "psl_json.zip": "https://cricsheet.org/downloads/psl_json.zip",
}


def log(msg: str) -> None:
    print(msg, flush=True)


def wrangler(*args: str, input_sql: str | None = None) -> str:
    cmd = ["wrangler", "d1", "execute", DB, "--remote", "--json", *args]
    r = subprocess.run(cmd, input=input_sql, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout)[-800:])
    return r.stdout


def d1_query(sql: str):
    raw = wrangler("--command", sql)
    data = json.loads(raw)
    if isinstance(data, list) and data and isinstance(data[0], dict):
        return data[0].get("results") or []
    return []


def d1_write(sql: str) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f:
        f.write(sql)
        path = f.name
    try:
        r = subprocess.run(["wrangler", "d1", "execute", DB, "--remote", "--file", path, "-y"], capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode != 0:
            raise RuntimeError((r.stderr or r.stdout)[-800:])
    finally:
        os.unlink(path)


def q(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def watch() -> dict:
    text = (ROOT / "web/src/sites/ninetymins/events/catalog.ts").read_text(encoding="utf-8")
    out = {}
    for m in re.finditer(r'slug: "([^"]+)"[\s\S]*?live: \{([^}]*)\}', text):
        slug, body = m.group(1), m.group(2)
        if 'kind: "ucl"' in body or "kind: \"none\"" in body:
            out[slug] = {"kind": "ucl" if "ucl" in body else "none"}
            continue
        series = re.findall(r'"([^"]+)"', body.split("teams:")[0])
        teams = re.findall(r'"([^"]+)"', body.split("teams:")[1]) if "teams:" in body else []
        series = [s for s in series if s != "cricket"]
        out[slug] = {"kind": "cricket", "series": series, "teams": teams}
    return out


def manual_due(today: str) -> list[str]:
    text = (ROOT / "web/src/sites/ninetymins/events/manual.ts").read_text(encoding="utf-8")
    lines = []
    for m in re.finditer(r'label: "([^"]+)".*?reviewAfter: "([^"]+)".*?detail: "([^"]+)"', text):
        label, when, detail = m.group(1), m.group(2), m.group(3)
        if when <= today:
            lines.append(f"MANUAL  {label}  (review after {when})  {detail}")
    return lines


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


def match_hub(m: dict, spec: dict) -> bool:
    if spec.get("kind") != "cricket":
        return False
    names = [norm(t) for t in (m.get("teams") or [])]
    series = f"{m.get('series') or ''} {m.get('name') or ''}".lower()
    if any(s.lower() in series for s in spec.get("series") or []):
        return True
    known = {norm(t) for t in spec.get("teams") or []}
    return bool(known) and any(n in known for n in names)


def digest_for(matches: list[dict]) -> str:
    rows = []
    for m in matches:
        rows.append("|".join([
            str(m.get("id") or ""),
            str(m.get("status") or ""),
            str(m.get("dateTimeGMT") or m.get("date") or ""),
            json.dumps(m.get("score") or [], separators=(",", ":")),
        ]))
    return hashlib.sha256("\n".join(sorted(rows)).encode()).hexdigest()[:16]


def ping(urls: list[str]) -> None:
    if not urls:
        return
    body = json.dumps({
        "host": "ninetymins.com",
        "key": INDEXNOW_KEY,
        "keyLocation": f"https://ninetymins.com/{INDEXNOW_KEY}.txt",
        "urlList": urls,
    }).encode()
    req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body, headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            log(f"IndexNow HTTP {r.status} for {len(urls)} url(s)")
    except Exception as e:
        log(f"IndexNow error: {e}")


def upsert(key: str, payload: str, now: str) -> None:
    d1_write(
        "CREATE TABLE IF NOT EXISTS nm_feed (key TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL);\n"
        f"INSERT INTO nm_feed (key, json, updated_at) VALUES ({q(key)}, {q(payload)}, {q(now)}) "
        "ON CONFLICT(key) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at;"
    )


def slugify(value: str) -> str:
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", (value or "").lower()))


def live_pass(hubs: dict, now: str) -> list[str]:
    rows = d1_query("SELECT json FROM nm_feed WHERE key = 'cricapi_current' LIMIT 1")
    if not rows:
        log("no cricapi_current row — live digest skipped")
        return []
    matches = json.loads(rows[0]["json"])
    prev_rows = d1_query("SELECT json FROM nm_feed WHERE key = 'event_live' LIMIT 1")
    prev = json.loads(prev_rows[0]["json"]) if prev_rows else {}
    lastmod = dict(prev.get("lastmod") or {})
    old_digest = dict(prev.get("digest") or {})
    digest = {}
    changed = []
    paths = []
    for slug, spec in hubs.items():
        if spec.get("kind") != "cricket":
            continue
        picked = [m for m in matches if isinstance(m, dict) and match_hub(m, spec)]
        digest[slug] = digest_for(picked)
        if digest[slug] != old_digest.get(slug):
            lastmod[slug] = now
            changed.append(slug)
            log(f"live change {slug}: {len(picked)} matches in the cricket feed")
        for m in picked:
            teams = [t for t in (m.get("teams") or []) if isinstance(t, str)]
            when = m.get("dateTimeGMT") or m.get("date")
            if len(teams) < 2 or not when or not m.get("venue"):
                continue
            path = f"/event/{slug}/match/{slugify('feed-' + str(m.get('id')))}"
            paths.append({"path": path, "lastmod": now if digest[slug] != old_digest.get(slug) else lastmod.get(path, now)})
            if digest[slug] != old_digest.get(slug):
                changed.append(path)
    upsert("event_live", json.dumps({"lastmod": lastmod, "digest": digest, "paths": paths}, separators=(",", ":")), now)
    return changed


def full_pass() -> bool:
    dest_dir = Path(tempfile.mkdtemp(prefix="cricsheet-"))
    for name, url in ZIPS.items():
        log(f"download {name}")
        urllib.request.urlretrieve(url, dest_dir / name)
    out = dest_dir / "stats.json"
    script = ROOT / "web/scripts/build-event-stats.py"
    r = subprocess.run([sys.executable, str(script), str(dest_dir), str(out)], capture_output=True, text=True)
    log(r.stdout.strip())
    if r.returncode != 0:
        log(r.stderr[-500:])
        return False
    payload = out.read_text(encoding="utf-8")
    prev = d1_query("SELECT json FROM nm_feed WHERE key = 'event_stats' LIMIT 1")
    same = bool(prev) and prev[0]["json"] == payload
    if same:
        log("Cricsheet stats unchanged")
        return False
    upsert("event_stats", payload, datetime.now(timezone.utc).isoformat())
    log(f"stored event_stats ({len(payload)} bytes)")
    return True


def football_pass(now: str) -> None:
    """One UCL fixture call per run, cached 12 hours. football-data.org first, API-Football only if that token is absent."""
    prev = d1_query("SELECT updated_at FROM nm_feed WHERE key = 'event_football' LIMIT 1")
    if prev:
        try:
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(prev[0]["updated_at"].replace("Z", "+00:00"))).total_seconds()
            if age < 12 * 3600:
                log("event_football still fresh")
                return
        except Exception:
            pass
    token = os.getenv("FOOTBALL_DATA_TOKEN", "").strip()
    key = os.getenv("API_FOOTBALL_KEY", "").strip()
    try:
        if token:
            req = urllib.request.Request("https://api.football-data.org/v4/competitions/CL/matches?status=SCHEDULED", headers={"X-Auth-Token": token})
            with urllib.request.urlopen(req, timeout=20) as r:
                payload = r.read().decode()
            upsert("event_football", payload, now)
            log("stored UCL fixtures from football-data.org")
            return
        if key:
            req = urllib.request.Request("https://v3.football.api-sports.io/fixtures?league=2&next=20", headers={"x-apisports-key": key})
            with urllib.request.urlopen(req, timeout=20) as r:
                payload = r.read().decode()
            upsert("event_football", payload, now)
            log("stored UCL fixtures from API-Football")
            return
        log("no FOOTBALL_DATA_TOKEN or API_FOOTBALL_KEY — UCL feed skipped")
    except Exception as e:
        log(f"football feed skipped: {e}")


def squad_pass(hubs: dict) -> None:
    """Weekly TheSportsDB squads, at most 12 teams, for the free public key."""
    stored: dict = {}
    used = 0
    for event, spec in hubs.items():
        for name in spec.get("teams") or []:
            if used >= 12:
                break
            used += 1
            url = "https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?t=" + urllib.parse.quote(name)
            try:
                with urllib.request.urlopen(url, timeout=20) as r:
                    data = json.loads(r.read().decode())
            except Exception as e:
                log(f"thesportsdb {name}: {e}")
                continue
            players = []
            for p in data.get("player") or []:
                if str(p.get("strSport") or "").lower() != "cricket":
                    continue
                if p.get("strPlayer"):
                    players.append(p["strPlayer"])
            if players:
                stored.setdefault(event, {})[slugify(name)] = players[:25]
                log(f"thesportsdb {event} {name}: {len(players)} cricket players")
            time_sleep()
        if used >= 12:
            break
    if stored:
        upsert("event_squads", json.dumps(stored, separators=(",", ":")), datetime.now(timezone.utc).isoformat())


def portraits_pass() -> None:
    dest = Path(tempfile.mkdtemp(prefix="portraits-")) / "portraits.json"
    script = ROOT / "generator/event_portraits.py"
    r = subprocess.run([sys.executable, str(script), str(dest)], capture_output=True, text=True)
    log(r.stdout.strip() or r.stderr[-300:])
    if r.returncode != 0 or not dest.exists():
        log("portraits skipped")
        return
    upsert("event_portraits", dest.read_text(encoding="utf-8"), datetime.now(timezone.utc).isoformat())
    log("stored event_portraits")


def time_sleep() -> None:
    import time
    time.sleep(2)


def main() -> int:
    if not os.getenv("CLOUDFLARE_API_TOKEN") or not os.getenv("CLOUDFLARE_ACCOUNT_ID"):
        log("CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID missing — skipping")
        return 0
    now = datetime.now(timezone.utc).isoformat()
    today = now[:10]
    hubs = watch()
    log(f"hubs {', '.join(sorted(hubs))}")
    for line in manual_due(today):
        log(line)
    changed = live_pass(hubs, now)
    stats_changed = False
    if os.getenv("FULL", "").lower() in {"1", "true", "yes"}:
        stats_changed = full_pass()
        squad_pass(hubs)
        portraits_pass()
        if stats_changed:
            changed = sorted(set(list(changed)) | {s for s, spec in hubs.items() if spec.get("kind") == "cricket"})
    football_pass(now)
    if changed:
        urls = []
        for item in changed:
            if str(item).startswith("/event/"):
                urls.append(f"https://ninetymins.com{item}")
            else:
                urls.append(f"https://ninetymins.com/event/{item}")
        urls.append("https://ninetymins.com/event")
        ping(list(dict.fromkeys(urls)))
    else:
        log("no event page change — IndexNow not called")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        log(f"event refresh failed: {e}")
        sys.exit(1)
