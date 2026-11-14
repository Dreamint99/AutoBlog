"""probashiinfo.com data pages — snippet control through the Code Snippets REST API.

Run only from GitHub Actions (probashi-snippets.yml, input data_cmd); never prints secrets.

    python wp_probashi_data.py perm-test            # create inactive test snippet, activate, deactivate, delete
    python wp_probashi_data.py push <file> [on|off] # create/replace snippet "PBD data pages" from file; on = active
    python wp_probashi_data.py on | off             # activate / deactivate it (rollback = off)
    python wp_probashi_data.py status               # list snippets (id, active, name)
    python wp_probashi_data.py health               # homepage, 10 posts, sitemap, wp-login → 200

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


def _find(name=NAME):
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


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "status":
        for s in _all():
            print(s.get("id"), "active" if s.get("active") else "off", "|", s.get("name"), "|", len(s.get("code") or ""), "chars")
        return
    if cmd == "health":
        sys.exit(0 if health() else 1)
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
    if cmd == "push":
        path, state = sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else "off")
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
