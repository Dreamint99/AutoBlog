# Task: Turn gccguide.com into the automatic "Gulf Expat Data Hub"

You are a senior full-stack engineer. Work powerfully but carefully: finish every phase completely, test it, commit it, then move on. Read files before editing them; never guess. Quality and correctness beat speed. Work through the night if needed, phase by phase, until all phases are done or you hit a STOP rule.

## Project facts (read first)
- Repo `M:\Code\AutoBlog`; web app `M:\Code\AutoBlog\web` = ONE Next.js 15 codebase serving several sites, each deployed to Cloudflare Workers (OpenNext). D1 binding `DB` (`autoblog-content`) in `web/wrangler.jsonc`. Read `README.md` (Vercel notes are stale; it is Cloudflare now).
- gccguide code: `web/src/sites/gccguide/` (Home.tsx, Chrome.tsx, Widgets.tsx, data.ts, CountryPage.tsx, theme.css). Shared routes: `web/src/app/s/[site]/…`. Reuse the patterns of existing data pages (ninetymins match/league/team pages, countly pages): how they read D1, build metadata, JSON-LD, sitemaps and IndexNow. Do not invent a second framework.
- Audience: Gulf expats worldwide (UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain), English. Not Bangladesh-specific.
- `web/src/lib/legalPages.tsx` has someone else's uncommitted edit: never commit or modify it.
- Work on branch `feat/gcc-hub`. Commit after every phase with a clear message. **Do NOT deploy and do NOT push** — the owner's reviewer will verify and deploy.

## Scale rules (Google-safe, mandatory)
The aim is the LARGEST number of pages that real data supports — tens or hundreds of thousands is fine — but every indexed page must contain unique, useful, sourced data. Google bans thin/duplicate mass pages ("scaled content abuse", "doorway pages"), so:
1. A page type is built only if real data exists for it. No AI filler text, no invented numbers, no fake reviews.
2. Every page shows its source and "last updated" time.
3. Indexing is gated: a `seo_index` flag per page (or rule) — start with the highest-demand pages indexed (listed per phase), the rest `noindex` but reachable, with a config value to widen the indexed set later. Sitemaps list only indexed pages.
4. Near-duplicate pages use `rel=canonical` to the main page.
5. Text = templates filled with the page's own numbers (min/max/change/comparisons), so each page reads differently.

