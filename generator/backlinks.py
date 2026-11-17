"""Weekly backlink + mention monitor for the network sites (white-hat link building tracker).

Writes:
  data/backlinks_<site>.json   referring links Bing knows about (source URL, target, anchor) + first_seen
  data/mentions.json           news mentions of each brand (Google News RSS) + first_seen
  data/link_report.md          this week: new / lost referring domains, new mentions without a link
The workflow posts link_report.md as a GitHub issue so the owner gets it by email.

Bing Webmaster API (key: BING_WEBMASTER_API_KEY): GetLinkCounts → target pages with inbound links,
GetUrlLinks → the linking pages for one target. Google's own links report has no API.
"""
import json
import os
import re
import sys
import time
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone

import requests

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
API = "https://ssl.bing.com/webmaster/api.svc/json/"
UA = {"user-agent": "Mozilla/5.0 (compatible; NetworkLinkMonitor/1.0)"}
SITES = {  # id → (Bing site URL, own hosts, news queries)
    "probashiinfo": ("https://probashiinfo.com/", ["probashiinfo.com"], ['"probashiinfo"', '"প্রবাসী ইনফো"']),
    "walvi": ("https://visapoint.net/", ["visapoint.net"], ['"visapoint.net"']),
    "countly": ("https://countly.net/", ["countly.net"], ['"countly.net"']),
    "gccguide": ("https://gccguide.com/", ["gccguide.com"], ['"gccguide"', '"gccguide.com"']),
    "infkey": ("https://infkey.com/", ["infkey.com"], ['"infkey"']),
    "ninetymins": ("https://ninetymins.com/", ["ninetymins.com"], ['"ninetymins"']),
    "cob": ("https://coloursofbangladesh.com/", ["coloursofbangladesh.com"], ['"Colours of Bangladesh"', '"কালারস অব বাংলাদেশ"']),
    "aiu": ("https://aiuniversitybd.com/", ["aiuniversitybd.com"], ['"aiuniversitybd"', '"এআই ইউনিভার্সিটি"']),
}
# Our own properties: links between them are not "earned" backlinks.
OWN = {"probashiinfo.com", "visapoint.net", "countly.net", "gccguide.com", "infkey.com", "ninetymins.com",
       "coloursofbangladesh.com", "aiuniversitybd.com", "dreamithq.com", "dreamintcs.com", "qount.net", "findsoul.app",
       "probashibondu.online", "mydreamit.dev"}
MAX_TARGETS = 40  # target pages to expand per site per run (Bing API quota is generous but not unlimited)


def host(u: str) -> str:
    h = (urllib.parse.urlsplit(u).hostname or "").lower()
    return h[4:] if h.startswith("www.") else h


def own(h: str) -> bool:
    return any(h == d or h.endswith("." + d) for d in OWN)


def bing(method: str, key: str, **params):
    for attempt in range(3):
        try:
            r = requests.get(API + method, params={**params, "apikey": key}, timeout=60)
            if r.status_code == 200:
                return r.json().get("d") or {}
            print(f"  bing {method} HTTP {r.status_code}: {r.text[:160]}")
        except Exception as e:  # network hiccup
            print(f"  bing {method} error: {e}")
        time.sleep(3 * (attempt + 1))
    return {}


def bing_links(site_url: str, key: str) -> list:
    targets = []
    for page in range(20):
        d = bing("GetLinkCounts", key, siteUrl=site_url, page=page)
        if page == 0:
            print(f"  {site_url} GetLinkCounts → keys {list(d)[:6]} pages {d.get('TotalPages')} first {str(d)[:200]}")
        targets += [(x.get("Url"), int(x.get("Count") or 0)) for x in d.get("Links") or [] if x.get("Url")]
        if page + 1 >= int(d.get("TotalPages") or 0):
            break
    targets.sort(key=lambda t: -t[1])
    out = []
    for target, _n in targets[:MAX_TARGETS]:
        for page in range(5):
            d = bing("GetUrlLinks", key, siteUrl=site_url, link=target, page=page)
            for x in d.get("Details") or []:
                if x.get("Url"):
                    out.append({"source": x["Url"], "target": target, "anchor": (x.get("AnchorText") or "").strip()[:120]})
            if page + 1 >= int(d.get("TotalPages") or 0):
                break
    return out


