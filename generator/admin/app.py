"""AutoBlog admin panel.

Run:  python admin/app.py
Open: http://localhost:5050

One dashboard controls every site. Pick a site, give titles (or let AI find them),
hit generate — the multi-agent pipeline writes + publishes each article.
Progress is streamed via simple polling (no websockets = fewer moving parts).
"""
import os
import sys
import threading
import uuid
from datetime import datetime, timezone

# UTF-8 stdout so Bengali / emoji don't crash the Windows console codec.
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Make `config` and `modules` importable when run as `python admin/app.py`.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template, request, jsonify, abort

from config import settings
from modules import store
from modules.pipeline import generate_article, suggest_titles
from modules.llm import have_llm

app = Flask(__name__)

# In-memory job store (id → job dict). Fine for a single-user local panel.
JOBS: dict[str, dict] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Pages ──────────────────────────────────────────────
@app.route("/")
def dashboard():
    sites = store.load_sites()
    counts = store.counts_by_site()
    recent = store.list_articles()[:8]
    total = sum(counts.values())
    return render_template("dashboard.html", sites=sites, counts=counts,
                           recent=recent, total=total, has_llm=have_llm())


# ── Network analytics dashboard ────────────────────────
@app.route("/network")
def network_page():
    return render_template("network.html")


@app.route("/api/network")
def network_api():
    from modules.net_analytics import network_snapshot
    rng = request.args.get("range", "7d")
    try:
        return jsonify(network_snapshot(rng))
    except Exception as e:
        return jsonify({"error": str(e)[:300]}), 500


@app.route("/generate")
def generate_page():
    sites = store.load_sites()
    site_id = request.args.get("site", sites[0]["id"])
    return render_template("generate.html", sites=sites, current=site_id, has_llm=have_llm())


@app.route("/articles")
def articles_page():
    sites = store.load_sites()
    site_id = request.args.get("site") or None
    items = store.list_articles(site_id)
    return render_template("articles.html", sites=sites, current=site_id, articles=items)


@app.route("/preview/<article_id>")
def preview(article_id):
    article = store.get_article(article_id)
    if not article:
        abort(404)
    site = store.get_site(article["site_id"])
    return render_template("preview.html", a=article, site=site)


@app.route("/settings")
def settings_page():
    env = {
        "DEEPSEEK_API_KEY": bool(settings.DEEPSEEK_API_KEY),
        "SEMRUSH_API_KEY": bool(settings.SEMRUSH_API_KEY),
        "OPENAI_API_KEY": bool(settings.OPENAI_API_KEY),
        "GEMINI_API_KEY": bool(settings.GEMINI_API_KEY),
        "IMAGE_PROVIDER": settings.IMAGE_PROVIDER,
        "STORAGE_BACKEND": settings.STORAGE_BACKEND,
        "SUPABASE_URL": bool(settings.SUPABASE_URL),
    }
    return render_template("settings.html", env=env, sites=store.load_sites())


# ── API ────────────────────────────────────────────────
@app.route("/api/suggest-titles", methods=["POST"])
def api_suggest_titles():
    data = request.json or {}
    site = store.get_site(data.get("site_id"))
    if not site:
        return jsonify({"error": "site not found"}), 404
    count = max(1, min(50, int(data.get("count", 10))))
    titles = suggest_titles(site, count=count, seed=(data.get("seed") or "").strip())
    return jsonify({"titles": titles})


@app.route("/api/generate", methods=["POST"])
def api_generate():
    data = request.json or {}
    site = store.get_site(data.get("site_id"))
    if not site:
        return jsonify({"error": "site not found"}), 404

    titles = [t.strip() for t in (data.get("titles") or []) if t.strip()]
    count = int(data.get("count", 0) or 0)

    # No explicit titles? Let the AI plan `count` of them.
    if not titles and count > 0:
        titles = suggest_titles(site, count=count, seed=(data.get("seed") or "").strip())
    if not titles:
        return jsonify({"error": "give at least one title, or a count"}), 400

    job_id = uuid.uuid4().hex[:8]
    JOBS[job_id] = {
        "id": job_id, "site_id": site["id"], "site_name": site["name"],
        "status": "running", "total": len(titles), "done": 0,
        "logs": [], "articles": [], "error": None, "created_at": _now(),
    }

    def log(msg):
        JOBS[job_id]["logs"].append({"t": datetime.now().strftime("%H:%M:%S"), "m": msg})

    def run():
        try:
            log(f"Starting {len(titles)} article(s) for {site['name']}")
            for i, title in enumerate(titles, 1):
                log(f"── [{i}/{len(titles)}] {title}")
                try:
                    art = generate_article(site, title, log=log)
                    JOBS[job_id]["articles"].append(
                        {"id": art["id"], "title": art["title"], "slug": art["slug"],
                         "words": art["word_count"], "image": art["image_url"]})
                except Exception as e:
                    log(f"❌ Failed: {title} — {e}")
                JOBS[job_id]["done"] = i
            JOBS[job_id]["status"] = "completed"
            log(f"🎉 Done — {len(JOBS[job_id]['articles'])}/{len(titles)} published")
        except Exception as e:
            import traceback
            JOBS[job_id]["status"] = "failed"
            JOBS[job_id]["error"] = str(e)
            log("FATAL: " + traceback.format_exc())

    threading.Thread(target=run, daemon=True).start()
    return jsonify({"job_id": job_id})


