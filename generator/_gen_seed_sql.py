"""Read local articles.json and emit batched INSERT SQL (dollar-quoted, safe) for Supabase."""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config.settings import DB_DIR, OUTPUT_DIR

arts = json.load(open(os.path.join(DB_DIR, "articles.json"), encoding="utf-8"))

def q(v):
    return f"$ab${v}$ab$"

def jq(v):
    return f"$ab${json.dumps(v, ensure_ascii=False)}$ab$::jsonb"

cols = ("id, site_id, title, slug, meta_title, meta_description, excerpt, body_html, "
        "tags, faq, keyword, secondary_keywords, image_url, word_count, reading_time, "
        "status, is_mock, created_at")

def row(a):
    return ("(" + ", ".join([
        q(a["id"]), q(a["site_id"]), q(a["title"]), q(a["slug"]),
        q(a.get("meta_title","")), q(a.get("meta_description","")), q(a.get("excerpt","")),
        q(a.get("body_html","")), jq(a.get("tags",[])), jq(a.get("faq",[])),
        q(a.get("keyword","")), jq(a.get("secondary_keywords",[])), q(a.get("image_url","")),
        str(int(a.get("word_count",0))), str(int(a.get("reading_time",1))),
        q(a.get("status","published")), "true" if a.get("is_mock") else "false",
        q(a.get("created_at")),
    ]) + ")")

BATCH = 6
n = math.ceil(len(arts) / BATCH)
for i in range(n):
    chunk = arts[i*BATCH:(i+1)*BATCH]
    sql = (f"INSERT INTO articles ({cols}) VALUES\n"
           + ",\n".join(row(a) for a in chunk)
           + "\nON CONFLICT (site_id, slug) DO NOTHING;")
    path = os.path.join(OUTPUT_DIR, f"seed_{i+1}.sql")
    open(path, "w", encoding="utf-8").write(sql)
    print(f"wrote {path}  ({len(chunk)} rows, {len(sql)} bytes)")
print(f"total {len(arts)} articles in {n} batches")
