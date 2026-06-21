"""Article writer — agent 3, the core. DeepSeek writes an SEO-optimised article
using the keyword cluster + competitor brief. Falls back to a structured mock so
the whole pipeline runs even with no API key.

Output is a dict: {title, excerpt, body_html, tags, faq, key_takeaways}.
body_html is clean semantic HTML (no <h1> — the title is rendered separately).
"""
from modules.llm import have_llm, chat
from modules.json_utils import parse_llm_json

SYSTEM = """You are an elite SEO content writer and subject-matter expert.
You write articles that rank #1 on Google because they are genuinely the most useful,
accurate, well-structured page on the topic (Google's "helpful content" + E-E-A-T).

Hard rules:
- Output clean SEMANTIC HTML for the body only. Allowed tags: <h2> <h3> <p> <ul> <ol> <li>
  <strong> <em> <blockquote> <table> <thead> <tbody> <tr> <th> <td> <a>.
- NO <h1> (the title is shown separately). NO markdown. NO <html>/<head>/<body> wrappers.
- Open with a 2-3 sentence hook that answers the searcher's intent immediately.
- Use the primary keyword in the first paragraph and naturally throughout (no stuffing).
- Cover every required subtopic. Use descriptive <h2>/<h3> that read like real questions/sections.
- Be concrete: real steps, numbers, examples.
- ALWAYS include at least one HTML <table> with a <thead> and <tbody> presenting real
  comparative/structured data (e.g. requirements, costs, pros/cons, timelines, specs).
  Use a second table when the topic warrants it. Tables must have meaningful headers.
- Add a short checklist (<ul>) where useful.
- Write for humans first. Confident, clear, no fluff, no "in conclusion".
Return ONLY JSON."""


def _user_prompt(site, title, kw, comp):
    secondary = ", ".join(kw.get("secondary", [])[:7])
    must = "\n".join(f"- {m}" for m in comp.get("must_cover", []))
    return f"""Site: {site['name']} — {site['niche']}
Voice/tone: {site['tone']}
Audience: {site['audience']}
Language: write in {site['language']}.

Working title: "{title}"
PRIMARY keyword (must rank for): {kw.get('primary')}
Secondary keywords to weave in: {secondary}
Search intent: {kw.get('intent')}
Target length: ~{comp.get('target_word_count', site.get('default_word_count', 1500))} words
Winning angle: {comp.get('angle','')}

Must cover (from competitor analysis):
{must}

Return JSON:
{{
  "title": "final SEO title, <=60 chars, compelling, includes primary keyword",
  "excerpt": "1-2 sentence meta-description-ready summary (<=155 chars)",
  "body_html": "the full article body as semantic HTML per the rules",
  "tags": ["5-8 topical tags"],
  "faq": [{{"q": "question", "a": "concise answer"}}],
  "key_takeaways": ["3-5 bullet summary points"]
}}"""


def _mock(site, title, kw, comp):
    primary = kw.get("primary", title)
    sections = comp.get("must_cover") or ["Overview", "How it works", "Requirements", "Tips"]
    secondary = kw.get("secondary", [])
    body = [f"<p><strong>{title}</strong> — this is a <em>placeholder</em> article "
            f"(mock mode, no API key). Add <code>DEEPSEEK_API_KEY</code> to <code>.env</code> "
            f"for real, SEO-optimised content about <em>{primary}</em>. The layout, tables and "
            f"styling below are exactly what the real articles use.</p>"]
    # A sample overview table so the premium table design is visible in mock mode.
    body.append(
        "<h2>Quick overview</h2>"
        "<table><thead><tr><th>Aspect</th><th>Details</th><th>Typical range</th></tr></thead>"
        "<tbody>"
        f"<tr><td>Topic</td><td>{primary}</td><td>—</td></tr>"
        "<tr><td>Difficulty</td><td>Beginner-friendly</td><td>Low–Medium</td></tr>"
        "<tr><td>Time needed</td><td>Reading + action</td><td>15–45 min</td></tr>"
        "<tr><td>Cost</td><td>Varies by case</td><td>$0–$500</td></tr>"
        "</tbody></table>")
    for i, s in enumerate(sections):
        body.append(f"<h2>{s}</h2><p>Detailed, keyword-rich content about "
                    f"\"{s.lower()}\" relating to {primary} would appear here. "
                    f"Real articles weave in secondary keywords naturally.</p>")
        if i == 0 and secondary:
            body.append("<h3>Checklist</h3><ul>"
                        + "".join(f"<li>{k}</li>" for k in secondary[:4]) + "</ul>")
        if i == 1:
            body.append(
                "<h3>Comparison</h3>"
                "<table><thead><tr><th>Option</th><th>Pros</th><th>Cons</th><th>Best for</th></tr></thead>"
                "<tbody>"
                "<tr><td>Option A</td><td>Fast, simple</td><td>Limited</td><td>Beginners</td></tr>"
                "<tr><td>Option B</td><td>Flexible</td><td>More steps</td><td>Most people</td></tr>"
                "<tr><td>Option C</td><td>Powerful</td><td>Complex</td><td>Advanced users</td></tr>"
                "</tbody></table>")
    return {
        "title": title,
        "excerpt": f"A practical guide to {primary}.",
        "body_html": "\n".join(body),
        "tags": [primary] + kw.get("secondary", [])[:4],
        "faq": [{"q": f"What is {primary}?",
                 "a": f"{primary} is the focus of this guide."}],
        "key_takeaways": [f"Understand {primary}", "Follow the step-by-step section",
                          "Avoid the common mistakes"],
        "mock": True,
    }


def write_article(site: dict, title: str, kw: dict, comp: dict) -> dict:
    if not have_llm():
        return _mock(site, title, kw, comp)
    raw = chat(SYSTEM, _user_prompt(site, title, kw, comp),
               temperature=0.7, max_tokens=8000, json_mode=True)
    data = parse_llm_json(raw)
    # Guard required fields
    data.setdefault("title", title)
    data.setdefault("excerpt", "")
    data.setdefault("body_html", "")
    data.setdefault("tags", [])
    data.setdefault("faq", [])
    data.setdefault("key_takeaways", [])
    return data
