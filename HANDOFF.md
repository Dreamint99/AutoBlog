# Handoff — AutoBlog (2026-10-08)

Read `CLAUDE.md` and `README.md` first. NOTE: README still says Vercel — the sites now run on
**Cloudflare Workers** (OpenNext) with **Cloudflare D1** (`autoblog-content`) as the article store.

## Current state
- Active sites: **countly.net**, **ninetymins.com**, **infkey.com** (Workers `autoblog-<id>`).
  walvi is paused (domain walvi.io expired; `drip_enabled: false` in `generator/sites/sites_config.json`).
- Article generation: GitHub Actions `autoblog-drip.yml` (15:00 + 20:00 UTC), 1 article/site/run
  = 2/day/site. LLM = free fallback chain in `generator/modules/llm.py` (Gemini → Cerebras → Groq →
  Mistral → Workers AI → OpenRouter free → DeepSeek). Secrets set: GEMINI, CEREBRAS, GROQ, OPENROUTER
  (MISTRAL not set; Workers AI 401s with the current CLOUDFLARE_API_TOKEN — both optional).
- Quality guards in `generator/modules/pipeline.py`: non-Latin script on English sites, stale
  "today" titles, LLM check for finished events written as upcoming. Countly wealth seed rotates daily.
- `web/deploy-site.ps1 <site>` regenerates the gitignored per-site `wrangler.jsonc` and deploys.

## Done in this session (all pushed to master)
- countly: Forbes-style redesign (`web/src/sites/countly/Home.tsx`, `editorial.css`) — DEPLOYED.
- RSC cache-poisoning fix in `web/cache-worker.js`; tolerant tags parsing — DEPLOYED.
- D1 read-budget fix in `web/src/lib/data.ts` (slim list columns, single-row article read,
  Cache API layer with stale-on-error, React cache(), SQL search) — DEPLOYED to all 3 sites.
  Cause: D1 free tier = 5M rows read/day; the old code used ~5–6M/day so countly + ninetymins 500'd
  every evening since late September.
- ninetymins: ESPN-style redesign + free live scores (commit 704a3f6) — **NOT DEPLOYED YET**.
  Files: `web/src/sites/ninetymins/*` (Chrome, Home, Article, Topic, LiveScores, live.ts, comps.ts,
  fonts.ts, theme.css), `web/src/app/s/[site]/api/scores/route.ts`, topic route + sitemap + legal pages.
  Live data = ESPN's undocumented keyless API (site.api.espn.com) — football leagues, NBA, F1, ATP
  work; cricket and SAFF are not available there. UI hides itself if the feed fails.

## Status 2026-10-07 (cloud session)
- Added `.github/workflows/deploy-site.yml` (manual) and `verify-sites.yml` (read-only). Deploy of
  ninetymins FAILED at upload: `CLOUDFLARE_API_TOKEN` can list Workers but has no Workers Scripts:Edit
  ("No access to the specified service"). Build itself is fine. Re-run after the token is fixed.
- Verify at 19:17 UTC: ninetymins + infkey homepages 500, countly article 500. Cause: D1 code 7500
  "exceeded D1's free tier daily row read limit" — the read-budget fix is still not enough.
- `idx_articles_site_status_created` does NOT exist (only `idx_articles_site_status (site_id, status)`
  and `idx_articles_site_slug`), so listing queries ordered by `created_at` scan every row of the site.
  Creating it is a D1 write → waiting for the owner's OK; must run after 00:00 UTC (quota reset).
- Token also lacks Account Analytics:Read, so D1 rows read/day can't be reported yet.
- Done: Vercel analytics removed from `layout.tsx`; README rewritten for Cloudflare + D1 + LLM chain.

- ninetymins: match centre, /scores, cricket (needs Worker secret CRICAPI_KEY), FIFA-style SAFF hub,
  Wikipedia + OpenLigaDB widgets. NinetyMins now gets a 3rd daily article (09:30 UTC drip run).

## TODO (in priority order)
1. **Deploy ninetymins** (`powershell -ExecutionPolicy Bypass -File web/deploy-site.ps1 ninetymins`).
   A cloud session has no Cloudflare credentials; options: (a) the owner runs the command on their PC
   (`M:\Code\AutoBlog\web`), or (b) add a `workflow_dispatch` deploy workflow that builds with
   `npx opennextjs-cloudflare build` + `npx wrangler deploy` using the `CLOUDFLARE_API_TOKEN` /
   `CLOUDFLARE_ACCOUNT_ID` secrets (the token may lack Workers Scripts:Edit — check the run). The
   wrangler config must match `deploy-site.ps1` (assets binding ASSETS, D1 binding DB
   58dacf96-c574-4f0b-88e6-3005d895eb90, var SITE_ID, routes `<domain>` + `www.<domain>` custom domains).
2. **Verify after 00:00 UTC** (D1 quota reset): all 3 homepages + an article + `/api/scores` return 200;
   indexes `idx_articles_site_status_created` and `idx_articles_site_slug` exist (created by the
   `aim-news.yml` / `autoblog-drip.yml` "Ensure D1 indexes" step); then check D1 rowsRead per day via
   the Cloudflare GraphQL `d1AnalyticsAdaptiveGroups` — target well under 5M.
3. Remove `@vercel/analytics` and `@vercel/speed-insights` from `web/src/app/layout.tsx` (they 404 on
   Cloudflare on every page).
4. 41 low-quality `is_mock = 1` articles are published (ninetymins 18, countly 17, infkey 6):
   ask the owner whether to archive (`status='archived'`) or regenerate them.
5. Ask the owner about the Adsterra **Social Bar** on countly (`ADSTERRA` in `web/src/app/layout.tsx`) —
   it shows fake "New Message" / "save your FB account" notification ads. Keep or remove the socialBar
   unit only (Native Banner can stay).
6. Update README to describe Cloudflare Workers + D1 + the free LLM chain instead of Vercel/Supabase.

## Cautions
- Don't write to the live D1 or deploy without the owner's OK; archive instead of delete.
- `cache-worker.js` caches HTML 30 min per colo — append `?v=<random>` when verifying.
- After deploying, check the homepage HTML has the new markup (`cx-masthead` for countly,
  `nm-header` for ninetymins) and that a request with header `RSC: 1` does not poison the plain page.
- Owner's language is Bengali; reply in Bengali.
