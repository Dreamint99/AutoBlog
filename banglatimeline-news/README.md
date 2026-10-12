# কালারস অব বাংলাদেশ — auto newsroom

GitHub Action every 20 min (`.github/workflows/banglatimeline-news.yml`), so it runs while the PC is off.
Reads RSS of major Bangla outlets, clusters the same event, and asks an LLM (OpenRouter free model first, then
DeepSeek) for an original, SEO-shaped report with key points and source credit. Featured image: Wikimedia Commons
(free licence, credited) → Pixabay → category text card, watermarked in headless Chrome, POSTed to `/api/ingest`.
Then a category-styled 1080×1350 photo card (`card.html`) goes to the Facebook page with a caption and link.

Pacing: 15–20 auto stories per Bangladesh day, spread out; breaking news always goes and opens/updates a live topic.
Manual run with `backfill` > 0 gives old text-card stories a real photo instead.

Secrets: `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `PIXABAY_API_KEY`, `BTL_INGEST_TOKEN`, `BTL_SITE`, `FB_PAGE_ID`, `FB_PAGE_TOKEN`.
Source of truth for the code: M:\Code\banglatimeline\auto (copy changes here).
