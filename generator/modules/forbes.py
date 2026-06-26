"""Forbes Real-Time Billionaires data (real, current net-worth figures).

Uses the public JSON feed that powers forbes.com's real-time billionaires page.
Net worth is returned in USD billions. Lets the Countly "richest people" reports
carry REAL, auto-updatable numbers instead of LLM guesses.
"""
import requests

_UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}
_URL = "https://www.forbes.com/forbesapi/person/rtb/0/position/true.json"


def fetch_billionaires(country: str | None = None, limit: int | None = None) -> list[dict]:
    """Return billionaires sorted by net worth desc. Optionally filter by country
    of citizenship. Each item: rank, name, worth_b (USD billions), country, source,
    industry. Returns [] on any failure (caller decides fallback)."""
    try:
        r = requests.get(_URL, headers=_UA, timeout=45)
        r.raise_for_status()
        people = (r.json().get("personList") or {}).get("personsLists") or []
    except Exception:
        return []

    out: list[dict] = []
    for p in people:
        c = p.get("countryOfCitizenship") or ""
        if country and c.strip().lower() != country.strip().lower():
            continue
        worth_m = p.get("finalWorth") or 0  # USD millions
        inds = p.get("industries") or []
        out.append({
            "rank": p.get("rank"),
            "name": (p.get("personName") or p.get("name") or "").strip(),
            "worth_b": round((worth_m or 0) / 1000.0, 1),
            "country": c,
            "source": (p.get("source") or "").strip(),
            "industry": (inds[0] if inds else "").strip(),
        })
    out.sort(key=lambda x: -(x["worth_b"] or 0))
    if limit:
        out = out[:limit]
    return out


def fmt_worth(b: float) -> str:
    """$941.8B / $12.3B / $920M for sub-billion."""
    if b is None:
        return "—"
    if b >= 1:
        return f"${b:,.1f}B"
    return f"${int(round(b * 1000))}M"
