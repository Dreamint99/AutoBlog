"""Take the Tanguar Haor workflow output, set the real houseboat photo as the feature
image, inject the other 4 photos as inline figures, and write data/countly_tanguar.json
ready for insert_walvi_articles.py ... countly."""
import json
import sys

BASE = "https://countly.net/tanguar"
FEATURE = f"{BASE}/houseboat-1.webp"

# (file, alt, caption) — inserted after successive <h2> sections (skipping the first).
FIGS = [
    ("houseboat-2.webp",
     "Wooden luxury houseboat on Tanguar Haor",
     "A wooden two-deck houseboat (bojra) on Tanguar Haor — the classic overnight option."),
    ("houseboat-3.webp",
     "Aerial view of a Tanguar Haor houseboat with sun-deck and small boats",
     "A large houseboat with an open sun-deck, trailed by the small wooden boats used for side trips to the watchtower and lakes."),
    ("houseboat-4.webp",
     "Inside a Tanguar Haor houseboat cabin with twin beds",
     "Inside a houseboat cabin — simple twin beds, woven-bamboo walls and fans for overnight trips."),
    ("houseboat-5.webp",
     "Home-style Bengali meal served on a Tanguar Haor houseboat",
     "Meals on board are usually home-style Bengali food — rice, chicken, haor fish and fresh salad."),
]


def fig_html(f, alt, cap):
    return (f'\n<figure class="post-image"><img src="{BASE}/{f}" alt="{alt}" loading="lazy" />'
            f'<figcaption>{cap}</figcaption></figure>\n')


def main(src, out="data/countly_tanguar.json"):
    a = json.load(open(src, encoding="utf-8"))["result"]["articles"][0]
    a["image_url"] = FEATURE
    body = a["body_html"]

    # positions just after each </h2>; skip index 0 (the key-takeaways heading)
    ends = []
    i = body.find("</h2>")
    while i != -1:
        ends.append(i + len("</h2>"))
        i = body.find("</h2>", i + 1)

    targets = ends[1:1 + len(FIGS)]  # after 2nd..5th h2
    # insert from last to first so earlier offsets stay valid
    for pos, (f, alt, cap) in sorted(zip(targets, FIGS), key=lambda x: -x[0]):
        body = body[:pos] + fig_html(f, alt, cap) + body[pos:]

    a["body_html"] = body
    json.dump({"articles": [a]}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"feature={FEATURE}")
    print(f"injected {len(targets)} figures; body now {len(body)} chars -> {out}")


if __name__ == "__main__":
    main(sys.argv[1])
