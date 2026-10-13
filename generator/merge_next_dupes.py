"""Merge duplicate articles on the Next.js sites: every non-keeper row gets
status 'redirect:<keeper>' (the site 301s it; nothing is deleted, revert by setting
status back to 'published').

Groups come from data/merge_groups_next.json (same topic headline, same years/places);
KEEP picks the page Search Console already shows (last 90 days, 2026-10-13), else the
longest article. SKIP lists groups that only look alike.

    python merge_next_dupes.py           # dry run
    python merge_next_dupes.py --apply
"""
import json
import os
import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fix_site_images import d1, q  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
GROUPS = json.load(open(os.path.join(HERE, "data", "merge_groups_next.json"), encoding="utf-8"))
APPLY = "--apply" in sys.argv

# (site, group index) → keeper slug, from Search Console impressions
KEEP = {
    ("countly", 1): "chatgpt-users-2026-400m-monthly-active-demographics",
    ("countly", 2): "tiktok-users-by-country-2026-top-rankings-growth-trends",
    ("countly", 4): "how-many-people-use-chatgpt-in-2026-global-users-trends",
    ("walvi", 1): "poland-work-permit-2026-costs-salary-visa-guide",
    ("walvi", 2): "europe-work-permit-without-ielts-9-countries-that-dont-requi",
    ("walvi", 4): "bangladesh-to-croatia-work-visa-2026-cost-process",
    ("walvi", 5): "bangladesh-to-slovakia-work-permit-2026-cost-process",
    ("walvi", 6): "bangladesh-to-hungary-work-visa-2026-cost-process-salary",
    ("walvi", 12): "cost-of-living-savings-in-poland-2026-how-much-can-a-foreign",
    ("walvi", 13): "electrician-salary-poland-2026-realistic-pay-work-permit-guide",
    ("walvi", 16): "welder-salary-poland-2026-complete-net-pay-savings-work-visa",
    ("walvi", 19): "saudi-visa-status-2026-official-check-guide",
    ("walvi", 21): "saudi-visa-status-2026-official-check-guide",  # same topic as group 19
    ("infkey", 1): "prompt-caching-2026-cut-ai-api-bills-by-90",
    ("gccguide", 0): "best-coworking-spaces-doha-2025-flexi-desk-prices-cafe-guide",
    ("ninetymins", 3): "international-football-matches-today-2026-tv-guide",  # clean slug over "-2"
}
SKIP = {
    ("walvi", 9),    # Latvia documents checklist vs processing time: different questions
    ("infkey", 2),   # vLLM vs TGI break-even vs self-hosted vs API: different comparisons
    ("infkey", 11),  # text-to-speech vs speech-to-text: opposite tasks
}


def main():
    sql, n = [], 0
    for site, groups in GROUPS.items():
        for i, g in enumerate(groups):
            if (site, i) in SKIP:
                continue
            keep = KEEP.get((site, i), g[0])
            for slug in g:
                if slug == keep:
                    continue
                print(f"{site}: {slug} → {keep}")
                sql.append(f"UPDATE articles SET status={q('redirect:' + keep)} WHERE site_id={q(site)} AND slug={q(slug)} AND status='published';")
                n += 1
    print(f"{n} articles to redirect")
    if APPLY and sql:
        import tempfile
        with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f:
            f.write("\n".join(sql))
        d1(file=f.name)
        os.unlink(f.name)
        print("applied")


if __name__ == "__main__":
    main()
