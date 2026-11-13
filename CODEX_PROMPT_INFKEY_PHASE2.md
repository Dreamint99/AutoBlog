# Task: infkey.com phase 2 — "Can I run it?", AI Status, Upcoming/Trends, pruning

Work in the git worktree `M:\Code\AutoBlog-infkey` on branch `feat/infkey-data` (NOT in `M:\Code\AutoBlog`, where another agent works on ninetymins). Commit small steps there; do not push.

## What already exists (phase 1, live 14 Nov 2026)
- D1 `autoblog-content` tables `infkey_models` (445 models from the public OpenRouter list, `tier` 0 = 4 newest paid models of each major lab) and `infkey_price_history` (one row per model per day).
- Daily sync Worker `workers/infkey-sync` (cron 04:23 UTC, manual run `GET /run?key=…`, key in `~/.aiu-keys/infkey-sync-run-key.txt`).
- `web/src/lib/models.ts` reads D1 (`getModels`, `getModel`, `getFlagships`, `getPriceHistory`, `isIndexablePair`). Model pages `/models/<id>`, comparisons `/compare/<a>-vs-<b>` (canonical = ids sorted; only flagship pairs indexable), home section `web/src/sites/infkey/LivePrices.tsx`, sitemap in `web/src/app/sitemap.ts`.
- Model ids are slugs with no dots (dots made Next treat the path as a file → 404).
- Deploy: `powershell -ExecutionPolicy Bypass -File web/deploy-site.ps1 infkey`. The worktree needs its own `npm ci` in `web/` (a junction to the other checkout's node_modules produced a build where every page returned 500). Safer rollout: `npx wrangler versions upload`, then `npx wrangler versions deploy <new>@1% <old>@99% -y` and test with header `Cloudflare-Workers-Version-Overrides: autoblog-infkey="<new>"` plus a cache-busting query string, then 100%. Roll back with `npx wrangler rollback --name autoblog-infkey -y`.

## Rules
White-hat only: every page must carry real, specific data; estimates labelled as estimates; no rumours stated as fact; gradual indexing (noindex until a page type proves itself); audience is international (English).

## 1. "Can I run it?" (local AI on your own GPU)
- Data: Hugging Face Hub public API (`https://huggingface.co/api/models?sort=downloads&limit=…&filter=text-generation`, plus `safetensors.total` parameter counts from `/api/models/<id>`), cached in D1 `infkey_hf_models` by a daily job in `workers/infkey-sync`. Start with the top ~2,000 text-generation models by downloads.
- GPU list: a static JSON of ~150 consumer and datacenter GPUs (name, VRAM GB, memory bandwidth GB/s) with sources, in `web/src/sites/infkey/gpus.ts`.
- Math: VRAM needed ≈ params × bytes/param (FP16 2, Q8 1, Q4_K_M ≈0.56) + ~15% overhead + KV cache for 4k/32k context; tokens/s estimate ≈ bandwidth ÷ model bytes. Show fits / tight / doesn't fit per quantization, and the smallest quant that fits. Label "estimate".
- Pages: `/run/<model-slug>` (all GPUs table), `/run/<model-slug>/<gpu-slug>` (one answer), `/gpu/<gpu-slug>` (best models that fit). Index only model pages for the top 300 models and GPU pages for the top 40 GPUs at first; pair pages `noindex, follow` until GSC shows impressions, then promote the ones with demand (read `generator/data/gsc_infkey.json`).
- Link from model pages (when `hf_id` is set) to the run page.

## 2. AI Status ("Is ChatGPT down?")
- Poll official status pages every 5 minutes from a Worker cron (Atlassian Statuspage JSON `…/api/v2/summary.json` for OpenAI, Anthropic, others that use it; Google Cloud/AI status feed for Gemini). Store current state + incidents (last 90 days) in D1.
- Pages `/status` and `/status/<service>`: current status, components, active incidents with links to the official page, incident history, uptime %. Title "Is <Service> down right now? Live status". Short cache (60 s).

## 3. Upcoming & trending models
- Daily job: Hugging Face trending models, new OpenRouter models (`created` in the last 7 days), GitHub trending AI repos. New-model pages appear automatically via the sync; add a `/new` page ("New AI models this week") and a `/upcoming` page listing announced-but-unreleased models only with a source link each (official blog or reputable news), marked "announced", never invented dates.

## 4. Prune old generic articles
- List infkey articles with 0 impressions and 0 clicks in the last 90 days from `generator/data/gsc_infkey.json` (and Bing `bing_infkey.json`). Write the list to `INFKEY_PRUNE_LIST.md` first; then mark them noindex (keep URLs, drop from sitemap). Keep articles that rank or that support the data pages.

## Verify
`npx tsc --noEmit`, the OpenNext build, version-override test of 5 new URLs (200, correct robots, JSON-LD), then full deploy; check the live sitemap. Write `INFKEY_PHASE2_REPORT.md` (what shipped, page counts, crons, anything not done).
