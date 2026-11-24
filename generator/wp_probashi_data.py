"""probashiinfo.com data pages — snippet control through the Code Snippets REST API.

Run only from GitHub Actions (probashi-snippets.yml, input data_cmd); never prints secrets.

    python wp_probashi_data.py perm-test            # create inactive test snippet, activate, deactivate, delete
    python wp_probashi_data.py push <file> [on|off] # create/replace snippet "PBD data pages" from file; on = active
    python wp_probashi_data.py on | off [name]      # activate / deactivate it (rollback = off)
    python wp_probashi_data.py push <file> on PBA app bar   # any other snippet: name after the state
    python wp_probashi_data.py status               # list snippets (id, active, name)
    python wp_probashi_data.py health               # homepage, 10 posts, sitemap, wp-login → 200
    python wp_probashi_data.py backup [tag]         # copy the live "PBD data pages" code into an INACTIVE snippet "PBD data pages (backup <tag>)"
    python wp_probashi_data.py restore [tag]        # put that backup code back into "PBD data pages" (rollback)
    python wp_probashi_data.py extra <file.json>    # upload agency extra data (pbd-data/v1/agency-extra, admin only)
    python wp_probashi_data.py verify <path> …      # live check: HTTP code, <title>, robots, JSON-LD types
    python wp_probashi_data.py flush                # Rank Math sitemap flush (snippet #44 route pbd-ops/v1/sitemap)
    python wp_probashi_data.py indexnow <file.txt>  # IndexNow through Rank Math's key (pbd-ops/v1/indexnow), ≤100 URLs per call

The snippet's test key comes from env PBD_TEST_KEY and replaces __PBD_TEST_KEY__ in the file.
"""
import base64
import os
import random
import sys
import time

import requests

NAME = "PBD data pages"
BASE = os.environ.get("PROBASHIINFO_WP_URL", "https://probashiinfo.com").rstrip("/")
UA = {"User-Agent": "Mozilla/5.0 (compatible; ProbashiDataBot/1.0)"}


def _h():
    tok = base64.b64encode(f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()).decode()
    return {"Authorization": f"Basic {tok}", **UA}


API = f"{BASE}/wp-json/code-snippets/v1/snippets"


def _all():
    out, page = [], 1
    while True:
        r = requests.get(API, headers=_h(), params={"per_page": 100, "page": page}, timeout=60)
        if r.status_code == 400 and page > 1:
            break
        r.raise_for_status()
        rows = r.json()
        out += rows
        if len(rows) < 100 or page >= 10:
            break
        page += 1
    seen = {x.get("id") for x in out}
    for i in range(1, 80):  # some plugin versions list only part: probe ids directly
        if i in seen:
            continue
        g = requests.get(f"{API}/{i}", headers=_h(), timeout=30)
        if g.ok and isinstance(g.json(), dict) and g.json().get("id") == i:
            out.append(g.json())
    return out


def _find(name=None):
    name = name or NAME  # read at call time (push/on/off may change NAME)
    return next((s for s in _all() if s.get("name") == name), None)


def _state(sid):
    g = requests.get(f"{API}/{sid}", headers=_h(), params={"_": time.time()}, timeout=60)
    return bool(g.ok and g.json().get("active"))


def _toggle(sid, on):
    r = requests.post(f"{API}/{sid}/{'activate' if on else 'deactivate'}", headers=_h(), timeout=60)
    now = _state(sid)
    if now != on:  # some plugin versions ignore the route: fall back to a plain update
        u = requests.post(f"{API}/{sid}", headers=_h(), json={"active": on}, timeout=60)
        print("  route", r.status_code, "→ fallback update", u.status_code)
        now = _state(sid)
    ok = now == on
    print("activate" if on else "deactivate", sid, r.status_code, "now", "active" if now else "off", "ok" if ok else "MISMATCH")
    return ok


