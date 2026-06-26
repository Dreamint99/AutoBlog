"""Live data reports for Countly from FREE, no-key APIs — refreshed on a schedule.

Builds/refreshes 5 deterministic, real-data articles (no LLM):
  - Top Cryptocurrencies by Market Cap   (CoinGecko)
  - US Dollar Exchange Rates Today        (open.er-api.com)
  - Countries by GDP                      (World Bank)
  - Countries by Population               (World Bank)
  - Most Starred GitHub Repositories      (GitHub API)

Each is upserted into Supabase (countly) → live via force-dynamic. Schedule daily.
"""
import os
import sys
import uuid
from datetime import datetime, timezone
from html import escape

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import requests
from modules import store, seo
from modules.image import _wikimedia, inline_image

UA = {"User-Agent": "Mozilla/5.0 (compatible; CountlyBot/1.0; +https://countly.net)"}
TODAY = datetime.now(timezone.utc).strftime("%B %Y")
_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "drip.log")


def log(m):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {m}"
    print(line)
    try:
        with open(_LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def _get(url, **kw):
    r = requests.get(url, headers=UA, timeout=40, **kw)
    r.raise_for_status()
    return r.json()


def fmt_big(n):
    n = float(n or 0)
    if n >= 1e12:
        return f"${n/1e12:.2f}T"
    if n >= 1e9:
        return f"${n/1e9:.1f}B"
    if n >= 1e6:
        return f"${n/1e6:.1f}M"
    return f"${n:,.0f}"


def fmt_int(n):
    return f"{int(n):,}"


def table(headers, rows):
    th = "".join(f"<th>{escape(h)}</th>" for h in headers)
    body = ""
    for r in rows:
        tds = "".join(
            f'<td class="cn-rich-rank">{c}</td>' if i == 0 else
            (f'<td class="cn-rich-worth">{c}</td>' if isinstance(c, str) and (c.startswith("$") or c.endswith("%")) else f"<td>{c}</td>")
            for i, c in enumerate(r)
        )
        body += f"<tr>{tds}</tr>"
    return f'<table class="cn-rich"><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table>'


def src_line(name, url):
    return (f'<p class="cn-src"><strong>Source:</strong> <a href="{url}" rel="nofollow">{escape(name)}</a> '
            f"— auto-updated {TODAY}. Figures change continuously; verify before citing.</p>")


def upsert(title, body, key_match, keyword, tags, hero=""):
    site = store.get_site("countly")
    existing = next((a for a in store.list_articles("countly") if key_match in a["title"].lower()), None)
    fields = {
        "title": title, "body_html": body,
        "excerpt": f"{title} — live data, auto-updated {TODAY}.",
        "meta_title": title[:60],
        "meta_description": f"{title} ({TODAY}). Live, auto-updated data with sources.",
        "keyword": keyword, "tags": tags,
        "image_url": hero or inline_image(keyword),
        "word_count": seo.word_count(body), "reading_time": seo.reading_time(body),
    }
    if existing:
        store.update_article(existing["id"], fields)
        return "upd"
    art = {"id": uuid.uuid4().hex[:12], "site_id": "countly", "slug": seo.make_slug(title, ""),
           "status": "published", "faq": [], "secondary_keywords": [], "is_mock": False,
           "created_at": datetime.now(timezone.utc).isoformat(), **fields}
    art["schema"] = seo.json_ld(art, site)
    store.add_article(art)
    return "new"


# ── 1. Crypto ───────────────────────────────────────────────
def feed_crypto():
    coins = _get("https://api.coingecko.com/api/v3/coins/markets",
                 params={"vs_currency": "usd", "order": "market_cap_desc", "per_page": 25, "page": 1})
    g = _get("https://api.coingecko.com/api/v3/global")["data"]
    total = g["total_market_cap"]["usd"]
    rows = []
    for i, c in enumerate(coins, 1):
        ch = c.get("price_change_percentage_24h") or 0
        rows.append([i, f'{escape(c["name"])} ({c["symbol"].upper()})',
                     f"${c['current_price']:,.2f}", fmt_big(c["market_cap"]), f"{ch:+.1f}%"])
    title = f"Top 25 Cryptocurrencies by Market Cap ({TODAY})"
    body = (f"<p>As of <strong>{TODAY}</strong>, the total cryptocurrency market is worth "
            f"<strong>{fmt_big(total)}</strong>. The largest coin is <strong>{escape(coins[0]['name'])}</strong> "
            f"at ${coins[0]['current_price']:,.0f} ({fmt_big(coins[0]['market_cap'])} market cap). "
            "This list is live and updates automatically.</p>"
            '<div class="key-takeaways"><h2>Key takeaways</h2><ul>'
            f"<li>Total crypto market cap: <strong>{fmt_big(total)}</strong>.</li>"
            f"<li>#1 {escape(coins[0]['name'])} — ${coins[0]['current_price']:,.0f}.</li>"
            f"<li>Auto-updated {TODAY} (CoinGecko).</li></ul></div>"
            f"<h2>Top 25 cryptocurrencies ({TODAY})</h2>"
            + table(["#", "Coin", "Price", "Market cap", "24h"], rows)
            + src_line("CoinGecko", "https://www.coingecko.com/"))
    return upsert(title, body, "cryptocurrencies by market cap", "cryptocurrency market cap",
                  ["Crypto", "Rankings", "Live data"], hero=coins[0].get("image", ""))


# ── 2. Currency ─────────────────────────────────────────────
_CUR = [("EUR", "Euro"), ("GBP", "British Pound"), ("JPY", "Japanese Yen"), ("CNY", "Chinese Yuan"),
        ("INR", "Indian Rupee"), ("BDT", "Bangladeshi Taka"), ("PKR", "Pakistani Rupee"),
        ("QAR", "Qatari Riyal"), ("AED", "UAE Dirham"), ("SAR", "Saudi Riyal"), ("CAD", "Canadian Dollar"),
        ("AUD", "Australian Dollar"), ("SGD", "Singapore Dollar"), ("MYR", "Malaysian Ringgit"),
        ("RUB", "Russian Ruble"), ("BRL", "Brazilian Real"), ("ZAR", "South African Rand"),
        ("NGN", "Nigerian Naira"), ("TRY", "Turkish Lira"), ("IDR", "Indonesian Rupiah"),
        ("KRW", "South Korean Won"), ("CHF", "Swiss Franc"), ("THB", "Thai Baht"), ("EGP", "Egyptian Pound")]


def feed_currency():
    d = _get("https://open.er-api.com/v6/latest/USD")
    rates = d["rates"]
    rows = [[i, f"{name} ({code})", f"{rates[code]:,.2f}"] for i, (code, name) in enumerate(_CUR, 1) if code in rates]
    title = f"US Dollar Exchange Rates Today ({TODAY})"
    body = (f"<p>Live US dollar exchange rates as of <strong>{TODAY}</strong>: "
            f"1 USD = {rates.get('BDT',0):.2f} BDT, {rates.get('INR',0):.2f} INR, {rates.get('EUR',0):.2f} EUR. "
            "Rates update daily.</p>"
            '<div class="key-takeaways"><h2>Key takeaways</h2><ul>'
            f"<li>1 USD = {rates.get('BDT',0):.2f} Bangladeshi Taka.</li>"
            f"<li>1 USD = {rates.get('INR',0):.2f} Indian Rupee.</li>"
            f"<li>Auto-updated {TODAY} (exchangerate-api).</li></ul></div>"
            f"<h2>1 USD in major currencies ({TODAY})</h2>"
            + table(["#", "Currency", "1 USD ="], rows)
            + src_line("ExchangeRate-API", "https://www.exchangerate-api.com/"))
    return upsert(title, body, "us dollar exchange rates", "usd exchange rates",
                  ["Currency", "Live data"])


# ── 3 & 4. World Bank GDP + Population ───────────────────────
def _wb_real_countries():
    d = _get("https://api.worldbank.org/v2/country", params={"format": "json", "per_page": 400})
    return {c["id"] for c in d[1] if c.get("region", {}).get("value") not in (None, "Aggregates")}


def _wb_latest(indicator, real):
    # Pull a few recent years, then keep the latest non-null value per country.
    d = _get(f"https://api.worldbank.org/v2/country/all/indicator/{indicator}",
             params={"format": "json", "per_page": 2000, "date": "2021:2024"})
    out = {}
    for row in (d[1] or []):
        iso = row.get("countryiso3code")
        val = row.get("value")
        if iso in real and val:
            name = row["country"]["value"]
            yr = int(row.get("date") or 0)
            if name not in out or yr > out[name][1]:
                out[name] = (val, yr)
    return {k: v[0] for k, v in out.items()}


def feed_worldbank():
    real = _wb_real_countries()
    results = []
    # GDP
    gdp = _wb_latest("NY.GDP.MKTP.CD", real)
    top = sorted(gdp.items(), key=lambda x: -x[1])[:50]
    rows = [[i, escape(c), fmt_big(v)] for i, (c, v) in enumerate(top, 1)]
    title = f"Top 50 Countries by GDP ({TODAY})"
    body = (f"<p>The world's largest economy is <strong>{escape(top[0][0])}</strong> with a GDP of "
            f"{fmt_big(top[0][1])}, followed by {escape(top[1][0])} ({fmt_big(top[1][1])}). Figures are the "
            "most recent available from the World Bank.</p>"
            f"<h2>Top 50 countries by GDP ({TODAY})</h2>"
            + table(["#", "Country", "GDP (USD)"], rows)
            + src_line("World Bank", "https://data.worldbank.org/indicator/NY.GDP.MKTP.CD"))
    results.append(upsert(title, body, "countries by gdp", "countries by gdp",
                          ["Countries", "Rankings", "Economy"]))
    # Population
    pop = _wb_latest("SP.POP.TOTL", real)
    top = sorted(pop.items(), key=lambda x: -x[1])[:50]
    rows = [[i, escape(c), fmt_int(v)] for i, (c, v) in enumerate(top, 1)]
    title = f"Top 50 Countries by Population ({TODAY})"
    body = (f"<p>The most populous country is <strong>{escape(top[0][0])}</strong> with {fmt_int(top[0][1])} "
            f"people, ahead of {escape(top[1][0])} ({fmt_int(top[1][1])}). World Bank, most recent data.</p>"
            f"<h2>Top 50 countries by population ({TODAY})</h2>"
            + table(["#", "Country", "Population"], rows)
            + src_line("World Bank", "https://data.worldbank.org/indicator/SP.POP.TOTL"))
    results.append(upsert(title, body, "countries by population", "countries by population",
                          ["Countries", "Rankings", "Population"]))
    return results


# ── 5. GitHub ───────────────────────────────────────────────
def feed_github():
    d = _get("https://api.github.com/search/repositories",
             params={"q": "stars:>50000", "sort": "stars", "order": "desc", "per_page": 25})
    items = d.get("items", [])
    rows = [[i, f'{escape(r["full_name"])}', fmt_int(r["stargazers_count"]),
             escape(r.get("language") or "—")] for i, r in enumerate(items, 1)]
    title = f"Most Starred GitHub Repositories ({TODAY})"
    body = (f"<p>The most-starred project on GitHub is <strong>{escape(items[0]['full_name'])}</strong> with "
            f"{fmt_int(items[0]['stargazers_count'])} stars. Auto-updated {TODAY}.</p>"
            f"<h2>Top 25 GitHub repositories by stars ({TODAY})</h2>"
            + table(["#", "Repository", "Stars", "Language"], rows)
            + src_line("GitHub", "https://github.com/search?q=stars:%3E50000&s=stars"))
    return upsert(title, body, "most starred github", "most starred github repositories",
                  ["Tech", "Rankings", "Live data"])


def main():
    feeds = [("crypto", feed_crypto), ("currency", feed_currency),
             ("worldbank", feed_worldbank), ("github", feed_github)]
    for name, fn in feeds:
        try:
            r = fn()
            log(f"[data-feeds] {name}: {r}")
        except Exception as e:
            log(f"[data-feeds] {name} FAILED: {str(e)[:140]}")
    log("=== data-feeds done ===")


if __name__ == "__main__":
    main()
