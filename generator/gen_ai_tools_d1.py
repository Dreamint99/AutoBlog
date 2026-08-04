# -*- coding: utf-8 -*-
"""Best AI Tools directory — Cloudflare D1 backend (Supabase is dead).

  python gen_ai_tools_d1.py --seed      # create tables + upsert curated dataset
  python gen_ai_tools_d1.py --refresh   # daily: live GitHub stars, growth%, url_ok
  python gen_ai_tools_d1.py --rising     # refresh the "trending repos" strip
  python gen_ai_tools_d1.py --all        # refresh + rising (for the daily task)

Editorial `rank`/`cat_order` stay stable (curated best-first); the daily number
that grows is REAL free data — GitHub stargazers for the open-source tools.
"""
import json
import math
import os
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from gen_ai_tools import github_stats, url_alive, github_repo_info, SEED_PATH, RISING_SEED  # reuse

DB = "autoblog-content"
WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web")


def _env():
    e = dict(os.environ)
    if not e.get("XDG_CONFIG_HOME"):
        e["XDG_CONFIG_HOME"] = os.getenv("WRANGLER_CONFIG_HOME",
                                         os.path.join(os.environ.get("APPDATA", ""), "xdg.config"))
    return e


def _run_sql(sql: str):
    """Execute a batch of SQL against remote D1 via wrangler (auth = CLOUDFLARE_API_TOKEN)."""
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f:
        f.write(sql)
        path = f.name
    try:
        for npx in ("npx.cmd", "npx"):
            try:
                r = subprocess.run([npx, "wrangler", "d1", "execute", DB, "--remote", "--file", path, "--yes"],
                                   cwd=WEB, capture_output=True, text=True, timeout=180,
                                   encoding="utf-8", errors="replace", env=_env())
                break
            except FileNotFoundError:
                continue
        else:
            raise RuntimeError("wrangler not found")
        out = (r.stdout or "") + (r.stderr or "")
        if r.returncode != 0 or "Executed" not in out:
            raise RuntimeError(f"D1 exec failed (rc={r.returncode}): {out[-300:]}")
    finally:
        os.unlink(path)


def _query(sql: str) -> list:
    for npx in ("npx.cmd", "npx"):
        try:
            r = subprocess.run([npx, "wrangler", "d1", "execute", DB, "--remote", "--command", sql, "--json"],
                               cwd=WEB, capture_output=True, text=True, timeout=120,
                               encoding="utf-8", errors="replace", env=_env())
            break
        except FileNotFoundError:
            continue
    else:
        return []
    try:
        data = json.loads(r.stdout)
        return data[0].get("results", []) if isinstance(data, list) and data else []
    except Exception:
        return []


def _sql_str(v) -> str:
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def _batched(statements, size=50):
    for i in range(0, len(statements), size):
        _run_sql("\n".join(statements[i:i + size]))


# ── schema ──
def create_tables():
    _run_sql("""
CREATE TABLE IF NOT EXISTS ai_tools (
  slug TEXT PRIMARY KEY, name TEXT, category TEXT, category_key TEXT, heading_keyword TEXT,
  category_blurb TEXT, url TEXT, blurb TEXT, pricing TEXT, github_repo TEXT, users_est TEXT,
  tags TEXT, highlight TEXT, stars INTEGER DEFAULT 0, stars_prev INTEGER DEFAULT 0,
  growth_pct REAL DEFAULT 0, forks INTEGER DEFAULT 0, score REAL DEFAULT 0, rank INTEGER DEFAULT 0,
  url_ok INTEGER DEFAULT 1, featured INTEGER DEFAULT 0, cat_order INTEGER DEFAULT 0, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS ai_rising (
  pos INTEGER PRIMARY KEY, repo TEXT, name TEXT, url TEXT, description TEXT, stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0, language TEXT, topics TEXT, owner_avatar TEXT, repo_created TEXT,
  visible INTEGER DEFAULT 1, updated_at TEXT
);""")
    print("tables ready")


_COLS = ["slug", "name", "category", "category_key", "heading_keyword", "category_blurb", "url",
         "blurb", "pricing", "github_repo", "users_est", "tags", "highlight", "stars", "stars_prev",
         "growth_pct", "forks", "score", "rank", "url_ok", "featured", "cat_order", "updated_at"]


