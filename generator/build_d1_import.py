# -*- coding: utf-8 -*-
"""Generate D1 (SQLite) schema + batched INSERTs for the 859-article backup,
so the sites can read content from Cloudflare D1 instead of the paused Supabase.
"""
import json
import os

BK = "data/supabase_backup_2026-07-10.json"
OUT = "data/d1"
os.makedirs(OUT, exist_ok=True)

rows = json.load(open(BK, encoding="utf-8"))

SCHEMA = """CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  site_id TEXT,
  title TEXT,
  slug TEXT,
  meta_title TEXT,
  meta_description TEXT,
  excerpt TEXT,
  body_html TEXT,
  tags TEXT,
  faq TEXT,
  keyword TEXT,
  secondary_keywords TEXT,
  image_url TEXT,
  schema TEXT,
  word_count INTEGER,
  reading_time INTEGER,
  status TEXT,
  is_mock INTEGER,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_articles_site_status ON articles(site_id, status);
CREATE INDEX IF NOT EXISTS idx_articles_site_slug ON articles(site_id, slug);
"""
open(f"{OUT}/00_schema.sql", "w", encoding="utf-8").write(SCHEMA)

COLS = ["id", "site_id", "title", "slug", "meta_title", "meta_description", "excerpt",
        "body_html", "tags", "faq", "keyword", "secondary_keywords", "image_url",
        "schema", "word_count", "reading_time", "status", "is_mock", "created_at"]
JSON_COLS = {"tags", "faq", "secondary_keywords", "schema"}
INT_COLS = {"word_count", "reading_time"}


def sql_val(col, v):
    if v is None:
        return "NULL"
    if col == "is_mock":
        return "1" if v else "0"
    if col in INT_COLS:
        try:
            return str(int(v))
        except Exception:
            return "0"
    if col in JSON_COLS:
        v = json.dumps(v, ensure_ascii=False)
    else:
        v = str(v)
    return "'" + v.replace("'", "''") + "'"


# One INSERT statement per row (a 60-row multi-VALUES statement blows past
# SQLite's ~1MB per-statement limit). Many small statements per file is fine —
# wrangler executes them one at a time.
BATCH = 60
collist = ", ".join(COLS)
files = []
for bi in range(0, len(rows), BATCH):
    chunk = rows[bi:bi + BATCH]
    stmts = []
    for r in chunk:
        vals = ", ".join(sql_val(c, r.get(c)) for c in COLS)
        stmts.append(f"INSERT OR REPLACE INTO articles ({collist}) VALUES ({vals});")
    fn = f"{OUT}/{bi//BATCH + 1:02d}_data.sql"
    open(fn, "w", encoding="utf-8").write("\n".join(stmts) + "\n")
    files.append(fn)

print(f"rows: {len(rows)} | batches: {len(files)} | schema: {OUT}/00_schema.sql")
print("largest file KB:", max(os.path.getsize(f) for f in files) // 1024)
