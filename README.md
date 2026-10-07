# AutoBlog — automated multi-site SEO blog network

AutoBlog runs **several independent blog websites from one codebase**. A Python pipeline
(`generator/`) writes SEO articles with a 3-agent LLM pipeline on a **free LLM fallback chain**
and stores them in **Cloudflare D1**; each website is the same Next.js app deployed as its own
**Cloudflare Worker** (via OpenNext) that reads D1 and renders with its own design.

```
   ┌──────────────────────────────────────┐
   │ GitHub Actions (cron, PC can be off)  │  autoblog-drip.yml  15:00 + 20:00 UTC
   │  generator/ 3-agent pipeline          │  1 article / site / run = 2 per day per site
   │  LLM: Gemini → Cerebras → Groq → …    │  (local Flask admin on :5050 still works too)
   └──────────────────┬───────────────────┘
                      │ wrangler d1 execute (writes)
              ┌───────▼─────────┐
              │ Cloudflare D1   │  database `autoblog-content`
              │ (SQLite)        │  id 58dacf96-c574-4f0b-88e6-3005d895eb90
              └───────┬─────────┘
                      │ binding DB (reads, cached — see §11)
       ┌──────────────┼───────────────┐
       ▼              ▼               ▼
  autoblog-countly  autoblog-ninetymins  autoblog-infkey   ← Workers built from web/
  countly.net       ninetymins.com       infkey.com          (one codebase, SITE_ID per Worker)
```

The 5th site, **probashiinfo.com**, is WordPress (Bengali) — see `CLAUDE.md`.

> History: the sites used to run on Vercel + Supabase. Supabase billing was paused and everything
> moved to Cloudflare. Old Vercel/Supabase code paths still exist as fallbacks (`web/src/lib/data.ts`,
> `generator/modules/store.py`) but are not used in production.

---

## 1. Live sites

| id | niche | Worker | domain | drip |
|----|-------|--------|--------|------|
| `countly` | money / wealth / data (Forbes-style design) | `autoblog-countly` | https://countly.net | yes (own step in the drip workflow; wealth seed at 20:00) |
| `ninetymins` | sports desk (ESPN-style, live scores) | `autoblog-ninetymins` | https://ninetymins.com | yes |
| `infkey` | tech / AI | `autoblog-infkey` | https://infkey.com | yes |
| `walvi` | — | paused (walvi.io expired, `drip_enabled: false`) | — | no |
| `probashiinfo` | Bengali expat news | WordPress, not a Worker | https://probashiinfo.com | own workflow |

Older demo sites (`visaexpert`, `ainews`, `bangladeshexpert`, `qatarexperts`) are still in the
configs but not deployed.

---

## 2. Repository layout

```
AutoBlog/
├─ generator/                  ← Python pipeline (runs in GitHub Actions; local admin optional)
│  ├─ admin/                   ← Flask admin (port 5050): dashboard, generate, manage, settings
│  ├─ modules/
│  │  ├─ agents.py             ← the 3 agents: strategize → write_draft → optimize
│  │  ├─ seo_playbook.py       ← SEO rules injected into every agent (edit here)
│  │  ├─ pipeline.py           ← orchestrator + quality guards
│  │  ├─ llm.py                ← free LLM fallback chain (see §6)
│  │  ├─ research.py, trends.py← topic research
│  │  ├─ image.py, photos.py   ← images (Pixabay → Openverse CC0 / Pollinations)
│  │  ├─ internal_links.py     ← links new posts to existing ones on the same site
│  │  ├─ seo.py                ← slug, meta, JSON-LD, body assembly
│  │  ├─ store.py              ← data layer: d1 (production) | supabase | local
│  │  ├─ wordpress.py          ← WP REST publisher (probashiinfo)
│  │  └─ indexnow.py           ← pings IndexNow after publishing
│  ├─ sites/sites_config.json  ← SOURCE OF TRUTH for sites (generator side)
│  ├─ config/settings.py       ← env → config constants (LLM_CHAIN etc.)
│  └─ drip.py                  ← drip generator used by the workflows
│
├─ web/                        ← the websites (ONE Next.js 15 app → one Worker per site)
│  ├─ src/app/                 ← routes: /s/[site], /s/[site]/[slug], topic, api/scores, sitemap…
│  ├─ src/middleware.ts        ← SITE_ID → serves one site at the domain root with clean URLs
│  ├─ src/data/sites.json      ← SOURCE OF TRUTH for sites (web side — keep in sync!)
│  ├─ src/lib/data.ts          ← D1 reads (slim columns, Cache API, stale-on-error)
│  ├─ src/sites/<id>/          ← per-site designs (Home, Article, theme.css, …) + registry.ts
│  ├─ cache-worker.js          ← Worker entry: 30-min edge cache for HTML around OpenNext
│  ├─ open-next.config.ts      ← OpenNext Cloudflare adapter config
│  └─ deploy-site.ps1          ← build + deploy one site from Windows (writes wrangler.jsonc)
│
├─ .github/workflows/
│  ├─ autoblog-drip.yml        ← daily articles → D1 (also ensures D1 indexes)
│  ├─ manual-batch.yml         ← N articles for one site, by hand
│  ├─ aim-news.yml             ← daily AI news → D1 table aim_news
│  ├─ deploy-site.yml          ← manual build + deploy of one Worker (site input)
│  ├─ verify-sites.yml         ← read-only health check: HTTP 200s, D1 indexes, D1 rows read/day
│  └─ probashi-*.yml           ← WordPress site automation
├─ pulse/, pulse-android/      ← realtime visitor dashboard (pulse.countly.net) + Android app
└─ supabase/schema.sql         ← legacy schema (the D1 `articles` table mirrors it)
```

