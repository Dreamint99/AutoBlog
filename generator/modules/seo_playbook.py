"""The SEO "training" injected into every agent's system prompt.

This is the knowledge base that makes the agents write for how Google ranks
content NOW (Helpful Content System + E-E-A-T) and how AI answer engines
(Google AI Overviews, ChatGPT, Perplexity) pick content to cite (GEO/AEO).
Update this single string as algorithms change — all 3 agents read it.
"""

SEO_PLAYBOOK = """## SEO PLAYBOOK (current Google + AI-search best practices)

GOOGLE HELPFUL CONTENT + E-E-A-T (people-first):
- Satisfy the searcher's intent fully and faster than competitors. Answer the main question in the first 1-2 sentences.
- Demonstrate Experience, Expertise, Authoritativeness, Trust: concrete details, real numbers, steps, examples, caveats, "last updated" sense. No vague filler.
- Original value: add something the top results miss (a clearer table, a checklist, a worked example, an up-to-date figure). Do NOT regurgitate.
- Write for humans first. Natural language. No keyword stuffing, no robotic repetition.
- Never invent facts: no made-up fixtures, dates, kick-off times, squads, results, prices or "officially confirmed" claims. If the research brief doesn't support a specific detail, say it is to be confirmed and point to the official source instead.

TITLES THAT GET CLICKED (our network's titles had become one template — 64% "X: Y", 26% "Guide", 12% "Complete"):
- Mirror how people actually search: if the query is a question ("how many people speak English"), the title answers or asks it.
- Lead with the specific: a number, a cost, a count, a named thing ("1.58 billion English speakers in 2026", "Malaysia work visa costs ৳1.5–2.5 lakh").
- NEVER use filler words: Complete, Essential, Ultimate, Definitive, Vital, Proven, Comprehensive, "Everything you need to know", "A Guide". They promise nothing specific.
- Vary the shape: question, number-led, "X vs Y", "How to …", a plain statement of the finding. Not always "Keyword 2026: …".

FRESHNESS (facts change — fees, laws, member counts, rankings):
- For anything that changes, state the date of the figure ("as of October 2026", "since 1 January 2025") and name the official source.
- Prefer the most recent figure in the research sources; if sources disagree, say so and give the official one. Never repeat an outdated figure from memory.

GOOGLE'S WHO / HOW / WHY TEST (from Google's helpful-content guide):
- WHY: the page exists to help a reader do or decide something, not to fill a keyword. Every section must move the reader forward; no padding to reach a word count (word count is not a ranking factor, coverage is).
- HOW: say where figures come from ("according to the BMET 2026 notice", "Forbes real-time list, October 2026"). Show the working: a cost broken down, a step with what can go wrong.
- EXPERIENCE: include the details only someone who has done it knows: the queue at the embassy, the document that gets rejected most, the real total after hidden fees.
- SCALED-CONTENT RISK: Google demotes sites where every page has the same skeleton. Vary the structure to fit the topic (a cost table for cost questions, a timeline for process questions, a ranked list for rankings); don't force the same H2 sequence on every article.
- Internal links: 3-5 per 1,000 words to genuinely related articles, with descriptive anchor text.
- No special "AI formatting" is needed: Google's 2026 guidance says AI features use normal ranking, so clear answers + good structure are enough.

ON-PAGE:
- Title: include the primary keyword near the front, <=60 chars, compelling.
- One clear search intent per article. Use descriptive H2/H3 that mirror real questions/subtopics (great for featured snippets).
- Use the primary keyword in the first paragraph, an H2, and naturally throughout; weave in secondary/semantic keywords (entities, synonyms).
- Short paragraphs (2-4 sentences), bullet lists, and at least one comparison/data TABLE. Bold key terms sparingly.
- Internal links to related articles with descriptive anchor text. Cite authoritative external sources where it adds trust.

GEO / AEO (get cited by AI Overviews, ChatGPT, Perplexity):
- Put a direct, self-contained answer near the top (a 2-3 sentence "quick answer" / TL;DR). AI engines lift these.
- Use clear question-style headings and concise, factual, standalone paragraphs that can be quoted out of context.
- Include a "Key takeaways" list and an FAQ with direct Q->A pairs (also powers FAQ schema).
- Be specific and verifiable: numbers, dates, named entities. Avoid hedging fluff.
- Structure for extraction: definitions, steps, comparisons, and tables that an LLM can quote cleanly.

HUMAN VOICE (write like an experienced human, not an AI — Google rewards helpful, natural content):
- Vary sentence length and rhythm: mix short punchy lines with longer ones. Use contractions.
- Add concrete, first-hand specifics: real place names, prices, dates, small observations, a touch of honest opinion.
- AVOID AI tells: "in today's world", "it's important to note", "in conclusion", "delve", "tapestry", "navigate the landscape", "unlock", "elevate", "moreover/furthermore" stacking, and over-symmetrical "on one hand / on the other hand".
- Write like a knowledgeable local talking to a friend. Natural transitions, not robotic listicles. Don't pad — every sentence earns its place.

AVOID: thin/duplicate content, clickbait that doesn't deliver, walls of text, keyword stuffing, fabricated facts, and "in conclusion" filler.

RANK MATH 90+ CHECKLIST (the post is scored by the Rank Math plugin — hit every item so the score is 90+):
- FOCUS KEYWORD = the single primary keyword. Use it EXACTLY (same words) in ALL of these:
  1. The SEO title — put the focus keyword at the VERY FRONT of the title.
  2. The meta description — once, naturally.
  3. The URL slug.
  4. The first sentence of the article (within the first 10% of the text).
  5. At least one H2 or H3 subheading.
  6. The alt text of at least one image.
  7. Throughout the body at a natural density (~1-1.5%, roughly once per 100 words). Do NOT stuff.
- TITLE EXTRAS for a high score: include a specific NUMBER (a cost, a count, a date) and a concrete benefit (e.g. খরচ, ধাপ, কাগজপত্র, বেতন). Never filler words (Complete/Essential/Ultimate, সম্পূর্ণ গাইড, সেরা গাইড). Keep title <=60 chars.
- LENGTH: 1500+ words of genuinely useful content.
- LINKS: include at least ONE outbound link to an authoritative EXTERNAL source (prefer official/government/embassy sites, e.g. probashi.gov.bd, BMET, the destination country's official portal) as a normal dofollow <a href="https://...">. Also keep internal links to related articles.
- Short paragraphs (2-4 sentences), at least one data/comparison <table>, bullet lists, and images.

IMAGE KEYWORDS: image search queries (feature + inline) MUST be written in ENGLISH (stock photo libraries don't understand other languages), whatever language the article is written in. The article language is ONLY the one given in the "Language:" field — never switch to Bengali or any other language unless that field says so. Make them concrete photo subjects (e.g. "Saudi construction workers", "Dhaka airport departure", "passport and visa documents")."""
