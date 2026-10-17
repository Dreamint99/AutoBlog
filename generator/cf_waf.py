"""Cloudflare WAF custom rule on every network zone: block vulnerability scanners and PHP/WordPress
probes (these Next/Worker sites have no PHP or wp-* paths). Verified bots (Googlebot, Bingbot,
GPTBot, Applebot…) are excluded by `not cf.client.bot`, and the sites' own API sub-requests
(empty user agent on /v1/*) are not touched. Idempotent: replaces only its own rule.

Usage (CI, needs CLOUDFLARE_API_TOKEN with Zone WAF edit): python cf_waf.py [--dry]
"""
import json
import os
import sys

import requests

ZONES = ["countly.net", "visapoint.net", "infkey.com", "gccguide.com", "ninetymins.com", "coloursofbangladesh.com"]
REF = "autoblog-block-scanners"
EXPR = (
    '(not cf.client.bot) and ('
    'ends_with(http.request.uri.path, ".php") or starts_with(http.request.uri.path, "/wp-") or '
    'http.request.uri.path contains "/.env" or http.request.uri.path contains "/.git" or '
    'http.request.uri.path contains "/cgi-bin" or '
    'http.user_agent contains "l9scan" or http.user_agent contains "zgrab" or '
    'http.user_agent contains "masscan" or http.user_agent contains "Nmap Scripting" or '
    'lower(http.user_agent) contains "sqlmap" or lower(http.user_agent) contains "nikto")'
)
API = "https://api.cloudflare.com/client/v4"


def main():
    dry = "--dry" in sys.argv
    h = {"Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}", "Content-Type": "application/json"}
    rule = {"ref": REF, "description": "AutoBlog: block scanners and PHP/WP probes (verified bots exempt)",
            "expression": EXPR, "action": "block", "enabled": True}
    for name in ZONES:
        z = requests.get(f"{API}/zones", params={"name": name}, headers=h, timeout=60).json()
        if not z.get("result"):
            print(name, "zone not visible to token:", z.get("errors"))
            continue
        zid = z["result"][0]["id"]
        url = f"{API}/zones/{zid}/rulesets/phases/http_request_firewall_custom/entrypoint"
        cur = requests.get(url, headers=h, timeout=60)
        keep = []
        if cur.ok:
            keep = [{k: r[k] for k in ("id", "ref", "description", "expression", "action", "enabled", "action_parameters") if k in r}
                    for r in cur.json()["result"].get("rules", []) if r.get("ref") != REF]
        elif cur.status_code != 404:
            print(name, "read failed", cur.status_code, cur.text[:200])
            continue
        if dry:
            print(name, "would set", len(keep) + 1, "rules")
            continue
        r = requests.put(url, headers=h, data=json.dumps({"rules": keep + [rule]}), timeout=60)
        print(name, r.status_code, "ok" if r.ok else r.text[:300])


if __name__ == "__main__":
    main()