def health():
    """Fail (exit 1) if the site's key URLs stop answering 200."""
    urls = [BASE + "/", BASE + "/sitemap_index.xml", BASE + "/wp-login.php"]
    try:
        posts = requests.get(f"{BASE}/wp-json/wp/v2/posts", params={"per_page": 40, "_fields": "link"}, headers=UA, timeout=60).json()
        urls += random.sample([p["link"] for p in posts], min(10, len(posts)))
    except Exception as e:
        print("posts list failed", e)
        urls.append("POSTS-LIST-FAILED")
    bad = 0
    for u in urls:
        try:
            c = requests.get(u, headers=UA, timeout=60, params={"pbdh": int(time.time())}).status_code
        except Exception as e:
            c = str(e)[:60]
        print(c, u)
        bad += c != 200
    print("HEALTH", "OK" if not bad else f"FAIL ({bad})")
    return bad == 0


def _wp(m, route, **kw):
    for i in range(3):
        r = requests.request(m, f"{BASE}/wp-json/{route}", headers=_h(), timeout=120, **kw)
        if r.status_code < 500:
            return r
        time.sleep(5 * (i + 1))
    return r


def _bname(tag):
    return f"{NAME} (backup {tag})"


def backup(tag):
    import hashlib
    ex = _find()
    if not ex:
        sys.exit("live snippet not found")
    code = ex.get("code") or ""
    if len(code) < 1000:
        sys.exit("live code looks empty, not backing up")
    bn = _bname(tag)
    old = _find(bn)
    body = {"name": bn, "code": code, "scope": ex.get("scope") or "front-end", "active": False}
    r = requests.post(f"{API}/{old['id']}" if old else API, headers=_h(), json=body, timeout=90)
    print("backup", r.status_code, (r.json().get("id"), r.json().get("active")) if r.ok else r.text[:300])
    r.raise_for_status()
    if r.json().get("active"):
        _toggle(r.json()["id"], False)
    ver = next((l.strip() for l in code.splitlines() if "PBD_VER" in l and "define" in l), "?")
    print("live snippet id", ex["id"], "active", ex.get("active"), "|", ver, "| chars", len(code), "| sha256", hashlib.sha256(code.encode()).hexdigest()[:16])


def restore(tag):
    b = _find(_bname(tag))
    ex = _find()
    if not b or not ex:
        sys.exit("backup or live snippet not found")
    r = requests.post(f"{API}/{ex['id']}", headers=_h(), json={"name": NAME, "code": b["code"], "scope": ex.get("scope") or "front-end"}, timeout=90)
    print("restore", r.status_code, "" if r.ok else r.text[:300])
    r.raise_for_status()
    time.sleep(5)
    sys.exit(0 if health() else 1)


def extra(path):
    import json
    data = json.load(open(path, encoding="utf-8"))
    r = _wp("POST", "pbd-data/v1/agency-extra", json={"data": data})
    print("extra upload", r.status_code, r.text[:300])
    g = _wp("GET", "pbd-data/v1/agency-extra")
    print("extra now", g.status_code, g.text[:300])
    if not r.ok:
        sys.exit(1)


def verify(paths):
    import re
    bad = 0
    for p in paths:
        u = p if p.startswith("http") else BASE + p
        try:
            r = requests.get(u, headers=UA, timeout=60, params={"pbdv": int(time.time())})
        except Exception as e:
            print("ERR", u, str(e)[:80]); bad += 1; continue
        h = r.text
        t = re.search(r"<title>(.*?)</title>", h, re.S)
        rob = re.search(r'<meta name=["\']robots["\'] content=["\']([^"\']*)', h)
        can = re.search(r'<link rel=["\']canonical["\'] href=["\']([^"\']*)', h)
        types = sorted(set(re.findall(r'"@type"\s*:\s*"(Organization|GovernmentOffice|FAQPage|BreadcrumbList|WebPage)"', h)))
        v2 = "pbd-u" in h
        print(r.status_code, u, "| v2" if v2 else "| old", "|", rob.group(1) if rob else "-", "|", ",".join(types), "|", (t.group(1).strip()[:150] if t else "-"), "| canon", can.group(1) if can else "-")
        bad += r.status_code != 200
    print("VERIFY", "OK" if not bad else f"FAIL ({bad})")
    return bad == 0


def flush():
    r = _wp("POST", "pbd-ops/v1/sitemap", params={"flush": 1})
    print("sitemap flush", r.status_code, r.text[:400])
    for u in ("/sitemap_index.xml", "/pbd-sitemap.xml"):
        x = requests.get(BASE + u, headers=UA, timeout=60, params={"nc": int(time.time())})
        print(" ", x.status_code, u, "locs", x.text.count("<loc>"), "passport-office", x.text.count("/passport-office/"))
    return r.ok


