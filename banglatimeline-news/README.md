# বাংলা টাইমলাইন — auto newsroom

Hourly GitHub Action (`.github/workflows/banglatimeline-news.yml`). Reads RSS of major Bangla outlets, clusters the same event,
asks DeepSeek (OpenRouter, fallback DeepSeek API) for an original report with source credit, picks a free-licence image
(Wikimedia Commons → Pixabay → text thumbnail), watermarks it in headless Chrome and POSTs it to banglatimeline `/api/ingest`.

Secrets: `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `PIXABAY_API_KEY` (shared with AutoBlog), `BTL_INGEST_TOKEN`, `BTL_SITE`.
Source of truth for the code: M:\Code\banglatimeline\auto (copy changes here).
