"""Network dashboard data — every site's real numbers in one JSON, POSTed to the private
dashboard page on probashiinfo.com (/network-dashboard/, WordPress admins only).

    python network_stats.py collect   # print + POST
    python network_stats.py probe     # test what the tokens can read

Sources (all real, nothing estimated):
- Articles: Cloudflare D1 `autoblog-content` (wrangler), WordPress REST (probashiinfo),
  Supabase public counts for Probashi Bondhu (cards, approved stories).
- Uptime: a live HTTPS request to each domain (status + response time).
- Visitors: Cloudflare GraphQL analytics (needs CF_ANALYTICS_TOKEN: Account Analytics Read +
  Zone Analytics Read + Zone Read) and Vercel Web Analytics (needs VERCEL_TOKEN). Without a
  token that part is reported as "not connected", never guessed.
"""
import base64
import datetime as dt
import json
import os
import subprocess
import sys
import time

import requests

SITES = [  # id, domain, name, platform, content source
    ("countly", "countly.net", "Countly", "Cloudflare Workers", "d1"),
    ("ninetymins", "ninetymins.com", "NinetyMins", "Cloudflare Workers", "d1"),
    ("infkey", "infkey.com", "InfKey", "Cloudflare Workers", "d1"),
    ("walvi", "visapoint.net", "VisaPoint", "Cloudflare Workers", "d1"),
    ("gccguide", "gccguide.com", "GCCGuide", "Cloudflare Workers", "d1"),
    ("probashiinfo", "probashiinfo.com", "প্রবাসী ইনফো", "WordPress", "wp"),
    ("probashibondu", "www.probashibondu.online", "প্রবাসী বন্ধু", "Vercel", "pb"),
    ("dreamintcs", "dreamintcs.com", "Dream International", "Vercel", ""),
    ("dreamithq", "dreamithq.com", "DreamIT", "Cloudflare Pages", ""),
]
VERCEL = {"probashibondu": "prj_CAEYcxn0AfsqwAwiGPwhYHxznthD", "dreamintcs": "prj_D9jus2C46gD4XICaFdUQCFGhL6RI"}
VERCEL_TEAM = "team_hrxVAY08ctbwHvVkWH69QPUK"
PB = ("https://meihivdavgvhvmngjqrd.supabase.co/rest/v1", "sb_publishable_xEoCKQHdEHqTjPEeDqGJzg_DPBnBCKx")  # public key (client-side by design)
UA = {"User-Agent": "Mozilla/5.0 (network-dashboard uptime check)"}
NOW = dt.datetime.now(dt.timezone.utc)


def d1(sql):
    r = subprocess.run(["npx", "--yes", "wrangler@4", "d1", "execute", "autoblog-content", "--remote", "--json", "--command", sql],
                       capture_output=True, text=True, timeout=180, shell=os.name == "nt")
    out = r.stdout[r.stdout.find("["):]
    return json.loads(out)[0]["results"]


def articles_d1():
    rows = d1("SELECT site_id, COUNT(*) n, SUM(created_at >= datetime('now','-7 days')) w7, SUM(created_at >= datetime('now','-1 days')) d1, "
              "SUM(created_at >= datetime('now','-30 days')) m30, MAX(created_at) latest FROM articles WHERE status='published' GROUP BY site_id")
    daily = d1("SELECT site_id, substr(created_at,1,10) d, COUNT(*) n FROM articles WHERE status='published' AND created_at >= datetime('now','-30 days') GROUP BY site_id, d")
    out = {r["site_id"]: {"total": r["n"], "d1": r["d1"] or 0, "w7": r["w7"] or 0, "m30": r["m30"] or 0, "latest": r["latest"], "daily": {}} for r in rows}
    for r in daily:
        out.setdefault(r["site_id"], {"daily": {}})["daily"][r["d"]] = r["n"]
    return out


