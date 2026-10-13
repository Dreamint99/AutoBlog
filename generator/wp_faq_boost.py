"""Answer the real searches a probashiinfo post already ranks 8-20 for, inside that post.

Search Console (data/gsc_probashiinfo.json) lists, per page, the queries people typed. Where a
query reaches the page but the page sits at position 8+ (bottom of page 1 / page 2), the post
gets an "আরও প্রশ্ন" section: one short, direct answer per query, written ONLY from facts already
in the article (or "অফিসিয়াল সূত্রে যাচাই করুন" when the article does not say). Answering the exact
question is what lifts a page into the top results and into AI answers. FAQPage JSON-LD is added
for the same Q&A.

    python wp_faq_boost.py            # dry run: print the Q&A per post
    python wp_faq_boost.py --apply [N]

Rerunning replaces the section (marked <!-- ab-faq -->), so it stays one block per post.
"""
import json
import os
import re
import sys
import time
import urllib.parse

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import llm  # noqa: E402
from wp_ctr import wp, find_post, plain  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data", "gsc_probashiinfo.json")
APPLY = "--apply" in sys.argv
LIMIT = next((int(a) for a in sys.argv[1:] if a.isdigit()), 0)
BLOCK = re.compile(r"\s*<!-- ab-faq -->.*?<!-- /ab-faq -->", re.S)

SYSTEM = """You answer search questions for a Bangla website for Bangladeshi migrant workers.
Return JSON: {"faq": [{"q": "...", "a": "..."}]}.
- One item per given search query, in the same order. Rewrite the query as a natural Bangla question for "q".
- "a": 1-3 short sentences in correct, fluent Bangla that answer directly (a number, a yes/no, a step) using ONLY facts present in the article text.
- If the article does not contain the answer, say so plainly and point to the official source (e.g. বিএমইটি, দূতাবাস) — never guess numbers, fees, dates or laws.
- No markdown, no emoji."""


def main():
    pages = json.load(open(DATA, encoding="utf-8"))["pages"]
    targets = []
    for p in pages:
        qs = [q for q, imp, clk, pos in p["queries"] if q != "(unknown)" and imp >= 30 and pos >= 8 and len(q.split()) >= 2]
        if qs:
            targets.append((p, qs[:6]))
    targets.sort(key=lambda t: -t[0]["impressions"])
    if LIMIT:
        targets = targets[:LIMIT]
    print(f"{len(targets)} posts to boost ({'APPLY' if APPLY else 'dry run'})")
    done = 0
    for p, qs in targets:
        post = find_post(p["url"])
        if not post:
            print("  - no published post for", urllib.parse.unquote(p["url"])[-60:])
            continue
        html = BLOCK.sub("", post["content"]["raw"])
        user = "Search queries:\n" + "\n".join(f"- {q}" for q in qs) + f"\n\nArticle text:\n{plain(html, 6000)}"
        faq, problem = [], ""
        for _ in range(3):
            try:
                out = json.loads(llm.chat(SYSTEM, user + (f"\n\nPrevious answer rejected: {problem}" if problem else ""),
                                          temperature=0.3, max_tokens=2200, json_mode=True))["faq"]
            except Exception as e:
                problem = f"invalid JSON ({e}); keep answers short"
                continue
            seen, faq = set(), []
            for f in out:
                key = re.sub(r"\W+", "", f.get("q", ""))
                if f.get("q") and f.get("a") and len(f["a"]) < 600 and key not in seen:
                    seen.add(key)
                    faq.append(f)
            if any(re.search(r"[ऀ-ॿ]", f["q"] + f["a"]) for f in faq):  # Hindi script leaking into Bangla
                problem = "it contains Hindi/Devanagari characters; write only Bangla script"
                faq = []
                continue
            break
        faq = faq[:6]
        if not faq:
            print("  ! no usable answers:", problem)
            continue
        if not faq:
            continue
        print(f"\n#{post['id']} {p['impressions']} impr | {plain(post['title']['raw'], 70)}")
        for f in faq:
            print(f"  Q {f['q']}\n  A {f['a']}")
        if not APPLY:
            continue
        esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        items = "".join(f"<h3>{esc(f['q'])}</h3>\n<p>{esc(f['a'])}</p>\n" for f in faq)
        ld = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in faq]}, ensure_ascii=False)
        block = (f"\n<!-- ab-faq -->\n<h2>আরও প্রশ্ন ও উত্তর</h2>\n{items}"
                 f'<script type="application/ld+json">{ld}</script>\n<!-- /ab-faq -->')
        # keep the photo-credit line last
        m = re.search(r'\s*<p class="ab-photo-credit"', html)
        new = html[:m.start()] + block + html[m.start():] if m else html.rstrip() + block
        r = wp("POST", f"wp/v2/posts/{post['id']}", json={"content": new})
        print("  →", r.status_code)
        done += 1
        time.sleep(1)
    print(f"\n{done} posts boosted")


if __name__ == "__main__":
    main()