---

## 3. How an article is made (the 3-agent pipeline)

`modules/pipeline.py` → `generate_article(site, title)`:

1. **Agent 1 — SEO Strategist** (`agents.strategize`): keyword cluster (Google intent), GEO-aware
   outline, target length, "quick answer".
2. **Agent 2 — Expert Writer** (`agents.write_draft`): full semantic-HTML draft with tables, a
   quick-answer opener, FAQ, key takeaways, and inline-image markers `[[IMG: keyword]]`.
3. **Agent 3 — SEO Optimizer** (`agents.optimize`): helpful-content / E-E-A-T / AI-Overview polish,
   meta title/description, internal-link suggestions.
4. **Inline images**: `[[IMG: …]]` markers → real Pixabay photos (capped 4).
5. **Internal links**: keyword phrases linked to existing posts on the same site.
6. **SEO assembly**: slug, meta, JSON-LD (Article + FAQ), key-takeaways box + FAQ appended.
7. **Quality guards** (`pipeline.py`): reject non-Latin script on English sites, stale "today"
   titles, and finished events written as upcoming.
8. **Publish**: written to Cloudflare D1 via `store.add_article` (`STORAGE_BACKEND=d1`, uses
   `wrangler d1 execute`), or to WordPress for `publish_target: wordpress` sites.

All 3 agents are "trained" by `modules/seo_playbook.py` (Google Helpful Content + E-E-A-T + GEO/AEO
for AI Overviews + human-voice anti-AI-tell rules). **Update SEO strategy in that one file.**

Without any working LLM it falls back to a single mock draft (`is_mock = 1`) so the flow still runs —
these are low quality; watch for them.

---

## 4. Tech stack

- **Generator**: Python 3.12, `openai` SDK (all chain providers are OpenAI-compatible), `requests`,
  `json-repair`, `python-slugify`; `wrangler` (Node) for D1 writes.
- **Sites**: Next.js 15.5.19 (App Router, React 19, TypeScript), plain CSS per theme,
  built for Workers with `@opennextjs/cloudflare`.
- **DB**: Cloudflare D1 `autoblog-content` (free tier: 5M rows read/day, 100k writes/day).
- **Hosting**: Cloudflare Workers (free plan, ~10 ms CPU/request → hence the edge cache).
- **LLM**: free fallback chain (§6). **Images**: Pixabay, Openverse CC0, Pollinations.
- **Analytics**: GA4, Ahrefs (countly), own Pulse beacon. (Vercel Analytics removed.)

---

## 5. Run it

**Automatic (normal):** nothing to do — `autoblog-drip.yml` runs twice a day in GitHub Actions.
Manual extra articles: Actions → *Manual batch* → site + count.

**Local admin (optional, Windows):**
```powershell
cd M:\Code\AutoBlog\generator
.\.venv\Scripts\Activate.ps1
python admin\app.py                   # → http://127.0.0.1:5050
```
Restart it by killing the **port-5050 owner** (a `pythonw` child lingers otherwise):
`$o=(Get-NetTCPConnection -LocalPort 5050 -State Listen -EA SilentlyContinue).OwningProcess; if($o){Stop-Process -Id $o -Force}`

**Web app locally:** `cd web && npm run dev` (no D1 binding locally → falls back to Supabase/local
JSON if configured; mostly used for design work).

**Deploy a site** (deploys are manual):
- From GitHub: Actions → **Deploy site (Cloudflare Worker)** → pick the site (optional dry run).
  It builds with `npx opennextjs-cloudflare build`, deploys with `npx wrangler deploy`, then
  smoke-tests the domain.