def indexnow(path):
    urls = [l.strip() for l in open(path, encoding="utf-8") if l.strip().startswith("http")]
    ok = True
    for i in range(0, len(urls), 100):
        r = _wp("POST", "pbd-ops/v1/indexnow", json={"urls": urls[i:i + 100]})
        print("indexnow", i, len(urls[i:i + 100]), r.status_code, r.text[:400])
        ok &= r.ok
    sys.exit(0 if ok else 1)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "status":
        for s in _all():
            print(s.get("id"), "active" if s.get("active") else "off", "|", s.get("name"), "|", len(s.get("code") or ""), "chars")
        return
    if cmd == "health":
        sys.exit(0 if health() else 1)
    if cmd == "backup":
        return backup(" ".join(sys.argv[2:]) or "before v18")
    if cmd == "restore":
        return restore(" ".join(sys.argv[2:]) or "before v18")
    if cmd == "extra":
        return extra(sys.argv[2])
    if cmd == "verify":
        paths = sys.argv[2:]
        if len(paths) == 1 and paths[0].endswith(".txt"):
            paths = [l.strip() for l in open(paths[0], encoding="utf-8") if l.strip()]
        sys.exit(0 if verify(paths) else 1)
    if cmd == "flush":
        sys.exit(0 if flush() else 1)
    if cmd == "indexnow":
        return indexnow(sys.argv[2])
    if cmd == "perm-test":
        body = {"name": "zz PBD permission test (safe to delete)", "code": "/* PBD permission test: does nothing */",
                "scope": "front-end", "active": False}
        r = requests.post(API, headers=_h(), json=body, timeout=60)
        print("create", r.status_code, r.text[:200] if not r.ok else (r.json().get("id"), r.json().get("active")))
        r.raise_for_status()
        sid = r.json()["id"]
        a = _toggle(sid, True)
        d = _toggle(sid, False)
        x = requests.delete(f"{API}/{sid}", headers=_h(), timeout=60)
        print("delete", sid, x.status_code)
        print("PERM", "OK" if (a and d and x.ok) else "FAIL")
        health()
        sys.exit(0 if (a and d and x.ok) else 1)
    global NAME
    if cmd == "push":
        path, state = sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else "off")
        if len(sys.argv) > 4:  # optional snippet name (default "PBD data pages")
            NAME = " ".join(sys.argv[4:])
        code = open(path, encoding="utf-8").read()
        code = code[5:].lstrip() if code.startswith("<?php") else code
        key = os.environ.get("PBD_TEST_KEY", "")
        if "__PBD_TEST_KEY__" in code:
            if len(key) < 12:
                sys.exit("PBD_TEST_KEY missing")
            code = code.replace("__PBD_TEST_KEY__", key)
        ex = _find()
        body = {"name": NAME, "code": code, "scope": "front-end"}
        if not ex:
            body["active"] = False
        r = requests.post(f"{API}/{ex['id']}" if ex else API, headers=_h(), json=body, timeout=90)
        print("push", r.status_code, (r.json().get("id"), r.json().get("active")) if r.ok else r.text[:400])
        r.raise_for_status()
        sid = r.json()["id"]
        if state == "on" and not r.json().get("active"):
            _toggle(sid, True)
        if state == "off" and r.json().get("active"):
            _toggle(sid, False)
        time.sleep(5)
        if not health():
            print("HEALTH FAILED → deactivating snippet")
            _toggle(sid, False)
            sys.exit(1)
        return
    if cmd in ("on", "off"):
        if len(sys.argv) > 2:
            NAME = " ".join(sys.argv[2:])
        ex = _find()
        if not ex:
            sys.exit("snippet not found")
        _toggle(ex["id"], cmd == "on")
        time.sleep(5)
        if not health() and cmd == "on":
            print("HEALTH FAILED → deactivating snippet")
            _toggle(ex["id"], False)
            sys.exit(1)
        return
    sys.exit(f"unknown command {cmd}")


if __name__ == "__main__":
    main()
