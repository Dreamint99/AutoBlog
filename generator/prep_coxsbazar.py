"""Cox's Bazar: set the sea-view photo as feature, inject 3 more photos as inline figures,
write data/countly_coxsbazar.json ready for insert_walvi_articles.py ... countly."""
import json
import sys

BASE = "https://countly.net/coxsbazar"
FEATURE = f"{BASE}/coxsbazar-4.png"

FIGS = [
    ("coxsbazar-3.png",
     "Green cliffs behind a wide sandy beach near Cox's Bazar",
     "Green cliffs rise behind a wide sandy beach along the coast south of Cox's Bazar."),
    ("coxsbazar-1.png",
     "Marine Drive winding through green hills near Cox's Bazar",
     "The winding Marine Drive threads through green hills toward Himchari and Inani."),
    ("coxsbazar-2.png",
     "Wooden fishing boats moored near Cox's Bazar",
     "Wooden fishing boats moored near Cox's Bazar — fishing anchors daily life along this coast."),
]


def fig_html(f, alt, cap):
    return (f'\n<figure class="post-image"><img src="{BASE}/{f}" alt="{alt}" loading="lazy" />'
            f'<figcaption>{cap}</figcaption></figure>\n')


def main(src, out="data/countly_coxsbazar.json"):
    a = json.load(open(src, encoding="utf-8"))["result"]["articles"][0]
    a["image_url"] = FEATURE
    body = a["body_html"]

    ends = []
    i = body.find("</h2>")
    while i != -1:
        ends.append(i + len("</h2>"))
        i = body.find("</h2>", i + 1)

    targets = ends[1:1 + len(FIGS)]  # after 2nd..4th h2
    for pos, (f, alt, cap) in sorted(zip(targets, FIGS), key=lambda x: -x[0]):
        body = body[:pos] + fig_html(f, alt, cap) + body[pos:]

    a["body_html"] = body
    json.dump({"articles": [a]}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"feature={FEATURE}")
    print(f"injected {len(targets)} figures; body {len(body)} chars -> {out}")


if __name__ == "__main__":
    main(sys.argv[1])
