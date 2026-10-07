"""Network analytics for the 4 Cloudflare-hosted sites.

Data sources (all free):
  - Cloudflare GraphQL Analytics API (zone HTTP requests: uniques, pageviews,
    countries, top paths, referrers). Auth = the wrangler OAuth token already on
    this machine. Retention: 1-day groups ~1 year, 1-hour groups ~3 days.
  - Live health checks (site up, sitemap, robots) via plain HTTPS requests.

Everything is cached for CACHE_TTL seconds so the dashboard can poll freely.
"""
import concurrent.futures
import datetime as dt
import json
import re
import threading
import time

import requests

WRANGLER_CFG = r"C:\Users\kingm\AppData\Roaming\xdg.config\.wrangler\config\default.toml"
GQL = "https://api.cloudflare.com/client/v4/graphql"
API = "https://api.cloudflare.com/client/v4"

SITES = [
    {"id": "countly",    "domain": "countly.net"},
    {"id": "walvi",      "domain": "visapoint.net"},
    {"id": "infkey",     "domain": "infkey.com"},
    {"id": "ninetymins", "domain": "ninetymins.com"},
]

RANGES = {          # label -> (days back, use hourly groups?)
    "24h": (1, True),
    "7d":  (7, False),
    "14d": (14, False),
    "30d": (30, False),
    "1y":  (365, False),
}

_cache: dict = {}
_lock = threading.Lock()
CACHE_TTL = 300

_STATIC_RE = re.compile(r"^/(_next/|favicon|icon|apple-icon|robots\.txt|sitemap|.*\.(js|css|map|png|jpg|jpeg|webp|svg|ico|woff2?)$)")


def _token() -> str:
    m = re.search(r'oauth_token = "([^"]+)"', open(WRANGLER_CFG, encoding="utf-8").read())
    return m.group(1) if m else ""


def _gql(query: str) -> dict:
    r = requests.post(GQL, headers={"Authorization": f"Bearer {_token()}",
                                    "Content-Type": "application/json"},
                      json={"query": query}, timeout=45)
    d = r.json()
    if d.get("errors"):
        raise RuntimeError(str(d["errors"])[:300])
    return d["data"]


def _zone_ids() -> dict:
    """domain -> zoneTag (cached forever within process)."""
    key = "_zones"
    if key in _cache:
        return _cache[key]
    r = requests.get(f"{API}/zones?per_page=50",
                     headers={"Authorization": f"Bearer {_token()}"}, timeout=30)
    out = {z["name"]: z["id"] for z in r.json().get("result", [])}
    _cache[key] = out
    return out


# ── Per-zone metrics ───────────────────────────────────
def _series_and_totals(ztag: str, days: int, hourly: bool) -> dict:
    now = dt.datetime.now(dt.timezone.utc)
    if hourly:
        since = (now - dt.timedelta(hours=24)).strftime("%Y-%m-%dT%H:00:00Z")
        q = f'''{{ viewer {{ zones(filter:{{zoneTag:"{ztag}"}}) {{
              g: httpRequests1hGroups(limit:26, filter:{{datetime_gt:"{since}"}}, orderBy:[datetime_ASC]) {{
                dimensions{{datetime}} uniq{{uniques}} sum{{requests pageViews countryMap{{clientCountryName requests}}}} }} }} }} }}'''
    else:
        since = (now - dt.timedelta(days=days)).strftime("%Y-%m-%d")
        q = f'''{{ viewer {{ zones(filter:{{zoneTag:"{ztag}"}}) {{
              g: httpRequests1dGroups(limit:{days + 2}, filter:{{date_gt:"{since}"}}, orderBy:[date_ASC]) {{
                dimensions{{date}} uniq{{uniques}} sum{{requests pageViews countryMap{{clientCountryName requests}}}} }} }} }} }}'''
    groups = _gql(q)["viewer"]["zones"][0]["g"]
    series, countries = [], {}
    tot_u = tot_p = tot_r = 0
    for g in groups:
        label = g["dimensions"].get("date") or g["dimensions"].get("datetime", "")[:16]
        u, p, r_ = g["uniq"]["uniques"], g["sum"]["pageViews"], g["sum"]["requests"]
        series.append({"t": label, "uniques": u, "pageviews": p, "requests": r_})
        tot_u += u; tot_p += p; tot_r += r_
        for c in g["sum"].get("countryMap") or []:
            countries[c["clientCountryName"]] = countries.get(c["clientCountryName"], 0) + c["requests"]
    top_c = sorted(countries.items(), key=lambda x: -x[1])[:8]
    return {"series": series, "uniques": tot_u, "pageviews": tot_p, "requests": tot_r,
            "countries": [{"country": k, "requests": v} for k, v in top_c]}