def seed():
    create_tables()
    with open(SEED_PATH, encoding="utf-8") as f:
        data = json.load(f)
    cats = data.get("categories", data if isinstance(data, list) else [])
    stmts = []
    n = 0
    for ci, cat in enumerate(cats):
        tools = cat.get("tools", [])
        for ti, t in enumerate(tools):
            row = {
                "slug": t["slug"], "name": t["name"],
                "category": cat.get("category", cat.get("name", "")), "category_key": cat.get("key", ""),
                "heading_keyword": cat.get("heading_keyword", ""), "category_blurb": cat.get("blurb", ""),
                "url": t["url"].rstrip("/"), "blurb": t.get("blurb", ""), "pricing": t.get("pricing", ""),
                "github_repo": (t.get("github", "") or "").strip(), "users_est": t.get("users_est", ""),
                "tags": json.dumps(t.get("tags", []), ensure_ascii=False), "highlight": t.get("highlight", ""),
                "stars": 0, "stars_prev": 0, "growth_pct": 0, "forks": 0,
                "score": float(len(tools) - ti), "rank": ti + 1, "url_ok": 1, "featured": 0,
                "cat_order": ci, "updated_at": "",
            }
            vals = ", ".join(_sql_str(row[c]) if c in ("slug", "name", "category", "category_key",
                             "heading_keyword", "category_blurb", "url", "blurb", "pricing",
                             "github_repo", "users_est", "tags", "highlight", "updated_at")
                             else str(row[c]) for c in _COLS)
            stmts.append(f"INSERT OR REPLACE INTO ai_tools ({', '.join(_COLS)}) VALUES ({vals});")
            n += 1
    _batched(stmts)
    print(f"Seeded {n} tools across {len(cats)} categories -> D1")


def refresh():
    rows = _query("SELECT slug, url, github_repo, stars FROM ai_tools")
    stmts = []
    for row in rows:
        # Keep url_ok=1: many tool sites bot-block HEAD/GET, so url_alive gives false
        # negatives that would wrongly hide good tools (known gotcha). Refresh only stars.
        repo = (row.get("github_repo") or "").strip()
        parts = ["url_ok=1", "updated_at='now'"]
        if repo:
            gs = github_stats(repo)
            if gs:
                old = int(row.get("stars") or 0)
                new = gs["stars"]
                growth = round((new - old) / old * 100, 2) if old > 0 else 0.0
                parts += [f"stars={new}", f"stars_prev={old}", f"forks={gs['forks']}",
                          f"growth_pct={growth}", f"score={round(math.log10(new + 1) * 10, 3)}"]
            time.sleep(0.4)
        stmts.append(f"UPDATE ai_tools SET {', '.join(parts)} WHERE slug={_sql_str(row['slug'])};")
    _batched(stmts)
    print(f"Refreshed {len(rows)} tools (stars + url_ok) -> D1")


def rising():
    if not os.path.exists(RISING_SEED):
        print("no rising seed; skip")
        return
    seedrows = json.load(open(RISING_SEED, encoding="utf-8"))
    seedrows = seedrows.get("rising", seedrows) if isinstance(seedrows, dict) else seedrows
    stmts = []
    for pos, it in enumerate(seedrows, 1):
        info = github_repo_info(it.get("repo", "")) or {}
        row = {
            "pos": pos, "repo": it.get("repo", ""), "name": it.get("name", info.get("name", "")),
            "url": it.get("url", f"https://github.com/{it.get('repo','')}"),
            "description": info.get("description", it.get("description", "")),
            "stars": int(info.get("stars", 0)), "forks": int(info.get("forks", 0)),
            "language": info.get("language", ""), "topics": json.dumps(info.get("topics", []), ensure_ascii=False),
            "owner_avatar": info.get("owner_avatar", ""), "repo_created": info.get("created", ""),
            "visible": 1, "updated_at": "now",
        }
        cols = list(row.keys())
        vals = ", ".join(_sql_str(row[c]) if isinstance(row[c], str) else str(row[c]) for c in cols)
        stmts.append(f"INSERT OR REPLACE INTO ai_rising ({', '.join(cols)}) VALUES ({vals});")
        time.sleep(0.3)
    _run_sql("CREATE TABLE IF NOT EXISTS ai_rising (pos INTEGER PRIMARY KEY, repo TEXT, name TEXT, url TEXT, description TEXT, stars INTEGER, forks INTEGER, language TEXT, topics TEXT, owner_avatar TEXT, repo_created TEXT, visible INTEGER, updated_at TEXT);")
    _batched(stmts)
    print(f"Rising: {len(stmts)} repos -> D1")


if __name__ == "__main__":
    args = set(sys.argv[1:])
    if "--seed" in args:
        seed()
    if "--refresh" in args or "--all" in args:
        refresh()
    if "--rising" in args or "--all" in args:
        rising()
    if not args:
        print(__doc__)
