"""High-search AI/tech data articles for Countly (like the viral OpenAI Revenue page).
Deterministic — real, widely-reported figures framed as reported/estimated, with
tables + comparison + FAQ + schema. Upserts into Supabase (countly)."""
import os
import sys
import uuid
from datetime import datetime, timezone
from html import escape

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import store, seo
from modules.image import feature_image

TODAY = datetime.now(timezone.utc).strftime("%B %Y")
SRC = ('<p class="cn-src">Figures are reported or best-available estimates as of '
       f'{TODAY} and change over time — verify against company filings and official '
       "sources before citing.</p>")


def table(headers, rows):
    th = "".join(f"<th>{escape(h)}</th>" for h in headers)
    body = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f"<table><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table>"


def build(title, keyword, secondary, quick, takeaways, sections, faq, img_q, tags):
    parts = [f"<p>{quick}</p>",
             '<div class="key-takeaways"><h2>Key takeaways</h2><ul>'
             + "".join(f"<li>{t}</li>" for t in takeaways) + "</ul></div>"]
    for h2, html in sections:
        parts.append(f"<h2>{escape(h2)}</h2>" + html)
    parts.append("<h2>Frequently asked questions</h2>"
                 + "".join(f"<h3>{escape(q)}</h3><p>{a}</p>" for q, a in faq))
    parts.append('<h2>Methodology &amp; sources</h2><p>This report compiles figures from public '
                 "company reports, earnings releases and industry research. Private-company numbers "
                 "are estimates and differ by source.</p>" + SRC)
    body = "\n".join(parts)

    site = store.get_site("countly")
    existing = next((a for a in store.list_articles("countly") if keyword.lower() in a["title"].lower()), None)
    art_id = existing["id"] if existing else uuid.uuid4().hex[:12]
    slug = existing["slug"] if existing else seo.make_slug(title, art_id)
    art = {
        "id": art_id, "site_id": "countly", "title": title, "slug": slug,
        "meta_title": title[:60],
        "meta_description": f"{title} — data, tables and analysis ({TODAY}).",
        "excerpt": quick[:200].replace("<strong>", "").replace("</strong>", ""),
        "body_html": body, "tags": tags, "keyword": keyword, "secondary_keywords": secondary,
        "faq": [{"q": q, "a": a} for q, a in faq],
        "image_url": feature_image(img_q, site, img_q),
        "status": "published", "is_mock": False,
        "created_at": existing["created_at"] if existing else datetime.now(timezone.utc).isoformat(),
    }
    art["word_count"] = seo.word_count(body)
    art["reading_time"] = seo.reading_time(body)
    art["schema"] = seo.json_ld(art, site)
    if existing:
        store.update_article(art_id, {k: art[k] for k in
            ("title","meta_title","meta_description","excerpt","body_html","tags","keyword",
             "secondary_keywords","faq","image_url","word_count","reading_time","schema")})
        return "upd", title
    store.add_article(art)
    return "new", title