@app.route("/api/job/<job_id>")
def api_job(job_id):
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"error": "not found"}), 404
    return jsonify(job)


@app.route("/api/articles")
def api_articles():
    return jsonify(store.list_articles(request.args.get("site") or None))


# ── Bulk: N articles for EACH selected site (AI plans keyword-driven topics) ──
@app.route("/api/bulk-generate", methods=["POST"])
def api_bulk_generate():
    data = request.json or {}
    all_sites = store.load_sites()
    ids = data.get("site_ids") or [s["id"] for s in all_sites]
    sites = [s for s in all_sites if s["id"] in ids]
    count = max(1, min(100, int(data.get("count", 5))))
    seed = (data.get("seed") or "").strip()
    if not sites:
        return jsonify({"error": "no sites selected"}), 400

    job_id = uuid.uuid4().hex[:8]
    JOBS[job_id] = {
        "id": job_id, "type": "bulk", "site_id": ",".join(ids),
        "site_name": f"{len(sites)} site(s) × {count}", "status": "running",
        "total": count * len(sites), "done": 0, "logs": [], "articles": [],
        "error": None, "created_at": _now(),
    }

    def log(m):
        JOBS[job_id]["logs"].append({"t": datetime.now().strftime("%H:%M:%S"), "m": m})

    def run():
        try:
            from concurrent.futures import ThreadPoolExecutor
            # Plan unique titles per site (dedupe against what's already published).
            tasks = []
            for site in sites:
                log(f"════ {site['name']}: AI planning {count} unique keyword topics ════")
                existing = store.list_articles(site["id"])
                avoid = [a.get("title", "") for a in existing] + [a.get("keyword", "") for a in existing]
                for t in suggest_titles(site, count=count, seed=seed, avoid=avoid):
                    tasks.append((site, t))
            JOBS[job_id]["total"] = len(tasks) or 1
            lock = threading.Lock()

            def work(item):
                site, t = item
                log(f"── [{site['name']}] {t}")
                try:
                    art = generate_article(site, t)  # parallel: no per-step log spam
                    with lock:
                        JOBS[job_id]["articles"].append({
                            "id": art["id"], "title": art["title"], "slug": art["slug"],
                            "words": art["word_count"], "image": art["image_url"], "site": site["id"]})
                    log(f"✅ [{site['name']}] {art['title']} ({art['word_count']}w)")
                except Exception as e:
                    log(f"❌ {t} — {e}")
                with lock:
                    JOBS[job_id]["done"] += 1

            # 4 articles at a time — fast, but within DeepSeek/Pixabay rate limits.
            with ThreadPoolExecutor(max_workers=4) as ex:
                list(ex.map(work, tasks))

            JOBS[job_id]["status"] = "completed"
            log(f"🎉 Done — {len(JOBS[job_id]['articles'])} published across {len(sites)} site(s)")
        except Exception as e:
            import traceback
            JOBS[job_id]["status"] = "failed"
            JOBS[job_id]["error"] = str(e)
            log("FATAL: " + traceback.format_exc())

    threading.Thread(target=run, daemon=True).start()
    return jsonify({"job_id": job_id})


# ── Manage / edit / delete ──
@app.route("/manage")
def manage_page():
    sites = store.load_sites()
    site_id = request.args.get("site") or None
    items = store.list_articles(site_id)
    return render_template("manage.html", sites=sites, current=site_id, articles=items)


@app.route("/edit/<article_id>")
def edit_page(article_id):
    a = store.get_article(article_id)
    if not a:
        abort(404)
    return render_template("edit.html", a=a, sites=store.load_sites())


@app.route("/api/article/<article_id>/update", methods=["POST"])
def api_article_update(article_id):
    data = request.json or {}
    fields = {k: data[k] for k in
              ("title", "meta_title", "meta_description", "excerpt", "body_html", "status", "keyword")
              if k in data}
    if not fields:
        return jsonify({"error": "no fields"}), 400
    res = store.update_article(article_id, fields)
    return jsonify({"ok": bool(res)})


@app.route("/api/article/<article_id>/delete", methods=["POST"])
def api_article_delete(article_id):
    return jsonify({"ok": store.delete_article(article_id)})


if __name__ == "__main__":
    print("\n" + "=" * 52)
    print("  AutoBlog Admin")
    print("  Open: http://localhost:5050")
    print(f"  DeepSeek: {'ON' if have_llm() else 'OFF (mock mode — add DEEPSEEK_API_KEY)'}")
    print(f"  Storage : {settings.STORAGE_BACKEND}")
    print("=" * 52 + "\n")
    app.run(host="0.0.0.0", port=5050, debug=False, threaded=True)