def articles_wp():
    base = os.environ.get("PROBASHIINFO_WP_URL", "").rstrip("/")
    if not base:
        return None
    auth = base64.b64encode(f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()).decode()
    h = {"Authorization": f"Basic {auth}", **UA}

    def total(path, **p):
        r = requests.get(f"{base}/wp-json/wp/v2/{path}", headers=h, params={"per_page": 1, **p}, timeout=60)
        return int(r.headers.get("X-WP-Total", 0)) if r.ok else None

    since = lambda days: (NOW - dt.timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S")
    latest = requests.get(f"{base}/wp-json/wp/v2/posts", headers=h, params={"per_page": 1, "_fields": "date_gmt,title,link"}, timeout=60).json()
    daily = {}
    posts = requests.get(f"{base}/wp-json/wp/v2/posts", headers=h, params={"per_page": 100, "after": since(30), "_fields": "date_gmt"}, timeout=60).json()
    for p in posts if isinstance(posts, list) else []:
        k = p["date_gmt"][:10]
        daily[k] = daily.get(k, 0) + 1
    return {"total": total("posts"), "d1": total("posts", after=since(1)), "w7": total("posts", after=since(7)), "m30": total("posts", after=since(30)),
            "latest": (latest[0]["date_gmt"] + "Z") if latest else None, "latest_title": (latest[0]["title"]["rendered"] if latest else ""),
            "pages": total("pages"), "comments_ok": total("comments", status="approve"), "comments_hold": total("comments", status="hold"), "daily": daily}


def probashi_bondhu():
    url, key = PB
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Prefer": "count=exact", "Range": "0-0"}

    def cnt(q):
        r = requests.head(f"{url}/{q}", headers=h, timeout=30)
        cr = r.headers.get("Content-Range", "")
        return int(cr.split("/")[-1]) if "/" in cr and cr.split("/")[-1].isdigit() else None

    w7 = (NOW - dt.timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S")
    return {"cards": cnt("pb_cards?select=id"), "cards_w7": cnt(f"pb_cards?select=id&created_at=gte.{w7}"), "stories": cnt("pb_stories?select=id&status=eq.approved")}


def uptime(domain):
    t = time.time()
    try:
        r = requests.get(f"https://{domain}/", headers=UA, timeout=25)
        return {"code": r.status_code, "ms": round((time.time() - t) * 1000), "ok": r.status_code < 400}
    except Exception as e:
        return {"code": 0, "ms": None, "ok": False, "err": str(e)[:80]}


def cf_visitors():
    tok, acc = os.environ.get("CF_ANALYTICS_TOKEN", ""), os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    if not tok:
        return None, "CF_ANALYTICS_TOKEN নেই"
    H = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
    zones = requests.get("https://api.cloudflare.com/client/v4/zones", headers=H, params={"per_page": 50}, timeout=60).json().get("result", [])
    if not zones:
        return None, "টোকেনে কোনো zone দেখা যাচ্ছে না (Zone Read অনুমতি দিন)"
    since = (NOW - dt.timedelta(days=30)).strftime("%Y-%m-%d")
    q = """query($z:String!,$d:Date!){viewer{zones(filter:{zoneTag:$z}){httpRequests1dGroups(limit:31,filter:{date_geq:$d},orderBy:[date_ASC]){dimensions{date} sum{requests pageViews threats bytes countryMap{clientCountryName requests}} uniq{uniques}}}}}"""
    out = {}
    for z in zones:
        j = requests.post("https://api.cloudflare.com/client/v4/graphql", headers=H, json={"query": q, "variables": {"z": z["id"], "d": since}}, timeout=60).json()
        try:
            g = j["data"]["viewer"]["zones"][0]["httpRequests1dGroups"]
        except Exception:
            out[z["name"]] = {"error": (j.get("errors") or [{}])[0].get("message", "no data")}
            continue
        days = {x["dimensions"]["date"]: {"uniques": x["uniq"]["uniques"], "pageviews": x["sum"]["pageViews"], "requests": x["sum"]["requests"]} for x in g}
        countries = {}
        for x in g[-7:]:
            for c in x["sum"].get("countryMap") or []:
                countries[c["clientCountryName"]] = countries.get(c["clientCountryName"], 0) + c["requests"]
        out[z["name"]] = {"days": days, "top_countries": sorted(countries.items(), key=lambda kv: -kv[1])[:6]}
    return out, ""


def vercel_visitors():
    tok = os.environ.get("VERCEL_TOKEN", "")
    if not tok:
        return None, "VERCEL_TOKEN নেই"
    H = {"Authorization": f"Bearer {tok}"}
    out = {}
    for sid, pid in VERCEL.items():
        r = requests.get("https://api.vercel.com/v1/query/web-analytics/visits/aggregate", headers=H, timeout=60, params={
            "projectId": pid, "teamId": VERCEL_TEAM, "by": "day", "since": (NOW - dt.timedelta(days=30)).strftime("%Y-%m-%dT00:00:00.000Z"),
            "until": NOW.strftime("%Y-%m-%dT23:59:59.000Z")})
        if not r.ok:
            out[sid] = {"error": f"{r.status_code} {r.text[:120]}"}
            continue
        j = r.json()
        rows = j.get("data") or j.get("results") or j if isinstance(j, list) else (j.get("data") or [])
        days = {}
        for x in rows if isinstance(rows, list) else []:
            k = str(x.get("day") or x.get("timestamp") or x.get("key") or "")[:10]
            if k:
                days[k] = {"uniques": x.get("visitors") or x.get("devices") or 0, "pageviews": x.get("pageviews") or x.get("total") or x.get("count") or 0}
        out[sid] = {"days": days, "raw_sample": None if days else str(j)[:200]}
    return out, ""


def collect():
    data = {"generated": NOW.isoformat(timespec="seconds"), "sites": []}
    try:
        art = articles_d1()
    except Exception as e:
        art, data["d1_error"] = {}, str(e)[:200]
    wp = None
    try:
        wp = articles_wp()
    except Exception as e:
        data["wp_error"] = str(e)[:200]
    try:
        pb = probashi_bondhu()
    except Exception as e:
        pb = None
    cfv, cf_note = cf_visitors()
    vv, v_note = vercel_visitors()
    data["visitors_note"] = {"cloudflare": cf_note, "vercel": v_note}
    for sid, dom, name, plat, src in SITES:
        s = {"id": sid, "domain": dom, "name": name, "platform": plat, "uptime": uptime(dom)}
        if src == "d1":
            s["articles"] = art.get(sid)
        elif src == "wp":
            s["articles"] = wp
        elif src == "pb":
            s["pb"] = pb
        bare = dom.replace("www.", "")
        if cfv and bare in cfv:
            s["visitors"] = cfv[bare]
        elif vv and sid in vv:
            s["visitors"] = vv[sid]
        data["sites"].append(s)
    data["inactive"] = {k: v["total"] for k, v in art.items() if k not in {x[0] for x in SITES}}  # old placeholder sites without a domain
    if cfv:
        data["other_zones"] = {k: v for k, v in cfv.items() if k not in {x[1].replace("www.", "") for x in SITES}}
    return data


def push(data):
    base = os.environ["PROBASHIINFO_WP_URL"].rstrip("/")
    auth = base64.b64encode(f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()).decode()
    r = requests.post(f"{base}/wp-json/pa/v1/net-stats", headers={"Authorization": f"Basic {auth}", **UA}, json=data, timeout=120)
    print("push", r.status_code, r.text[:200])
    r.raise_for_status()


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "collect"
    if cmd == "collect":
        d = collect()
        print(json.dumps({k: v for k, v in d.items() if k != "sites"}, ensure_ascii=False)[:600])
        for s in d["sites"]:
            a = s.get("articles") or {}
            print(s["id"], s["uptime"], "articles", a.get("total"), "w7", a.get("w7"), "visitors" if s.get("visitors") else "-", s.get("pb"))
        if "--no-push" not in sys.argv:
            push(d)
