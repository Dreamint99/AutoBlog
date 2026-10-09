"""Network dashboard data: every site's real numbers in one JSON.

    python network_stats.py probe     # list zones / workers / pages and test analytics access
    python network_stats.py collect   # write data/network_stats.json
"""
import json, os, sys, time, datetime as dt
import requests

CF = "https://api.cloudflare.com/client/v4"
H = {"Authorization": f"Bearer {os.environ.get('CLOUDFLARE_API_TOKEN','')}", "Content-Type": "application/json"}
ACC = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")


def cf(path, **kw):
    r = requests.get(CF + path, headers=H, params=kw, timeout=60)
    return r.json()


def gql(q, v):
    r = requests.post(CF + "/graphql", headers=H, json={"query": q, "variables": v}, timeout=60)
    return r.json()


def probe():
    z = cf("/zones", per_page=50)
    print("zones:", z.get("success"), [(x["name"], x["status"], x["plan"]["name"]) for x in z.get("result", [])], z.get("errors"))
    w = cf(f"/accounts/{ACC}/workers/scripts")
    print("workers:", w.get("success"), [x["id"] for x in w.get("result", [])][:40], w.get("errors"))
    p = cf(f"/accounts/{ACC}/pages/projects")
    print("pages:", p.get("success"), [(x["name"], x.get("domains")) for x in p.get("result", [])], p.get("errors"))
    since = (dt.datetime.utcnow() - dt.timedelta(days=7)).strftime("%Y-%m-%d")
    for x in z.get("result", [])[:3]:
        q = """query($z:String!,$d:Date!){viewer{zones(filter:{zoneTag:$z}){httpRequests1dGroups(limit:7,filter:{date_geq:$d}){dimensions{date} sum{requests pageViews} uniq{uniques}}}}}"""
        print(x["name"], json.dumps(gql(q, {"z": x["id"], "d": since}))[:400])
    q = """query($a:String!,$d:Time!){viewer{accounts(filter:{accountTag:$a}){rumPageloadEventsAdaptiveGroups(limit:20,filter:{datetime_geq:$d},orderBy:[count_DESC]){count sum{visits} dimensions{siteTag host:requestHost}}}}}"""
    print("rum:", json.dumps(gql(q, {"a": ACC, "d": (dt.datetime.utcnow() - dt.timedelta(days=7)).strftime("%Y-%m-%dT00:00:00Z")}))[:600])
    q = """query($a:String!,$d:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsAdaptive(limit:30,filter:{datetime_geq:$d}){sum{requests} dimensions{scriptName}}}}}"""
    print("workers inv:", json.dumps(gql(q, {"a": ACC, "d": (dt.datetime.utcnow() - dt.timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z")}))[:900])


if __name__ == "__main__":
    {"probe": probe}[sys.argv[1] if len(sys.argv) > 1 else "probe"]()
