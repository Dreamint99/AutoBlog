"""Copy the shared card renderer (bmet_card.js) into the BMET WordPress snippet between the @CARD markers."""
import os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, "bmet_card.js"), encoding="utf-8").read()
card = src[src.index("/*@CARD*/"):src.index("/*@CARD-END*/") + 13]
for p in (os.path.join(here, "wp_snippets", "probashiinfo-bmet.php"), r"M:/Code/probashi-bondhu/promo/probashiinfo-bmet.php"):
    if os.path.exists(p):
        t = open(p, encoding="utf-8").read()
        t = t[:t.index("/*@CARD*/")] + card + t[t.index("/*@CARD-END*/") + 13:]
        open(p, "w", encoding="utf-8").write(t)
        print("synced", p)
