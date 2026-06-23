"""One-off: 5 GROUNDED news articles on the Anthropic Fable 5 / Mythos 5 shutdown.

Sensitive topic (real company, agencies, named officials + an UNCONFIRMED breach
claim). So we do NOT let the model freewheel: a fixed verified-facts brief +
strict guardrails are injected, and a real Sources block is appended (not LLM
links). Published to AINews (the AI-news site), as DRAFT for human review first.

Usage:  python gen_fable_news.py            # draft (default, recommended)
        python gen_fable_news.py publish    # publish live
"""
import sys, os, uuid
from datetime import datetime, timezone

for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store, seo
from modules.llm import chat, have_llm
from modules.image import feature_image
from modules.json_utils import parse_llm_json

SITE_ID = "ainews"
STATUS = "published" if (len(sys.argv) > 1 and sys.argv[1] == "publish") else "draft"

FACTS = """VERIFIED FACTS (state these as fact; sourced to Anthropic's own statement + Bloomberg, Fortune, TechCrunch, National Law Review):
- Anthropic had two models: Claude Fable 5 and Claude Mythos 5 (Fable 5 was recently/publicly released).
- On June 12, 2026 (~5:21pm ET) Anthropic received a US government EXPORT-CONTROL directive to suspend access to Fable 5 and Mythos 5 for ANY foreign national (inside or outside the US, including foreign-national Anthropic employees), citing national security.
- This is the FIRST time the US applied export controls to an AI MODEL rather than to hardware/chips.
- To comply, Anthropic DISABLED Fable 5 and Mythos 5 for ALL customers. Other Claude models were unaffected.
- Trigger: the government believed it became aware of a method to bypass / "jailbreak" Fable 5. Per Anthropic, the demonstrated technique identified only a small number of previously known, MINOR vulnerabilities.
- Anthropic DISAGREES that a narrow jailbreak should cause recalling a model used by hundreds of millions; it calls this a misunderstanding and says it is working to restore access.

UNCONFIRMED / DISPUTED (NEVER state as established fact — always attribute + flag as unconfirmed):
- A claim that Mythos "broke into almost all NSA classified systems in hours" — reported by some outlets (IBTimes UK, TipRanks, Cyber Security News), attributed to Senator Mark Warner saying General Joshua Rudd (NSA / US Cyber Command) told him directly.
- This has NOT been publicly confirmed by any government agency; there is NO official NSA confirmation.
- Anthropic's account: the flagged behavior was asking the model to analyze a codebase and fix identified issues — NOT an autonomous offensive intrusion.
- The "Trump personally ordered it" / "Amazon discovered the jailbreak" framings circulating on social media are NOT established by the reputable sources — do not assert them as fact."""

GUARDRAILS = """HARD RULES:
- This is real journalism about real people and a real company. Be accurate and neutral.
- Clearly SEPARATE what is confirmed from what is unconfirmed. Include a short "What's confirmed vs what isn't" section.
- For the NSA-breach claim use language like "reportedly", "an unconfirmed claim", "has not been confirmed by any agency", and include Anthropic's dispute.
- Do NOT invent quotes, dates, numbers, or details beyond the brief.
- No sensationalism, no clickbait that misstates facts.
- Semantic HTML body only (<h2> <h3> <p> <ul> <ol> <li> <strong> <em> <blockquote> <table> <thead> <tbody> <tr> <th> <td>). NO <h1>, NO markdown. Open with a 2-3 sentence direct summary."""

ANGLES = [
    ("US Government Forces Anthropic to Shut Down Fable 5 and Mythos 5",
     "A clear news explainer with a timeline of the June 2026 export-control directive and the full shutdown."),
    ("Did Anthropic's Mythos AI Really Hack the NSA? Fact Check",
     "A fact-check that carefully separates the confirmed shutdown from the unconfirmed NSA-breach claim, with Anthropic's dispute."),
    ("First-Ever Export Controls on an AI Model: Why It Matters",
     "A policy explainer on the precedent of export-controlling a model (not hardware) and what it could mean for AI governance."),
    ("Fable 5 and Mythos 5 Shutdown: What Developers Should Do Now",
     "A practical impact guide: who is affected, fallback models, and how to handle the abrupt removal."),
    ("The AI Jailbreak Behind the Fable 5 Shutdown, Explained",
     "A security explainer: what an LLM jailbreak is, why a 'minor' one triggered an unprecedented response, and the safety debate."),
]

