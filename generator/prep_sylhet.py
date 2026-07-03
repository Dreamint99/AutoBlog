"""Sylhet: set the Wikimedia feature image, inject 4 Wikimedia figures, write
data/countly_sylhet.json ready for insert_walvi_articles.py ... countly.
Images come from data/sylhet_images.json (Wikimedia Commons thumb URLs)."""
import html
import json
import sys

IMGS = json.load(open("data/sylhet_images.json", encoding="utf-8"))


def fig_html(f):
    src = html.escape(f["url"], quote=True)
    alt = html.escape(f["alt"], quote=True)
    return (f'\n<figure class="post-image"><img src="{src}" alt="{alt}" loading="lazy" />'
            f'<figcaption>{html.escape(f["cap"])} <span class="img-credit">Photo: Wikimedia Commons</span></figcaption></figure>\n')


def main(src, out="data/countly_sylhet.json"):
    a = json.load(open(src, encoding="utf-8"))["result"]["articles"][0]
    a["image_url"] = IMGS["feature"]
    body = a["body_html"]

    ends = []
    i = body.find("</h2>")
    while i != -1:
        ends.append(i + len("</h2>"))
        i = body.find("</h2>", i + 1)

    figs = IMGS["figs"]
    targets = ends[1:1 + len(figs)]  # after 2nd..5th h2
    for pos, f in sorted(zip(targets, figs), key=lambda x: -x[0]):
        body = body[:pos] + fig_html(f) + body[pos:]

    a["body_html"] = body
    json.dump({"articles": [a]}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"feature={IMGS['feature'][:70]}")
    print(f"injected {len(targets)} Wikimedia figures; body {len(body)} chars -> {out}")


if __name__ == "__main__":
    main(sys.argv[1])
