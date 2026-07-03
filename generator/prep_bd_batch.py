"""Prep the 5-article BD batch: attach Wikimedia feature+figures to the 3 travel guides,
inject figures into the resorts listicle, leave the hotels listicle on its pollinations image.
Writes data/countly_bd_batch.json for insert_walvi_articles.py ... countly."""
import html
import json
import sys

IMGS = json.load(open("data/bd_images.json", encoding="utf-8"))

GUIDE_KEY = {
    "bandarban-trip-guide-2026": "bandarban",
    "rajshahi-trip-guide-2026": "rajshahi",
    "kuakata-travel-guide-2026": "kuakata",
}
RESORTS = "top-10-resorts-in-bangladesh-2026"


def fig_html(f):
    src = html.escape(f["url"], quote=True)
    alt = html.escape(f["alt"], quote=True)
    return (f'\n<figure class="post-image"><img src="{src}" alt="{alt}" loading="lazy" />'
            f'<figcaption>{html.escape(f["cap"])} <span class="img-credit">Photo: Wikimedia Commons</span></figcaption></figure>\n')


def inject(body, figs):
    ends = []
    i = body.find("</h2>")
    while i != -1:
        ends.append(i + len("</h2>"))
        i = body.find("</h2>", i + 1)
    targets = ends[1:1 + len(figs)]
    for pos, f in sorted(zip(targets, figs), key=lambda x: -x[0]):
        body = body[:pos] + fig_html(f) + body[pos:]
    return body, len(targets)


def main(src, out="data/countly_bd_batch.json"):
    arts = json.load(open(src, encoding="utf-8"))["result"]["articles"]
    for a in arts:
        slug = a["slug"]
        if slug in GUIDE_KEY:
            d = IMGS[GUIDE_KEY[slug]]
            a["image_url"] = d["feature"]
            a["body_html"], n = inject(a["body_html"], d["figs"])
            print(f"  {slug}: feature+{n} Wikimedia figs")
        elif slug == RESORTS:
            a["body_html"], n = inject(a["body_html"], IMGS["resorts_figs"])
            print(f"  {slug}: pollinations feature +{n} figs")
        else:
            print(f"  {slug}: pollinations feature (no injected figs)")
    json.dump({"articles": arts}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"-> {out}  ({len(arts)} articles)")


if __name__ == "__main__":
    main(sys.argv[1])