## Shared building blocks (Phase 0)
- D1 migrations in the repo's existing migrations style.
- A scheduled data job (Worker cron — follow how the repo already runs crons; if none fits, add a small Worker under `M:\Code\AutoBlog\workers\gcc-data\` with its own wrangler config bound to the same D1). Idempotent, logs errors to a D1 table `gcc_job_log`, keeps the last good value if a source fails, never breaks the site.
- Reusable UI parts: big-number card, SVG line chart (server-rendered), amount table, FAQ block, "source / updated" line, related-links block. Mobile-first, fast, no heavy client JS.
- Sitemap: split by type (`sitemap-rates.xml`, `sitemap-gold.xml`, …) inside the site's sitemap index, `lastmod` = data update time. Reuse IndexNow to ping changed URLs.

## Phase 1 — Daily rates (currency, gold, fuel)
- Currency 3×/day. Free source with USD base (test `https://open.er-api.com/v6/latest/USD`; ECB/Frankfurter lacks Gulf currencies). AED 3.6725, SAR 3.75, QAR 3.64, OMR 0.3845, BHD 0.376 are USD pegs; KWD floats → must be live. Quote currencies: INR, PKR, BDT, PHP, NPR, LKR, EGP, IDR, KES, NGN, ETB, USD, EUR, GBP.
- Pages `/rates/<from>-to-<to>` (6 Gulf × quote list, plus the reverse direction canonical to the main one), hub `/rates`. Current rate, 30-day + 1-year chart, amount table, weekly/monthly change sentence, FAQ. Title like `AED to INR today: 1 AED = 22.71 INR (14 Nov 2026)`.
- Gold: free spot price (find a keyless source or free tier; if a key is required → STOP rule). Per-gram 24K/22K/21K/18K in each Gulf currency; pages `/gold-rate/<city>` for Dubai, Abu Dhabi, Sharjah, Al Ain, Riyadh, Jeddah, Dammam, Mecca, Medina, Doha, Kuwait City, Muscat, Salalah, Manama. Note "spot-based; shops add making charges". Tables for 1 g, 8 g, 10 g, 1 tola.
- Fuel: official monthly prices per country from official announcements, stored with source URL; `/fuel-price/<country>`. Monthly update can be a JSON the reviewer edits — say so in the report.
- Indexed at launch: all rates pairs, all gold cities, all fuel pages.

## Phase 2 — Workers' money calculators
Interactive but server-rendered with sensible defaults (works without JS for the default case):
- End-of-service **gratuity** calculators for UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain — implement each country's current labour-law formula exactly, cite the law/article and official source, explain the rule in plain words, and include worked examples. Unit-test each formula (resignation vs termination, years of service edge cases, limited vs unlimited contract where relevant).
- Overtime, annual leave salary and notice-period calculators per country, same rules.
- Pre-computed example pages (e.g. `/gratuity/uae/basic-5000-aed-7-years`) only for common salary × years combinations people search; index a small set first.

## Phase 3 — Prayer times for every Gulf city and area
- Use the open-source `adhan` library (check its license; MIT expected). Cities/areas from GeoNames (CC BY — attribute it) filtered to the 6 countries (all populated places with population above a threshold you choose; report the count).
- Page `/prayer-times/<country>/<city>`: today's times, full month table, sunrise/sunset, Qibla direction, Hijri date, Ramadan section (Ramadan 2027 begins around 8 Feb 2027 — make Suhoor/Iftar tables ready), calculation method used (Umm al-Qura for KSA, official local methods elsewhere) and a method switcher.
- Indexed at launch: cities above a population threshold (e.g. the largest ~300); smaller places noindex until demand appears.

## Phase 4 — Government & embassy directory
- Embassies/consulates of every country in each Gulf state: address, phone, email, website, working hours, map link — from official foreign-ministry/embassy pages only, each with source URL and "last checked". Page `/embassy/<country>-embassy-in-<gulf-country>` (+ city if consulate).
- Visa / residence ID fees & steps (UAE visa, Saudi iqama renewal, Qatar QID, Kuwait civil ID, etc.) from official portals only, with source and date.
- Public holidays per Gulf country per year (`/public-holidays/<country>-<year>`), including Ramadan working hours notes; mark lunar-dependent dates as "expected".
- If a fact cannot be verified from an official source, leave the field empty — never guess.

## Phase 5 — Affiliate-ready travel & remittance (build only what works without secrets)
- "Cheapest flights from <Gulf city> to <home city>" route pages and remittance comparison pages are planned with affiliate programmes (Travelpayouts, Wise, Remitly). Build the page templates and data model, but if an affiliate key/ID is needed, leave a clearly named config placeholder and STOP for that part (report it). Never scrape exchange houses or airline sites.

## Phase 6 — Home, navigation, distribution
- gccguide home: "Today in the Gulf" block (top rates, gold 22K Dubai, next prayer for the visitor's chosen city, latest fuel price), clear navigation to all hubs, search.
- Daily auto-generated share card image (rates of the day) at a stable URL for WhatsApp/Telegram sharing; RSS feed of daily rate summaries.
- Remove/`noindex` old generic gccguide articles that have 0 impressions in `generator/data/gsc_gccguide.json` for 90 days — write the list in the report first, then apply.

## STOP rules
Stop that phase (not everything) and write it in the report when: a needed source requires a paid key or forbids reuse; a legal formula is ambiguous; a test fails and you cannot fix it after two honest attempts. Never invent data to fill a gap. Never put API keys or secrets in code or commits.

## Verification per phase (paste outputs in the report)
1. `cd web && npx tsc --noEmit` → 0 errors; build the gccguide site as `deploy-site.ps1` does, but do not upload.
2. Unit tests pass (formulas, rate math, gating rules).
3. Run the data job once (local `wrangler dev`/`--local` D1 is fine) and show sample rows.
4. Render 3 sample pages per phase locally (`wrangler dev` or `next start` with the site id) and show HTTP 200, `<title>`, meta robots, canonical and the JSON-LD block.
5. Count pages per type: total, indexed, noindex.

## Final report
Write `M:\Code\AutoBlog\GCC_HUB_REPORT.md` with: phases done/blocked, data sources + licenses + limits, D1 tables, cron schedule, page types with counts (total / indexed), sample URLs, test and build outputs, the noindex list, everything that needs a key, a manual update or the reviewer's decision, and the exact deploy command to run after review.