- From the PC: `powershell -ExecutionPolicy Bypass -File web/deploy-site.ps1 <site> [-DryRun]`.

Both write the same gitignored `web/wrangler.jsonc`: Worker `autoblog-<id>`, `main: cache-worker.js`,
assets binding `ASSETS`, D1 binding `DB` → `autoblog-content`, var `SITE_ID`, custom domains
`<domain>` + `www.<domain>`.

**Verify:** Actions → **Verify sites (read-only)**. HTML is edge-cached 30 min per colo, so append
`?v=<random>` when checking by hand.

---

## 6. Configuration & secrets

**GitHub Actions secrets** (production): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`
(+ optional `MISTRAL_API_KEY`, `DEEPSEEK_MODEL`), `PIXABAY_API_KEY`, `PROBASHIINFO_WP_*`.
The Cloudflare token needs D1 Edit (writes), Workers Scripts Edit + Workers Routes/Custom Domains
(deploys) and Account Analytics Read (verify workflow).

**LLM chain** — `LLM_PROVIDER=chain` (default) tries `LLM_CHAIN` in `generator/config/settings.py`
in order, falling through on quota/overload errors and skipping providers without a key:
Gemini flash → Gemini flash-lite → Cerebras → Groq → Mistral → Workers AI → OpenRouter free →
DeepSeek (paid, last resort). Set `LLM_PROVIDER=<name>` to pin one provider.

**Local `generator/.env`** (gitignored) holds the same keys for running on the PC, plus
`STORAGE_BACKEND=d1`.

---

## 7. Daily use

- **Drip** — `autoblog-drip.yml` at 15:00 + 20:00 UTC: 1 article per drip-enabled site per run.
  `drip.py all` covers sites with `drip_enabled` (infkey, ninetymins); countly has its own step
  (`drip_enabled: false` so it isn't doubled) with a daily-rotating wealth seed on the 20:00 run.
- **Manual batch** — `manual-batch.yml`: site, count, optional topic seed / category / style.
- **Edit / unpublish** — set `status` (`draft` / `archived`) on the D1 row (local admin or
  `wrangler d1 execute autoblog-content --remote`). Archive instead of deleting.
- GitHub disables scheduled workflows after ~60 days without repo activity — re-enable them in
  the Actions tab if posting stops.

---

## 8. ➕ Add a NEW website

1. **Generator config** — add the site object to `generator/sites/sites_config.json`
   (`id`, `name`, `domain`, `tagline`, `niche`, `language`, `tone`, `audience`, `theme`,
   `default_word_count`, `drip_enabled`).
2. **Web config** — add the SAME object to `web/src/data/sites.json` (keep both in sync).
3. **Domain map** — `web/src/lib/sites.config.ts` `DOMAIN_TO_SITE`: `"mysite.com"` + `"www.mysite.com"`.
4. **Design** — `web/src/sites/mysite/` with `Home.tsx`, `Article.tsx`, `theme.css` (contract §9),
   then register it in `web/src/sites/registry.ts`.
5. **Typecheck/build** — `cd web && npx tsc --noEmit && SITE_ID=mysite npx next build`.
6. **Deploy** — add the domain to the `case` in `.github/workflows/deploy-site.yml` (and the choice
   list) and to `$domains` in `web/deploy-site.ps1`; the domain's zone must be on the same Cloudflare
   account. Then run the deploy workflow — wrangler creates the Worker and the custom domains.
7. **Content** — enable `drip_enabled` or run *Manual batch* for a small foundation. Drip, don't dump.

---

## 9. Per-site design contract (for a design agent)

Each `web/src/sites/<id>/Home.tsx` and `Article.tsx` are **React Server Components** (no hooks, no
`"use client"`; interactivity = CSS-only). Both start with `import "./theme.css";`. Props come from
`@/lib/types`:
```ts
SiteHomeProps    { site: Site; articles: Article[] }
SiteArticleProps { site: Site; article: Article; related: Article[]; bodyHtml: string; toc: TocItem[] }
```
- `bodyHtml` is fully processed (tables wrapped, heading ids, key-takeaways box + FAQ + inline
  `<figure>` images already inside). Render once: `<div className="article-content"
  dangerouslySetInnerHTML={{ __html: bodyHtml }} />`. Don't re-render `article.faq`.
- Article links: `/s/${site.id}/${article.slug}`. Images: plain `<img loading="lazy">`.
- `theme.css`: scope EVERY selector under `.site-<id>`. The shared `app/globals.css` styles
  `.article-content` + premium tables via CSS variables — set `--accent`, `--accent-soft`,
  `--accent-line`, `--table-head`, `--table-border`, `--table-zebra`, `--table-hover` on `.site-<id>`.
- Mobile-first responsive. **Hero pitfall:** never combine `aspect-ratio` + `height:100%` on a grid
  image — it computes width from height and overflows the column (this exact bug hit QatarExperts).
  Use `width:100%` and let the grid column set the width; add `min-width:0` to grid children.

---

## 10. Infrastructure (accounts & IDs)

- **Cloudflare** account (`CLOUDFLARE_ACCOUNT_ID` secret): Workers `autoblog-countly`,
  `autoblog-ninetymins`, `autoblog-infkey`; D1 `autoblog-content`
  (`58dacf96-c574-4f0b-88e6-3005d895eb90`), tables `articles`, `aim_news`; Pulse worker
  (`pulse.countly.net`). Free plan.
- **D1 indexes** (created by the workflows' "Ensure D1 indexes" step):
  `idx_articles_site_status_created (site_id, status, created_at)` and
  `idx_articles_site_slug (site_id, slug)`.
- **GitHub Actions** — all scheduled work (no PC needed).
- Legacy, unused: Supabase project `yfzxnxexhssbthfyiznj`, Vercel team `team_aTdfAHvhg921PdFGtFnp0qgj`.

---

## 11. Key decisions & gotchas (read before changing things)

- **One Next.js codebase, one Worker per site.** `SITE_ID` pins a Worker to one site;
  `middleware.ts` rewrites `/` → `/s/<SITE_ID>` and 308-redirects `/s/<id>/..` to clean URLs.
- **Two site-config files** must stay in sync (`generator/sites/sites_config.json`,
  `web/src/data/sites.json`).
- **D1 read budget (5M rows/day free).** `web/src/lib/data.ts` reads slim list columns, a single
  row per article, uses the Cache API (listings fresh 15 min) with stale-on-error, React `cache()`
  and SQL search. Before this, the sites read ~5–6M rows/day and 500'd every evening. Check usage
  with the verify workflow.
- **Edge cache** — `web/cache-worker.js` caches HTML/XML 30 min per colo (Workers free plan has a
  ~10 ms CPU limit; SSR would trip error 1102). `/api/*` and RSC requests (`RSC: 1`,
  `Next-Router-*`, `_rsc`) are never cached — caching RSC under the page URL once served raw flight
  data as the homepage.
- **Next 15.5.19 pinned** — older 15.x has CVE-2025-66478. Don't downgrade.
- **Hero pitfall** — never mix `aspect-ratio` + `height:100%` on a grid image (§9).
- **ninetymins live data (all free):**
  - ESPN's undocumented keyless API (`site.api.espn.com`) → `/api/scores`, `/scores` board and the
    `/match/<league>/<id>-<a>-vs-<b>` match centre (timeline, stats, line-ups, commentary).
  - CricketData.org (`api.cricapi.com`, free plan ≈100 calls/day) → cricket in the strip/board and
    `/cricket/<uuid>-<a>-vs-<b>`. One `currentMatches` call cached 30 min per colo. The key is the
    Worker secret **`CRICAPI_KEY`** (never in git): `cd web; npx wrangler secret put CRICAPI_KEY --name autoblog-ninetymins`.
  - Wikipedia REST summaries ("About the teams" on match pages, CC BY-SA with source link) and
    OpenLigaDB (Bundesliga top scorers on `/topic/football`). flagcdn.com for flags.
  - `/topic/saff-championship` is a hand-built hub (`web/src/sites/ninetymins/saff.ts` holds the finals list).
  - Every feed fails soft: cached copy, else the widget hides. SAFF has no live feed anywhere free.

---

## 12. Honest caveats (don't over-promise)

- **No tool guarantees first-page Google ranking.** Ranking needs domain authority, real backlinks,
  competition, and time. Real domains (now connected) matter far more than any on-page trick.
- **Mass-publishing AI articles risks Google "scaled content abuse."** Prefer quality + a gradual
  drip over dumping dozens at once on a fresh site. Keep a human-review step.
- **No method makes AI text reliably "undetectable."** The human-voice rules help, but Google ranks
  on *helpfulness*, not an AI detector. Write genuinely useful content.
- **External backlinks are NOT automated** (that's a Google link-scheme risk). Only internal linking
  is automated. Earn external links with outreach/quality.
- **AI images** come from Pollinations (free, Stable-Diffusion-based). True DALL·E/ChatGPT images
  need an OpenAI key (not configured).

---

## 13. Roadmap / TODO

See `HANDOFF.md` for the current, ordered TODO list.
