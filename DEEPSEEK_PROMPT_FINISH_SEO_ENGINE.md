# Task: Finish the SEO engine work Codex left unfinished (AutoBlog + NinetyMins API) and build visapoint's visa data hub

You are a senior full-stack engineer taking over from another agent (Codex) that ran out of quota mid-task. Work powerfully but carefully: understand what exists, finish it, test it, commit it. Never guess file contents — read them first. Never invent data. Work phase by phase through the night if needed until done or a STOP rule hits.

## Where things are (read ALL of these first)
- `M:\Code\AutoBlog\SEO_ENGINE_REPORT.md` — what Codex shipped (ninetymins match/team/league hubs + widgets LIVE; countly 648 sourced data pages LIVE; monthly data stories; mention finder).
- `M:\Code\AutoBlog\CHECKPOINT_HANDOFF.md` — the last commit `ea46d35` on branch `feat/seo-engine` is an UNVALIDATED checkpoint: `seo-engine/src/{mentions,monitor,social,stories,worker}.mjs`, `seo-engine/test/social.test.mjs`, `web/cache-worker.js`, `web/src/app/pins.xml/route.ts`, `web/src/app/s/[site]/embed/[kind]/[slug]/page.tsx`, `web/src/app/s/[site]/stories/[slug]/page.tsx`.
- `M:\Code\AutoBlog\CODEX_PROMPT_SEO_GROWTH_ENGINE.md` — the original full spec (Parts A, B, B2, C, D). Follow its rules section exactly (white-hat only, unique sourced data, gated indexing, no link schemes, no Indexing API misuse).
- Uncommitted work still in the AutoBlog folder (branch `feat/seo-engine`): `generator/modules/pipeline.py`, `generator/sites/sites_config.json`, `web/src/data/sites.json`, `seo-engine/src/{social,stories,worker}.mjs`, `seo-engine/README.md`, `generator/test_seo_policy.py`, `generator/data/seo_prune_{gccguide,infkey,walvi}.json`, `seo-engine/infkey-policy.sql`.
- Uncommitted work in `M:\Code\ninetymins-app` (branch `feat/seo-engine`): `api/src/{cricket,espn,football,seo,sports}.ts`.
- Deploy commands: web site `powershell -ExecutionPolicy Bypass -File web/deploy-site.ps1 <site>`; seo-engine Worker `cd seo-engine; npx wrangler deploy`; nm-api `cd M:\Code\ninetymins-app\api; npx wrangler deploy`.

## Do NOT touch (other agents own these right now)
- Worktree `M:\Code\AutoBlog-gcc` (branch `feat/gcc-hub`, gccguide) and worktree `M:\Code\AutoBlog-infkey` (branch `feat/infkey-data`, infkey). Do not edit gccguide or infkey site code, do not deploy gccguide or infkey, do not apply the infkey/gccguide prune lists or `infkey-policy.sql` (the infkey owner decides). You may keep those files committed as data.
- Buddy app (`M:\Code\buddy-app`) — not part of this task.
- Never push to GitHub. Never put secrets in code or commits. Do not post to any social account or email anyone.

## Phase 1 — Validate and finish Codex's checkpoint (AutoBlog `feat/seo-engine`)
1. `git status`, `git log -5`, read every changed file listed above and the diff of `ea46d35`.
2. Finish anything half-written; make `seo-engine` tests pass (`node --test` in `seo-engine/`), `cd web && npx tsc --noEmit` clean, Python `generator/test_seo_policy.py` passing.
3. Social posting (`social.mjs`): keep it DISABLED by default behind a config flag; it must read credentials only from Worker secrets named in the README (X API and Telegram bot). Write in the report exactly which secret names the owner must set. Do not send anything.
4. Stories page (`/stories/<slug>`), pins.xml, embed page and cache-worker changes: verify they render (local build) and keep embeds `noindex` duplicates as Codex designed.
5. Commit with clear messages. Then deploy ONLY: `countly` and `ninetymins` web (if their pages changed), and the `seo-engine` Worker. After each deploy, curl 5 sample URLs per site and show HTTP 200, title, robots meta.

## Phase 2 — Finish NinetyMins API changes (`M:\Code\ninetymins-app`, branch `feat/seo-engine`)
1. Read the diffs in `api/src/{cricket,espn,football,seo,sports}.ts`; understand intent (more competitions, sturdier dated ESPN fetches, cricket coverage).
2. Run the API's TypeScript check and existing tests; fix issues; keep the rule "skip a day/feed on error, keep last good data".
3. Commit, deploy nm-api, then check `https://api.ninetymins.com/v1/live/state` (or the SEO admin JSON) and that new match pages keep appearing in the ninetymins match sitemaps. Watch the IndexNow outbox for 429s; keep the cooldown/backoff.

## Phase 3 — visapoint.net (site id `walvi`) visa data hub (the biggest remaining traffic opportunity)
Codex skipped this because `generator/data/visa-check.json` is only a portal directory. Build it from a real dataset:
1. Find and evaluate the open dataset **`passport-index-dataset`** on GitHub (by ilyankou; CSV/matrix of passport → destination requirement: visa-free days, visa on arrival, e-visa, visa required). Read its LICENSE and README; record the data date. If the license does not allow commercial reuse or it is stale (> 12 months), STOP this phase and report alternatives.
2. D1 table `visa_matrix(passport, destination, requirement, days, source, data_date)`; loader script/Worker that refreshes from the dataset weekly; never overwrite good data with a failed fetch.
3. Pages (follow existing walvi/visapoint site code and patterns; read `web/src/sites/walvi/` first):
   - `/visa-free-countries/<passport>`: list of destinations by category with counts, map-free table, "last updated", source link — ~199 pages, all indexed.
   - `/visa/<passport>-to-<destination>`: requirement, allowed days, official embassy/e-visa portal link where known (from the existing portal directory), short template text from the data, FAQ. ~39,000 combos: index only the top ~2,000 combinations (largest passports × most-visited destinations — define the rule in config), others `noindex` until demand appears in GSC/Bing data.
   - `/passport-ranking`: power ranking computed from the matrix (count of visa-free + VOA), with an embeddable chart and attribution link.
   - Always show: "Requirements change — confirm with the embassy/official portal before travel."
4. Sitemaps split by type with `lastmod`; IndexNow on change (reuse existing code).
5. Deploy walvi, curl 6 sample URLs (200, title, robots, canonical, JSON-LD), commit.

## STOP rules
Stop a phase (not the whole task) and write it in the report when: a dataset license forbids reuse or data is stale; a needed credential is missing; a test keeps failing after two honest fix attempts; a change would touch the "Do NOT touch" list.

## Final report
Write `M:\Code\AutoBlog\FINISH_SEO_REPORT.md`: what was finished/fixed per phase, commits, deploys with verification outputs (URLs, status, titles), page counts (total / indexed / noindex) per site, data sources + licenses + dates, secrets the owner must add (names only), anything blocked, and next steps. The owner's reviewer will verify everything in this report.