def nvidia():
    return build(
        f"Nvidia Revenue {datetime.now(timezone.utc).year}: Earnings, Segments & Market Cap",
        "Nvidia Revenue", ["Nvidia earnings", "Nvidia market cap", "Nvidia data center revenue"],
        "Nvidia's revenue reached about <strong>$130 billion</strong> in its most recent fiscal year and is "
        "projected higher, driven overwhelmingly by AI data-center chips. Its market capitalisation has topped "
        "<strong>$3 trillion</strong>, among the most valuable companies on earth.",
        ["Recent fiscal-year revenue: ~$130B, up sharply year-over-year.",
         "Data Center (AI chips) is ~88% of revenue (~$115B).",
         "Market cap has exceeded ~$3 trillion.",
         "Nvidia dominates the AI GPU market with an estimated 80%+ share."],
        [("Nvidia revenue by segment", table(
            ["Segment", "Approx. revenue", "Share"],
            [["Data Center (AI/GPU)", "~$115B", "~88%"], ["Gaming", "~$11B", "~8%"],
             ["Professional Visualization", "~$2B", "~2%"], ["Automotive", "~$1.7B", "~1%"]])),
         ("Nvidia revenue history (fiscal years)", table(
            ["Fiscal year", "Revenue"],
            [["FY2020", "~$11B"], ["FY2021", "~$17B"], ["FY2022", "~$27B"],
             ["FY2023", "~$27B"], ["FY2024", "~$61B"], ["FY2025", "~$130B"], ["FY2026", "~$200B (projected)"]])),
         ("Why is Nvidia so valuable?",
            "<p>Nvidia designs the GPUs that train and run almost every large AI model in the world. When the "
            "generative-AI boom began, demand for its data-center chips — especially the H100 and newer Blackwell "
            "generation — far outstripped supply. Cloud giants and AI labs placed multi-billion-dollar orders, and "
            "Nvidia's data-center revenue multiplied in just a few years, lifting it to a multi-trillion-dollar "
            "valuation and making it briefly the most valuable company on earth.</p>"
            "<p>Beyond the chips themselves, Nvidia's CUDA software platform locks developers into its ecosystem, "
            "giving it a moat competitors struggle to cross. That combination of hardware lead and software "
            "stickiness is why investors assign it such a high value relative to revenue.</p>"),
         ("What is driving Nvidia's revenue growth?",
            "<p>The single biggest driver is AI infrastructure spending. Every company building or deploying large "
            "language models needs vast clusters of GPUs, and the biggest buyers — Microsoft, Amazon, Google, Meta "
            "and OpenAI — are spending tens of billions of dollars a year on data centers. Each new model generation "
            "tends to need more compute, not less, which keeps demand high.</p>"
            "<p>Secondary drivers include networking gear (Nvidia also sells the high-speed interconnects that tie "
            "GPU clusters together), enterprise AI software, and growth in AI for robotics and automotive.</p>"),
         ("Risks to Nvidia's revenue",
            "<p>Nvidia's growth is not guaranteed. Customer concentration is high — a handful of cloud buyers drive a "
            "large share of sales, so any slowdown in their AI spending would hit Nvidia hard. Competition is rising "
            "from AMD, custom chips built in-house by Google (TPUs), Amazon and others, and from export restrictions "
            "that limit sales to some markets. If AI investment cools or returns disappoint, the most cyclical part "
            "of Nvidia's business could contract quickly.</p>")],
        [("How much revenue does Nvidia make?", "About $130B in its latest fiscal year, projected higher."),
         ("What is Nvidia's market cap?", "It has exceeded around $3 trillion, among the largest in the world."),
         ("Who are Nvidia's biggest customers?", "Major cloud providers — Microsoft, Amazon, Google, Meta — and AI labs buying GPUs at scale."),
         ("What share of the AI chip market does Nvidia have?", "An estimated 80%+ of the AI data-center GPU market.")],
        "Nvidia headquarters", ["Tech", "Companies", "AI", "Nvidia"])


