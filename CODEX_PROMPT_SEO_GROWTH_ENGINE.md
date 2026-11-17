# Task: Automatic, white-hat SEO growth engine for the AutoBlog network
(ninetymins.com and countly.net first, then infkey.com, visapoint.net, gccguide.com)

Goal: grow real search traffic across the network toward **100,000 real visits/month** **without** spam. Each site has its own INTERNATIONAL audience.

## The strategy (why this works — follow it, don't invent shortcuts)
There is no secret trick that fools Google; tricks (link schemes, expired-domain abuse, mass thin AI pages, cloaking) get sites deindexed under Google's spam policies (scaled content abuse, site reputation abuse, expired domain abuse, link spam). What does work, and what big sites do at scale:
1. **Programmatic pages built on unique, live data** that people search every day (sports fixtures/results, country statistics, visa rules by passport, salaries by job and city). Thin template pages die; data-rich pages keep growing.
2. **Linkable assets that earn backlinks automatically**: free embeddable widgets and charts with an attribution link, plus monthly original "data story" pages journalists cite.
3. **Bing + AI search first**: Bing, Copilot, ChatGPT search and Perplexity already reward these sites; feed them fast (IndexNow) with direct-answer blocks.
4. **Quality signal**: hide (noindex) pages that never earned an impression so Google judges the site by its best pages.
5. **Automatic distribution** from our own accounts (X, Telegram, Pinterest) and Google Discover-ready pages. Everything must run by itself after you ship it (Cloudflare Worker crons — do NOT rely on GitHub Actions for new jobs; the account's Actions billing is unreliable). Owner does nothing day to day.

## Context (read first)
- Sites: Next.js 15 on Cloudflare Workers (OpenNext) in `M:\Code\AutoBlog\web` (multi-site; ninetymins code in `web/src/sites/ninetymins/`, routes in `web/src/app/s/[site]/`), data in D1 `autoblog-content`. Deploy one site: `powershell -ExecutionPolicy Bypass -File web/deploy-site.ps1 <ninetymins|countly>`. Read `M:\Code\AutoBlog\README.md` and `CLAUDE.md` (Vercel notes there are stale; it is Cloudflare now).
- Live-sports backend: Worker `nm-api` in `M:\Code\ninetymins-app\api` (ESPN, FotMob, Wikipedia, cricket feeds, R2 bucket `nm-feed` served at `feed.ninetymins.com/v1/*.json`, crons every 1–10 min). Deploy: `cd api; npx wrangler deploy`.
- Diagnosis (13 Nov 2026): no technical block (robots allow Googlebot, index/follow, canonical OK, TTFB 0.15 s). Google URL Inspection: countly 3/61 indexed, ninetymins 1/61 indexed, rest "Discovered – currently not indexed". Cause = low trust/authority + many similar AI articles in very competitive English topics. Bing already sends real traffic (countly ~860 clicks/90 d, ninetymins 240).
- Existing assets to build on: ninetymins match pages `/match/<league>/<espnId>-<a>-vs-<b>` already render with SportsEvent JSON-LD, but only ~30 are in the sitemap. `CiteBox` "use this data" box exists on articles. IndexNow runs on publish. GSC/Bing pulls in `generator/data/`.

## Rules (hard)
- White-hat only (Google Search Essentials + spam policies). No link schemes, no doorway pages, no auto-generated pages without unique, useful data, no cloaking, no fake reviews, no misuse of the Google Indexing API (only allowed for JobPosting / BroadcastEvent livestream pages — do not use it for normal pages).
- Every generated page must carry **real, specific data** (scores, line-ups, tables, stats, numbers with sources) that differs page to page. If a page would be thin, don't generate it (or `noindex` it).
- Keep pages fast (no new heavy client JS), mobile-first, valid structured data (test with Google's Rich Results rules).
- Small, reviewable commits on a branch `feat/seo-engine`. Do not push. Do not touch other sites' designs.

## Part A — ninetymins.com: programmatic match & team hub (biggest lever)
Audience is INTERNATIONAL (each site has its own global audience; do not target Bangladesh specifically). Sports searches like "Man Utd vs Aston Villa", "Champions League live score", "Lakers vs Celtics", "India vs Australia today", "IPL 2027 schedule" have huge volume and fresh intent every day. Unique, live data wins here.
1. **Pre-match pages** created automatically 7 days before every fixture in the leagues nm-api already covers + the biggest global competitions (Premier League, Champions League, La Liga, Serie A, Bundesliga, MLS, NBA, NFL, NHL, MLB, F1, tennis majors, IPL/ICC cricket): kick-off time in the reader's time zone, venue, form, H2H, standings, predicted line-ups when available, where to watch legally (existing TV/stream data), win probability (existing `insights.ts`). Same URL turns into live page during the game and a result page after (score, goals, cards, stats, short factual recap from data — no invented quotes).
2. **Team, league, player and "today" hubs**: `/team/<slug>`, `/league/<slug>` (fixtures, results, table, top scorers), `/today` and `/tomorrow` lists. Internal links between all of them (fixture ↔ teams ↔ league).
3. **Sitemaps**: split sitemap index — `sitemap-matches-<yyyy-mm>.xml` (all match pages, `lastmod` = last data change), `sitemap-hubs.xml`, `sitemap-articles.xml`. Add a **Google News sitemap** for result/news pages from the last 48 h. Ping IndexNow (Bing/Yandex) on every create/update from the nm-api cron.
4. **Structured data**: SportsEvent (with homeTeam/awayTeam/startDate/location/eventStatus, and `BroadcastEvent` only where an official stream is embedded), BreadcrumbList, SportsTeam on team pages, ItemList on hubs.
5. **Titles that match search**: e.g. `Man Utd vs Aston Villa live score, line-ups & where to watch – 22 Nov 2026`, result: `Man Utd 4-4 Aston Villa: goals, stats & highlights`.
6. **Embeddable live-score widget** (the white-hat backlink engine): `/embed/match/<id>` and `/embed/league/<slug>` iframe widgets + a "Get this widget for your site" page with copy-paste code. Widget shows a small "Live scores by NinetyMins" link. Sports blogs, fan sites and local news sites worldwide can embed it free → natural backlinks.
7. **Prune**: generic AI guide articles with 0 impressions in GSC for 90 days and no unique data → `noindex` (keep the URL, remove from sitemap). Report the list before applying; apply after the report is written.

## Part B — countly.net: data tool site, not an article farm
1. Turn the strongest datasets into **interactive data pages** with real sources (World Bank, UN, IMF, official stats — cite each): "<country> population 2026" (all countries, global English audience), "<country> GDP per capita", "<metric> by country ranking", "compare <country A> vs <country B>". Generate only where data exists; each page has a table, a chart (SVG, server-rendered), the source, last-updated date, and FAQ from the data.
2. **Embeddable charts** ("Embed this chart" + `CiteBox` attribution link) for every ranking — journalists/bloggers cite data → backlinks.
3. Keep the Copilot/Bing strength: concise answer paragraph at the top of each page (who/what/how many), clean tables.
4. Prune thin AI articles the same way as Part A step 7.

## Part B2 — the other sites (after A and B ship)
Same pattern, each with its own global data angle; reuse the page generator, embeds, pruning and sitemaps from A/B:
- **visapoint.net**: visa requirement pages per passport → destination pair (from `generator/data/visa-check.json`, extend to all countries with cited official sources and "last checked" date), work-visa salary/cost pages by country and job.
- **gccguide.com**: salary by job × Gulf city, cost-of-living calculators, embeddable salary chart.
- **infkey.com**: stop new generic AI-tool articles. Turn it into a data/tool site: AI model comparison tables (price per token, context, benchmarks with sources), an interactive "which AI tool for X" picker. Prune the rest.
Only build a page type where real, sourced data exists; otherwise skip it and say so in the report.

## Part C — automation & monitoring (runs forever)
- All generation/refresh jobs as Cloudflare Worker crons (nm-api for sports; a small `seo-engine` Worker or existing crons for countly), idempotent, with D1 state and error logging to KV.
- Weekly report JSON + a simple `/admin/seo` page (password = existing ADMIN_KEY pattern): pages created, indexed share (from the existing GSC data files / Search Console API if credentials exist), top new queries, Bing clicks, errors.
- Budget guard: any paid API call (LLM, data) behind a monthly cap in config; default to free sources. Factual recaps should be template-based from data; use an LLM only for short, optional summaries and log the cost.

## Part D — legit distribution & link-earning automation (no spam)
- **Social auto-posting from our own accounts only**: every new result/data page → X (Twitter) and Telegram channel posts via their official APIs, Pinterest (already set up via `/pins.xml`). One post per page, no mass @mentions, no posting into other people's communities automatically.
- **Google Discover readiness**: 1200 px+ OG/hero image on every match/data page, `max-image-preview:large`, fresh titles, author/organization schema.
- **AI search (ChatGPT search, Copilot, Perplexity, Google AI Overviews)**: short direct-answer paragraph + clean table at the top of every page, `llms.txt` kept current, Bing IndexNow on every change (Copilot/ChatGPT search use Bing's index; countly already gets 100K+ Copilot citations).
- **Monthly "data story" auto-report** (countly + ninetymins): one original statistic page per month (e.g. "Goals per game across 10 leagues, Nov 2026", "Fastest-growing economies 2026") with embeddable chart — this is what journalists and bloggers link to. Prepare a press-ready summary file; sending pitches to journalists stays a human step (owner approves each email).
- **Unlinked-mention finder**: weekly job that searches for our brand names / embedded widget hosts without a link and lists them in the admin page (human decides whether to ask for a link).

## Verify before saying done
1. `npx tsc --noEmit` and the site build pass; Worker tests pass (`node --test` where present).
Work order: Part A (ninetymins) → deploy and verify → Part B (countly) → deploy and verify → Part D → Part B2 site by site. Commit after each part. If time or quota runs out, stop after a finished part and write the report.
2. Deploy to **ninetymins** first. Show 5 generated live URLs (pre-match, live/result, team hub, league hub, widget) and validate their JSON-LD with a script (schema shape) and that each returns 200 with `index, follow` (or `noindex` for pruned).
3. Sitemaps reachable and listed in `robots.txt` / sitemap index; IndexNow ping returns 200/202.
4. Lighthouse mobile on one match page ≥ 80 performance.
5. Write `M:\Code\AutoBlog\SEO_ENGINE_REPORT.md`: what was built, page counts, cron schedule, pruned list, costs, and what to measure in 4/8/12 weeks.