def news(query: str) -> list:
    q = urllib.parse.quote(query)
    items = []
    for hl, gl, ceid in (("en", "US", "US:en"), ("bn", "BD", "BD:bn")):
        try:
            r = requests.get(f"https://news.google.com/rss/search?q={q}&hl={hl}&gl={gl}&ceid={ceid}", headers=UA, timeout=30)
            root = ET.fromstring(r.content)
        except Exception as e:
            print(f"  news {query} {hl}: {e}")
            continue
        for it in root.iter("item"):
            items.append({
                "title": (it.findtext("title") or "").strip(),
                "link": (it.findtext("link") or "").strip(),
                "source": (it.findtext("source") or "").strip(),
                "date": (it.findtext("pubDate") or "").strip(),
            })
    return items


def load(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def main():
    key = os.environ.get("BING_WEBMASTER_API_KEY", "")
    today = date.today().isoformat()
    os.makedirs(DATA, exist_ok=True)
    lines = [f"# Backlink & mention report — {today}", "",
             "Earned links only (links between our own sites are left out). Source: Bing Webmaster API + Google News.", ""]
    totals = []
    for sid, (site_url, hosts, queries) in SITES.items():
        path = os.path.join(DATA, f"backlinks_{sid}.json")
        prev = load(path, {"links": [], "domains": {}})
        prev_domains = prev.get("domains", {})
        links = bing_links(site_url, key) if key else []
        if key and not links and prev.get("links"):
            print(f"{sid}: Bing returned nothing — keeping last week's data")
            links = prev["links"]
        seen = {(l["source"], l["target"]) for l in prev.get("links", [])}
        first = {(l["source"], l["target"]): l.get("first_seen", today) for l in prev.get("links", [])}
        for l in links:
            l["first_seen"] = first.get((l["source"], l["target"]), today)
        earned = [l for l in links if not own(host(l["source"]))]
        domains = {}
        for l in earned:
            h = host(l["source"])
            domains.setdefault(h, {"links": 0, "first_seen": prev_domains.get(h, {}).get("first_seen", today)})
            domains[h]["links"] += 1
        new_d = sorted(h for h in domains if h not in prev_domains) if prev_domains else []
        lost_d = sorted(h for h in prev_domains if h not in domains) if links else []
        json.dump({"updated": today, "links": links, "domains": domains}, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        totals.append((sid, len(domains), len(earned), len(new_d), len(lost_d)))
        lines.append(f"## {site_url}")
        lines.append(f"- Referring domains: **{len(domains)}** ({len(earned)} links)" + (f" · new this week: **{len(new_d)}**" if new_d else "") + (f" · lost: {len(lost_d)}" if lost_d else ""))
        for h in new_d[:15]:
            ex = next(l for l in earned if host(l["source"]) == h)
            lines.append(f"  - 🆕 {h} → {ex['target']} (anchor: “{ex['anchor'] or '—'}”) {ex['source']}")
        for h in lost_d[:10]:
            lines.append(f"  - ❌ lost {h}")
        lines.append("")

    # Mentions (unlinked mentions are the easiest links to win: ask the author to add the link)
    mpath = os.path.join(DATA, "mentions.json")
    known = load(mpath, {})
    lines.append("## News mentions (new this week)")
    any_new = False
    for sid, (site_url, hosts, queries) in SITES.items():
        bucket = known.setdefault(sid, {})
        for q in queries:
            for it in news(q):
                k = it["title"] + "|" + it["source"]
                if k in bucket:
                    continue
                bucket[k] = {**it, "first_seen": today, "query": q}
                if known.get("_init"):
                    any_new = True
                    lines.append(f"- [{sid}] {it['title']} — {it['source']} ({it['date'][:16]}) {it['link']}")
    if not known.get("_init"):
        lines.append("- First run: existing mentions recorded as the baseline; new ones are listed from next week.")
        known["_init"] = today
    elif not any_new:
        lines.append("- None this week.")
    json.dump(known, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    lines += ["", "## Totals", "| Site | Referring domains | Links | New | Lost |", "|---|---|---|---|---|"]
    lines += [f"| {t[0]} | {t[1]} | {t[2]} | {t[3]} | {t[4]} |" for t in totals]
    if not key:
        lines += ["", "⚠️ BING_WEBMASTER_API_KEY missing — backlink data not refreshed."]
    lines += ["", "What to do: for a new mention without a link, email the author a short thanks and ask for a source link. "
              "Never buy links or join link schemes."]
    open(os.path.join(DATA, "link_report.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