def anthropic():
    return build(
        f"Anthropic Revenue {datetime.now(timezone.utc).year}: Claude Maker Earnings & Funding",
        "Anthropic Revenue", ["Anthropic earnings", "Claude revenue", "Anthropic valuation", "Anthropic vs OpenAI"],
        "Anthropic, the maker of Claude, reached an estimated <strong>$4 billion</strong> annualized revenue, "
        "growing rapidly in enterprise and coding. It is backed by multi-billion-dollar investments from Amazon "
        "and Google.",
        ["Estimated annualized revenue: ~$4B, up several-fold year-over-year.",
         "Backed by Amazon (~$8B) and Google investments.",
         "Strong in enterprise APIs and AI coding assistants.",
         "Second to OpenAI (~$8.5B) among pure-play AI labs."],
        [("Anthropic revenue & funding timeline", table(
            ["Year", "Annualized revenue (est.)", "Notable funding"],
            [["2023", "~$100M", "Google, Spark"], ["2024", "~$1B", "Amazon $4B"],
             ["2025", "~$4B", "Amazon up to $8B total"]])),
         ("How does Anthropic make money?",
            "<p>Anthropic earns most of its revenue from selling access to its Claude models — through a developer "
            "API, direct enterprise contracts, and consumer/team subscriptions to Claude. Enterprises use Claude for "
            "customer support, document analysis, and especially software development, where Claude has become a "
            "popular choice for AI coding assistants. A growing share of revenue comes through cloud marketplaces "
            "like Amazon Bedrock and Google Cloud, which resell Claude to their own customers.</p>"),
         ("Anthropic vs OpenAI",
            "<p>OpenAI leads on consumer reach (ChatGPT) and total revenue (~$8.5B). Anthropic's Claude is "
            "particularly strong in enterprise and coding, with revenue estimated around $4B and very fast recent "
            "growth in some segments. The two are the clear front-runners among pure-play AI labs, and Anthropic has "
            "been closing the gap in enterprise. See our "
            "<a href=\"/openai-revenue-2026-8-5b-annual-earnings-growth\">OpenAI revenue report</a> and "
            "<a href=\"/ai-companies-by-revenue-2026-who-earns-the-most\">AI companies by revenue</a>.</p>"),
         ("Growth drivers and risks",
            "<p>Anthropic's growth is driven by enterprise adoption, its safety-focused brand, strong coding "
            "performance, and deep-pocketed backers (Amazon and Google) who also distribute Claude. The risks are "
            "the same that face the whole sector: enormous compute costs, fierce competition from OpenAI and Google, "
            "dependence on cloud partners, and the possibility that AI spending slows before the business turns "
            "profitable.</p>")],
        [("How much revenue does Anthropic make?", "An estimated ~$4B annualized, growing fast."),
         ("Who owns / funds Anthropic?", "It is independent but heavily backed by Amazon and Google."),
         ("Is Anthropic bigger than OpenAI?", "No — OpenAI's revenue (~$8.5B) is larger, but Anthropic is growing quickly."),
         ("What is Anthropic's valuation?", "Reported in the tens of billions and rising with new funding rounds.")],
        "Anthropic artificial intelligence", ["Tech", "Companies", "AI", "Anthropic"])


def ai_market():
    return build(
        f"AI Market Size {datetime.now(timezone.utc).year}: Global Value & Forecast",
        "AI Market Size", ["artificial intelligence market", "AI market value", "AI market forecast", "generative AI market"],
        "The global artificial-intelligence market is estimated at around <strong>$300 billion</strong> and is "
        "projected to reach roughly <strong>$1.8 trillion by 2030</strong>, one of the fastest-growing technology "
        "markets in history.",
        ["Estimated market size: ~$300B and climbing.",
         "Projected to ~$1.8T by 2030 (varies by source).",
         "Generative AI alone is a fast-growing slice (~$70B → $500B+).",
         "North America and Asia-Pacific lead adoption."],
        [("AI market size by year (estimates & forecast)", table(
            ["Year", "Estimated market size"],
            [["2023", "~$150B"], ["2024", "~$200B"], ["2025", "~$240B"],
             ["2026", "~$300B"], ["2028", "~$800B"], ["2030", "~$1.8T (forecast)"]])),
         ("AI market by segment", table(
            ["Segment", "Notes"],
            [["AI software / models", "LLMs, platforms, applications"],
             ["AI hardware / chips", "GPUs and accelerators (Nvidia-led)"],
             ["AI services", "Consulting, integration, cloud AI"],
             ["Generative AI", "Fastest-growing sub-segment"]])),
         ("What is driving AI market growth?",
            "<p>The market's explosive growth is led by generative AI. Since ChatGPT's launch, enterprises across "
            "finance, healthcare, retail and software have rushed to adopt large language models for automation, "
            "customer service and productivity. That demand pulls through the whole stack: more model usage means "
            "more cloud spending, which means more GPUs, which means more data centers and power. Governments and "
            "big tech are committing hundreds of billions to AI infrastructure, reinforcing the cycle.</p>"
            "<p>Falling cost-per-token, better open models, and AI being embedded into everyday software (search, "
            "office tools, phones) are widening the market from a few labs to virtually every company.</p>"),
         ("Risks and the hype question",
            "<p>Not all forecasts will come true. Analyst estimates for AI market size vary widely because much of "
            "the value is still projected, not realized. Real risks include over-investment without matching "
            "returns, a shortage of power and chips, regulation, and the chance that some current AI spending is a "
            "bubble that corrects. The long-term trend is strongly up, but the path will be volatile.</p>"),
         ("AI market by industry",
            "<p>The biggest early adopters are technology and software, financial services, healthcare, retail and "
            "e-commerce, and manufacturing. Software leads because AI coding and automation deliver fast returns; "
            "finance and healthcare follow for analysis and document-heavy work. As tools mature, adoption is "
            "spreading to education, government, logistics and media.</p>")],
        [("How big is the AI market?", "Estimated around $300B, projected to ~$1.8T by 2030."),
         ("How fast is the AI market growing?", "Very fast — often cited at 30–40% compound annual growth."),
         ("What is the generative AI market size?", "Estimated tens of billions today, projected to $500B+ by 2030."),
         ("Which region leads AI?", "North America leads, with Asia-Pacific (especially China) growing fastest.")],
        "artificial intelligence technology", ["AI", "Tech", "Rankings"])


