"""Cricket feed → D1 (one CricAPI call per run).

CricketData.org's free plan allows ~100 calls/day. Calling it from the Worker
spends one call per Cloudflare colo per cache window, which ran the quota out
within hours. Instead this script runs on a schedule (GitHub Actions, every 20
min = 72 calls/day), fetches `currentMatches` once and stores the raw `data`
array in D1 (`nm_feed`, key `cricapi_current`). The NinetyMins Worker reads it
from there — zero CricAPI calls from the site itself.

Env: CRICAPI_KEY, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID.
"""
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

import requests

DB = "autoblog-content"


def d1(sql: str) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f:
        f.write(sql)
        path = f.name
    try:
        r = subprocess.run(["wrangler", "d1", "execute", DB, "--remote", "--file", path, "-y"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode != 0:
            raise RuntimeError(r.stderr[-800:] or r.stdout[-800:])
    finally:
        os.unlink(path)


def q(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def main() -> int:
    key = os.getenv("CRICAPI_KEY", "").strip()
    if not key:
        print("CRICAPI_KEY not set — skipping")
        return 0
    r = requests.get("https://api.cricapi.com/v1/currentMatches",
                     params={"apikey": key, "offset": 0}, timeout=20)
    j = r.json()
    info = j.get("info") or {}
    print(f"cricapi status={j.get('status')} hits={info.get('hitsToday')}/{info.get('hitsLimit')}")
    if j.get("status") != "success" or not isinstance(j.get("data"), list):
        print(f"no update ({j.get('reason') or j.get('status')}) — keeping the last stored list")
        return 0
    payload = json.dumps(j["data"], separators=(",", ":"), ensure_ascii=False)
    now = datetime.now(timezone.utc).isoformat()
    d1("CREATE TABLE IF NOT EXISTS nm_feed (key TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL);\n"
       f"INSERT INTO nm_feed (key, json, updated_at) VALUES ('cricapi_current', {q(payload)}, {q(now)}) "
       "ON CONFLICT(key) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at;")
    print(f"stored {len(j['data'])} matches at {now}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