SOURCES_HTML = (
    '<h2>Sources</h2><ul>'
    '<li><a href="https://www.anthropic.com/news/fable-mythos-access" rel="nofollow noopener" target="_blank">Anthropic — Statement on the US government directive to suspend access to Fable 5 and Mythos 5</a></li>'
    '<li><a href="https://www.bloomberg.com/news/articles/2026-06-13/anthropic-says-us-limits-foreign-access-to-fable-5-mythos-5" rel="nofollow noopener" target="_blank">Bloomberg</a></li>'
    '<li><a href="https://fortune.com/2026/06/13/anthropic-disables-fable-mythos-export-controls-national-security-threat/" rel="nofollow noopener" target="_blank">Fortune</a></li>'
    '<li><a href="https://techcrunch.com/2026/06/12/anthropics-safety-warnings-may-have-just-backfired-the-government-has-pulled-the-plug-on-its-most-powerful-ai/" rel="nofollow noopener" target="_blank">TechCrunch</a></li>'
    '<li><a href="https://natlawreview.com/article/ai-company-anthropic-suspends-access-claude-fable-5-claude-mythos-5-following-us" rel="nofollow noopener" target="_blank">National Law Review</a></li>'
    '</ul>'
    '<p><em>This article distinguishes confirmed facts from unconfirmed claims as of June 2026; details may evolve. Verify against primary sources.</em></p>'
)


def write_one(site, title, angle):
    system = (
        "You are a careful technology news reporter for an AI news publication. "
        "You write accurate, neutral, well-structured articles and never fabricate.\n\n"
        + FACTS + "\n\n" + GUARDRAILS + "\n\nReturn ONLY JSON."
    )
    user = (
        f"Write the article for this angle: {angle}\nWorking title: \"{title}\"\n"
        f"Audience: {site['audience']}. Length ~1100-1500 words.\n\n"
        'Return JSON: {"title","excerpt"(<=155),"meta_title"(<=60),"meta_description"(<=155),'
        '"keyword","secondary_keywords":[],"tags":[],"body_html","key_takeaways":[],"faq":[{"q","a"}]}'
    )
    return parse_llm_json(chat(system, user, temperature=0.4, max_tokens=8000, json_mode=True))


def main():
    if not have_llm():
        print("no LLM key"); return
    site = next((s for s in store.load_sites() if s["id"] == SITE_ID), None)
    if not site:
        print(f"site {SITE_ID} not found"); return
    print(f"=== Fable/Mythos news → {SITE_ID} ({STATUS}) ===")
    for i, (title, angle) in enumerate(ANGLES, 1):
        try:
            d = write_one(site, title, angle)
            final_title = d.get("title") or title
            body = seo.assemble_body({
                "body_html": (d.get("body_html") or "") + SOURCES_HTML,
                "key_takeaways": d.get("key_takeaways", []),
                "faq": d.get("faq", []),
            })
            aid = uuid.uuid4().hex[:12]
            art = {
                "id": aid, "site_id": SITE_ID, "title": final_title,
                "slug": seo.make_slug(final_title, aid),
                "meta_title": d.get("meta_title") or seo.meta_title(final_title, site["name"]),
                "meta_description": d.get("meta_description") or seo.meta_description(d.get("excerpt", ""), body),
                "excerpt": d.get("excerpt", ""), "body_html": body,
                "tags": d.get("tags", []), "faq": d.get("faq", []),
                "keyword": d.get("keyword", final_title),
                "secondary_keywords": d.get("secondary_keywords", []),
                "image_url": feature_image(final_title, site, d.get("keyword", "artificial intelligence security")),
                "word_count": seo.word_count(body), "reading_time": seo.reading_time(body),
                "status": STATUS, "is_mock": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            art["schema"] = seo.json_ld(art, site)
            store.add_article(art)
            print(f"[{i}/5] {STATUS}: {final_title} ({art['word_count']}w)  /{art['slug']}")
        except Exception as e:
            print(f"[{i}/5] FAIL {title} — {type(e).__name__}: {e}")
    print("done. Review drafts in /manage, then publish." if STATUS == "draft" else "done (live).")


if __name__ == "__main__":
    main()