def ai_companies():
    return build(
        f"AI Companies by Revenue {datetime.now(timezone.utc).year}: Who Earns the Most",
        "AI Companies by Revenue", ["top AI companies", "AI company revenue ranking", "biggest AI companies"],
        "Among pure-play AI labs, <strong>OpenAI</strong> leads with ~$8.5B revenue, followed by "
        "<strong>Anthropic</strong> (~$4B). Counting AI hardware, <strong>Nvidia</strong> (~$130B) dwarfs them all.",
        ["OpenAI ~$8.5B leads pure-play AI labs.",
         "Anthropic ~$4B is second and growing fast.",
         "Nvidia ~$130B leads AI hardware revenue.",
         "Big Tech (Microsoft, Google) earn huge AI-linked revenue indirectly."],
        [("AI companies by revenue (estimated)", table(
            ["Company", "Approx. revenue", "Focus"],
            [["Nvidia", "~$130B", "AI chips / GPUs"],
             ["OpenAI", "~$8.5B", "ChatGPT, API"],
             ["Anthropic", "~$4B", "Claude, enterprise"],
             ["Google DeepMind / Gemini", "part of Google", "models, search AI"],
             ["Microsoft (AI)", "billions, embedded", "Copilot, Azure AI"]])),
         ("Pure-play AI labs vs hardware",
            "<p>There are really two ways to count AI revenue. Among the model labs that build AI software, OpenAI "
            "leads at roughly $8.5B, with Anthropic around $4B and others smaller. But the company earning the most "
            "from AI overall is a hardware maker: Nvidia, at about $130B, because every lab and cloud provider has to "
            "buy its chips. In other words, today the biggest profits in AI flow to the 'picks and shovels' — the "
            "chips and infrastructure — as much as to the model builders.</p>"
            "<p>Read the details in our "
            "<a href=\"/openai-revenue-2026-8-5b-annual-earnings-growth\">OpenAI</a>, "
            "<a href=\"/anthropic-revenue-2026-claude-maker-earnings-funding\">Anthropic</a> and "
            "<a href=\"/nvidia-revenue-2026-earnings-segments-market-cap\">Nvidia</a> revenue reports.</p>"),
         ("How AI companies make money",
            "<p>AI labs earn through three main channels: consumer subscriptions (like ChatGPT Plus), enterprise and "
            "team plans, and developer APIs billed per token. Hardware companies sell chips, servers and networking. "
            "Cloud providers monetize AI indirectly — by renting the compute that runs the models and bundling AI "
            "into their existing products. Big Tech's AI revenue is often embedded in larger segments, which is why "
            "it can be hard to measure precisely.</p>")],
        [("Which AI company makes the most money?", "By total revenue, Nvidia (~$130B). Among AI labs, OpenAI (~$8.5B)."),
         ("Is OpenAI the biggest AI company?", "It's the biggest pure-play AI lab by revenue; Nvidia is bigger overall via chips."),
         ("How much do AI companies earn combined?", "Tens of billions for labs, plus Nvidia's ~$130B in AI hardware.")],
        "technology companies office", ["AI", "Companies", "Rankings"])


def main():
    for fn in (nvidia, anthropic, ai_market, ai_companies):
        try:
            r, t = fn()
            print(f"[ai-stats] {r}: {t}")
        except Exception as e:
            print(f"[ai-stats] FAIL {fn.__name__}: {str(e)[:120]}")
    print("=== ai-stats done ===")


if __name__ == "__main__":
    main()
