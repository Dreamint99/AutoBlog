"""Push network-analytics snapshots to Workers KV for the Pulse dashboard.

Runs on this PC every 15 min (Windows task "AutoBlog-Pulse-Push"). The Pulse
worker (pulse.countly.net) only reads KV, so the dashboard stays reachable from
mobile even when this PC is off — data just ages until the next push.

Auth: wrangler's OAuth token. The access token expires, so we shell out to
`wrangler whoami` first — wrangler refreshes and persists the token, then we
read it back from its config file.
"""
import datetime as dt
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import modules.net_analytics as na

ACCOUNT = "10c278732f6e3c0e221ea04d6782bd8c"
NS_ID = "3987a5253d994eea89caaef8a80b724b"
ADSTERRA_API = "https://api3.adsterratools.com/publisher"


def _adsterra_key() -> str:
    """ADSTERRA_API_KEY from generator/.env (gitignored)."""
    env = Path(__file__).parent / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("ADSTERRA_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"')
    return ""


def adsterra_snapshot(days: int) -> dict | None:
    """Ad earnings per domain for the last `days` days (Adsterra counts whole days)."""
    import requests
    key = _adsterra_key()
    if not key:
        return None
    h = {"X-API-Key": key, "Accept": "application/json"}
    today = dt.date.today()
    q = {"start_date": (today - dt.timedelta(days=max(days - 1, 0))).isoformat(),
         "finish_date": today.isoformat(), "group_by": "domain"}
    try:
        names = {d["id"]: d["title"] for d in
                 requests.get(f"{ADSTERRA_API}/domains.json", headers=h, timeout=30).json()["items"]}
        rows = requests.get(f"{ADSTERRA_API}/stats.json", headers=h, params=q, timeout=30).json()["items"]
    except Exception as e:
        print("  adsterra: FAILED", str(e)[:120])
        return None
    doms = sorted(({"domain": names.get(r["domain"], str(r["domain"])),
                    "revenue": round(r["revenue"], 3), "impressions": r["impression"],
                    "clicks": r["clicks"], "cpm": r["cpm"]} for r in rows),
                  key=lambda d: -d["revenue"])
    total = {k: round(sum(d[k] for d in doms), 3) for k in ("revenue", "impressions", "clicks")}
    return {"total": total, "domains": doms}
WEB_DIR = Path(__file__).parent.parent / "web"


def refresh_token():
    """`wrangler whoami` makes an API call, which forces wrangler to refresh an
    expired OAuth token and write it back to its config file.

    On Windows, subprocess timeout only kills the direct child (cmd.exe from
    npx.cmd); the orphaned node.exe keeps the pipes open and communicate()
    blocks forever — so kill the whole tree with taskkill on timeout.
    """
    for npx in ("npx.cmd", "npx"):
        try:
            p = subprocess.Popen([npx, "wrangler", "whoami"], cwd=WEB_DIR,
                                 stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                 stderr=subprocess.STDOUT, text=True,
                                 encoding="utf-8", errors="replace")
        except FileNotFoundError:
            continue
        try:
            out, _ = p.communicate(timeout=120)
            if "logged in" in (out or ""):
                return True
        except subprocess.TimeoutExpired:
            subprocess.run(["taskkill", "/T", "/F", "/PID", str(p.pid)],
                           capture_output=True, timeout=30)
            return False
        except Exception:
            return False
    return False


def main():
    import requests

    if not refresh_token():
        print("WARN: wrangler whoami failed; trying stored token anyway")

    # Health checks are range-independent — do them once per site, not 5x.
    # (setdefault(d, f(d)) evaluates f eagerly, so guard with an explicit `in`.)
    hcache: dict = {}
    orig_health = na._health

    def cached_health(d):
        if d not in hcache:
            hcache[d] = orig_health(d)
        return hcache[d]
    na._health = cached_health

    ranges = {}
    for rng in na.RANGES:
        try:
            snap = na.network_snapshot(rng)
            # A range where EVERY site errored (e.g. GraphQL outage/rate limit)
            # would overwrite good data with zeros — treat it as failed instead.
            if all(s.get("error") for s in snap["sites"]):
                print(f"  {rng}: all sites errored — skipping")
                continue
            ads = adsterra_snapshot(na.RANGES[rng][0])
            if ads:
                snap["ads"] = ads
            ranges[rng] = snap
            print(f"  {rng}: uniques={snap['total']['uniques']}"
                  + (f" ads=${ads['total']['revenue']}" if ads else ""))
        except Exception as e:
            print(f"  {rng}: FAILED {str(e)[:150]}")
    if not ranges:
        sys.exit("no snapshot produced — aborting (keeping last KV value)")

    url = (f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}"
           f"/storage/kv/namespaces/{NS_ID}/values/pulse:all")
    headers = {"Authorization": f"Bearer {na._token()}"}

    # Merge over the previous payload so a failed/skipped range keeps its
    # last-good snapshot instead of vanishing from the dashboard.
    if len(ranges) < len(na.RANGES):
        try:
            prev = requests.get(url, headers=headers, timeout=30).json()
            for k, v in (prev.get("ranges") or {}).items():
                ranges.setdefault(k, v)
        except Exception:
            pass

    payload = {"updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
               "ranges": ranges}
    r = requests.put(url, headers=headers,
                     data=json.dumps(payload).encode(), timeout=60)
    print("KV put:", r.status_code, r.text[:120])
    if r.status_code != 200:
        sys.exit(1)


if __name__ == "__main__":
    main()
