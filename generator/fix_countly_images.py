"""One-off: replace flaky Pollinations image URLs on existing Countly articles
with reliable Pixabay photos (feature image + every inline <img>). Writes to
Supabase → live instantly (force-dynamic pages)."""
import os
import re
import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store
from modules.image import feature_image, inline_image, short_query, _subject_terms


def _fix_body(body: str, site: dict) -> str:
    """Recompute EVERY inline <img> from its alt/caption so named entities (banks,
    universities, companies) get a real Wikipedia image instead of a random photo."""
    def repl(m: re.Match) -> str:
        tag = m.group(0)
        alt_m = re.search(r'alt="([^"]*)"', tag)
        alt = (alt_m.group(1) if alt_m else "").strip() or "statistics data"
        new = inline_image(alt)
        return re.sub(r'src="[^"]*"', f'src="{new}"', tag, count=1)

    return re.sub(r"<img\b[^>]*>", repl, body)


def main():
    site = store.get_site("countly")
    arts = store.list_articles("countly")
    fixed = 0
    for a in arts:
        fields = {}
        title = a.get("title", "")
        fu = a.get("image_url", "") or ""
        # Re-image the hero if it's a flaky Pollinations URL OR a listicle whose
        # hero should be on-topic (subject-relevant). Leave good storage images alone.
        if "pollinations" in fu or _subject_terms(title):
            fields["image_url"] = feature_image(title, site)
        body = a.get("body_html", "") or ""
        if "<img" in body:
            new_body = _fix_body(body, site)
            if new_body != body:
                fields["body_html"] = new_body
        if fields:
            try:
                store.update_article(a["id"], fields)
                fixed += 1
                print("fixed:", a.get("title", "")[:55])
            except Exception as e:
                print("FAIL", a.get("id"), str(e)[:100])
    print(f"=== done: {fixed} articles re-imaged ===")


if __name__ == "__main__":
    main()
