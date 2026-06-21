"""Article + site storage.

Two backends, chosen by STORAGE_BACKEND:
  - "local"    → a JSON file (output/db/articles.json). Zero setup. Default.
  - "supabase" → POST/GET to a Supabase `articles` table (the bridge to the Next.js sites).

The Next.js sites read from Supabase. For local development you can stay on "local"
and switch to "supabase" once you've created the project + run supabase/schema.sql.
"""
import json
import os
import threading

import requests

from config.settings import (
    SITES_CONFIG, DB_DIR, STORAGE_BACKEND, SUPABASE_URL, SUPABASE_SERVICE_KEY,
)

_lock = threading.Lock()
_ARTICLES_PATH = os.path.join(DB_DIR, "articles.json")


# ── Sites ──────────────────────────────────────────────
def load_sites() -> list:
    with open(SITES_CONFIG, encoding="utf-8") as f:
        return json.load(f)["sites"]


def get_site(site_id: str) -> dict | None:
    return next((s for s in load_sites() if s["id"] == site_id), None)


# ── Articles ───────────────────────────────────────────
def _read_local() -> list:
    if not os.path.exists(_ARTICLES_PATH):
        return []
    with open(_ARTICLES_PATH, encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def _write_local(items: list):
    tmp = _ARTICLES_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    os.replace(tmp, _ARTICLES_PATH)


def _supabase_headers() -> dict:
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def add_article(article: dict) -> dict:
    site = get_site(article.get("site_id", ""))
    if site and site.get("publish_target") == "wordpress":
        from modules import wordpress
        wordpress.publish(site, article)
        return article

    if STORAGE_BACKEND == "supabase":
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/articles",
            headers=_supabase_headers(),
            json=article,
            timeout=30,
        )
        r.raise_for_status()
        return r.json()[0] if r.json() else article

    with _lock:
        items = _read_local()
        items.append(article)
        _write_local(items)
    return article


def list_articles(site_id: str | None = None) -> list:
    if site_id:
        site = get_site(site_id)
        if site and site.get("publish_target") == "wordpress":
            from modules import wordpress
            return wordpress.list_articles(site)

    if STORAGE_BACKEND == "supabase":
        q = f"{SUPABASE_URL}/rest/v1/articles?select=*&order=created_at.desc"
        if site_id:
            q += f"&site_id=eq.{site_id}"
        r = requests.get(q, headers=_supabase_headers(), timeout=30)
        r.raise_for_status()
        return r.json()

    items = sorted(_read_local(), key=lambda a: a.get("created_at", ""), reverse=True)
    if site_id:
        items = [a for a in items if a.get("site_id") == site_id]
    return items


def update_article(article_id: str, fields: dict) -> dict | None:
    if STORAGE_BACKEND == "supabase":
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/articles?id=eq.{article_id}",
            headers=_supabase_headers(), json=fields, timeout=30,
        )
        r.raise_for_status()
        rows = r.json()
        return rows[0] if rows else None
    with _lock:
        items = _read_local()
        out = None
        for a in items:
            if a.get("id") == article_id:
                a.update(fields)
                out = a
        _write_local(items)
    return out


def delete_article(article_id: str) -> bool:
    if STORAGE_BACKEND == "supabase":
        r = requests.delete(
            f"{SUPABASE_URL}/rest/v1/articles?id=eq.{article_id}",
            headers=_supabase_headers(), timeout=30,
        )
        r.raise_for_status()
        return True
    with _lock:
        items = _read_local()
        new = [a for a in items if a.get("id") != article_id]
        _write_local(new)
        return len(new) != len(items)


def get_article(article_id: str) -> dict | None:
    if STORAGE_BACKEND == "supabase":
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/articles?select=*&id=eq.{article_id}",
            headers=_supabase_headers(), timeout=30,
        )
        r.raise_for_status()
        rows = r.json()
        return rows[0] if rows else None

    return next((a for a in _read_local() if a.get("id") == article_id), None)


def counts_by_site() -> dict:
    out = {}
    for a in list_articles():
        out[a.get("site_id")] = out.get(a.get("site_id"), 0) + 1
    return out