def _top_paths(ztag: str, domain: str, days: int) -> list:
    """Top article paths (static assets filtered). Free-plan adaptive queries are
    limited to a 1-day window, so this is always 'top pages in the last 24h'."""
    since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=23)).strftime("%Y-%m-%dT%H:%M:00Z")
    q = f'''{{ viewer {{ zones(filter:{{zoneTag:"{ztag}"}}) {{
          p: httpRequestsAdaptiveGroups(limit:40, filter:{{datetime_gt:"{since}", requestSource:"eyeball",
             edgeResponseStatus:200, clientRequestHTTPHost:"{domain}"}}, orderBy:[count_DESC]) {{
            count dimensions{{clientRequestPath}} }} }} }} }}'''
    d = _gql(q)["viewer"]["zones"][0]
    paths = [{"path": g["dimensions"]["clientRequestPath"], "views": g["count"]}
             for g in d["p"] if not _STATIC_RE.match(g["dimensions"]["clientRequestPath"])][:12]
    # Referrer breakdown needs Cloudflare Web Analytics (RUM) — not the free zone
    # HTTP dataset. Left empty until RUM beacons are enabled per site.
    return paths, []


def _resolve_ip(domain: str) -> str:
    """Resolve via Google DoH — the local Windows resolver may hold a stale
    (pre-migration) answer for days after an NS flip."""
    try:
        r = requests.get(f"https://dns.google/resolve?name={domain}&type=A", timeout=10).json()
        for a in r.get("Answer", []):
            if a.get("type") == 1:
                return a["data"]
    except Exception:
        pass
    return ""


def _curl_status(domain: str, path: str, ip: str) -> int:
    """HTTPS status via curl --resolve (correct SNI even when bypassing local DNS)."""
    import subprocess
    cmd = ["curl", "-s", "-o", "NUL", "-w", "%{http_code}", "--max-time", "15",
           "-A", "Mozilla/5.0 (dashboard health)", f"https://{domain}{path}"]
    if ip:
        cmd[1:1] = ["--resolve", f"{domain}:443:{ip}"]
    try:
        return int(subprocess.run(cmd, capture_output=True, text=True, timeout=25).stdout.strip() or 0)
    except Exception:
        return 0


def _health(domain: str) -> dict:
    ip = _resolve_ip(domain)
    status = _curl_status(domain, "/", ip)
    return {
        "live": status == 200,
        "status": status,
        "sitemap": _curl_status(domain, "/sitemap.xml", ip) == 200,
        "robots": _curl_status(domain, "/robots.txt", ip) == 200,
    }


def _forecast(series: list) -> dict:
    """Naive next-7-days visitor guess from the recent trend (honest: it's a projection)."""
    pts = [s["uniques"] for s in series][-14:]
    if len(pts) < 3:
        return {"next7d": None, "trendPct": None}
    half = len(pts) // 2
    a, b = sum(pts[:half]) / max(half, 1), sum(pts[half:]) / max(len(pts) - half, 1)
    daily = b / max(len(pts) - half, 1) * (len(pts) - half) / max(len(pts) - half, 1)
    avg_recent = b / max((len(pts) - half), 1) if (len(pts) - half) else 0
    trend = ((b - a) / a * 100) if a > 0 else 0
    growth = 1 + max(min(trend / 100, 1.0), -0.6)  # clamp
    return {"next7d": int(avg_recent * 7 * growth), "trendPct": round(trend, 1)}


def site_snapshot(site: dict, rng: str) -> dict:
    days, hourly = RANGES.get(rng, (7, False))
    zones = _zone_ids()
    ztag = zones.get(site["domain"])
    snap = {"id": site["id"], "domain": site["domain"], "zone": bool(ztag)}
    if not ztag:
        snap.update({"error": "zone not on Cloudflare"})
        return snap
    try:
        core = _series_and_totals(ztag, days, hourly)
        snap.update(core)
        snap["forecast"] = _forecast(core["series"])
    except Exception as e:
        snap["error"] = str(e)[:200]
    try:
        paths, refs = _top_paths(ztag, site["domain"], days)
        snap["topPaths"], snap["referers"] = paths, refs
    except Exception:
        snap["topPaths"], snap["referers"] = [], []
    snap["health"] = _health(site["domain"])
    return snap


def network_snapshot(rng: str = "7d") -> dict:
    key = f"snap:{rng}"
    with _lock:
        hit = _cache.get(key)
        if hit and time.time() - hit[0] < CACHE_TTL:
            return hit[1]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        sites = list(ex.map(lambda s: site_snapshot(s, rng), SITES))
    total = {
        "uniques": sum(s.get("uniques", 0) for s in sites),
        "pageviews": sum(s.get("pageviews", 0) for s in sites),
        "requests": sum(s.get("requests", 0) for s in sites),
    }
    out = {"generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
           "range": rng, "total": total, "sites": sites,
           "notes": ["Figures = Cloudflare edge analytics (bots partially included).",
                     "24h view uses hourly data (kept ~3 days by Cloudflare).",
                     "Top pages/referrers come from sampled data (last ~3 days).",
                     "Forecast is a naive trend projection — a guess, not a promise."]}
    with _lock:
        _cache[key] = (time.time(), out)
    return out
