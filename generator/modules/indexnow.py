"""IndexNow — instantly notify Bing, Yandex (and other participating engines)
when a URL is published, updated or deleted. One ping reaches all of them.

Key file must be live at https://<domain>/<key>.txt (hosted in web/public/).
Only hosts listed in settings.INDEXNOW_HOSTS are pinged (a *.vercel.app or an
unconnected domain can't host the key file, so pinging it just fails).

Docs: https://www.indexnow.org/documentation
"""
import requests

from config.settings import INDEXNOW_KEY, INDEXNOW_HOSTS

ENDPOINT = "https://api.indexnow.org/indexnow"
_MAX_PER_REQUEST = 10000


def host_enabled(domain: str) -> bool:
    return bool(domain) and domain.lower() in INDEXNOW_HOSTS


def submit_urls(domain: str, urls, log=lambda m: None) -> bool:
    """POST a batch of full URLs for one host. Returns True on 200/202."""
    domain = (domain or "").lower()
    urls = [u for u in dict.fromkeys(urls) if u]  # de-dupe, keep order
    if not host_enabled(domain):
        log(f"IndexNow: skip {domain} (not in INDEXNOW_HOSTS)")
        return False
    if not urls:
        return False
    payload = {
        "host": domain,
        "key": INDEXNOW_KEY,
        "keyLocation": f"https://{domain}/{INDEXNOW_KEY}.txt",
        "urlList": urls[:_MAX_PER_REQUEST],
    }
    try:
        r = requests.post(
            ENDPOINT, json=payload, timeout=20,
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
        ok = r.status_code in (200, 202)
        log(f"IndexNow {domain}: HTTP {r.status_code} for {len(payload['urlList'])} url(s)"
            + ("" if ok else f" — {r.text[:160]}"))
        return ok
    except Exception as e:
        log(f"IndexNow error {domain}: {e}")
        return False


def article_url(site: dict, article: dict) -> str:
    return f"https://{site.get('domain','')}/{article.get('slug','')}"


def submit_article(site: dict, article: dict, log=lambda m: None) -> bool:
    """Ping IndexNow for a single freshly-published article (no-op if host off)."""
    domain = (site.get("domain") or "").lower()
    if not host_enabled(domain):
        return False
    return submit_urls(domain, [article_url(site, article)], log)
