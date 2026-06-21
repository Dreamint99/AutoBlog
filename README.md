# AutoBlog — automated multi-site SEO blog network

AutoBlog runs **several independent blog websites from one place**. A local Python admin
generates SEO articles with a 3-agent AI pipeline and publishes them to a shared database;
each website is a separate Next.js app on Vercel that reads that database and renders with its
own unique design.

```
   ┌─────────────────────────────┐
   │  LOCAL: Python admin (Flask) │   generator/   http://127.0.0.1:5050
   │  3-agent SEO pipeline        │   pick a site → generate → publish
   └──────────────┬──────────────┘
                  │ writes (REST)
          ┌───────▼────────┐
          │  Supabase DB   │   one `articles` table, shared by every site
          │  (Postgres)    │   project "AutoBlog" · id yfzxnxexhssbthfyiznj · ap-south-1
          └───────┬────────┘
                  │ reads (no-store → instant)
   ┌──────────────┼───────────────┬───────────────┐
   ▼              ▼               ▼               ▼
 VisaExpert     AINews     BangladeshExpert   QatarExperts     ← web/ (one Next.js codebase,
 (own design)  (own design)  (own design)    (own design)        deployed once PER SITE)
```

Publish from the local admin → it lands in Supabase → the live Vercel site shows it within seconds.

---

## 1. Live sites

| id | niche | theme | live URL |
|----|-------|-------|----------|
| `visaexpert` | visas / immigration | trust-blue | https://autoblog-visaexpert.vercel.app |
| `ainews` | AI news & tools | tech-dark (dark) | https://autoblog-ainews.vercel.app |
| `bangladeshexpert` | Bangladesh travel/culture | bd-green | https://autoblog-bangladeshexpert.vercel.app |
| `qatarexperts` | Qatar lifestyle | qatar-maroon | https://autoblog-qatarexperts.vercel.app |

Custom domains aren't connected yet (these are `*.vercel.app`). `*.vercel.app` is weak for SEO —
connect real domains in Vercel + `DOMAIN_TO_SITE` (see §8) for actual ranking.

---

## 2. Repository layout

```
AutoBlog/
├─ generator/                  ← LOCAL Python brain (admin + pipeline). NOT deployed.
│  ├─ admin/
│  │  ├─ app.py                ← Flask admin server (port 5050): pages + JSON API + jobs
│  │  ├─ templates/            ← dashboard, generate, manage, edit, preview, settings
│  │  └─ static/               ← css/js for the admin UI
│  ├─ modules/
│  │  ├─ agents.py             ← the 3 agents: strategize → write_draft → optimize
│  │  ├─ seo_playbook.py       ← SEO "training" injected into every agent (edit to update rules)
│  │  ├─ pipeline.py           ← orchestrator: 3 agents → images → internal links → publish
│  │  ├─ image.py              ← feature + inline images (Pixabay → Pollinations AI fallback)
│  │  ├─ internal_links.py     ← links new posts to existing ones (safe internal "backlinks")
│  │  ├─ seo.py                ← slug, meta, JSON-LD schema, reading time, body assembly
│  │  ├─ store.py              ← data layer: Supabase (REST) or local JSON. add/list/get/update/delete
│  │  ├─ llm.py                ← LLM wrapper (DeepSeek direct OR OpenRouter), provider switch
│  │  ├─ keyword.py, competitor.py, writer.py   ← used by the mock/no-key fallback path
│  │  └─ json_utils.py         ← tolerant JSON parsing of LLM output
│  ├─ sites/sites_config.json  ← SOURCE OF TRUTH for site list (generator side)
│  ├─ config/settings.py       ← reads .env (by absolute path), all config constants
│  ├─ drip.py                  ← scheduled "drip" generator (N new articles/run until target)
│  ├─ drip_qatar.bat           ← wrapper the Windows Task Scheduler runs
│  ├─ .env                     ← secrets (gitignored). See §6.
│  ├─ requirements.txt
│  └─ output/db/articles.json  ← local store (only used when STORAGE_BACKEND=local)
│
├─ web/                        ← the websites (ONE Next.js 15 app, deployed once per site)
│  ├─ src/
│  │  ├─ app/                  ← routes: /, /s/[site], /s/[site]/[slug], sitemap.ts, robots.ts
│  │  ├─ middleware.ts         ← SITE_ID → serve one site at domain root with clean URLs
│  │  ├─ data/sites.json       ← SOURCE OF TRUTH for site list (web side — keep in sync!)
│  │  ├─ lib/                  ← data.ts (Supabase/local read), types.ts, article.ts, sites.config.ts
│  │  └─ sites/                ← PER-SITE DESIGNS
│  │     ├─ registry.ts        ← maps site id → its Home/Article components
│  │     ├─ visaexpert/        ← Home.tsx · Article.tsx · theme.css
│  │     ├─ ainews/            ← Home.tsx · Article.tsx · theme.css
│  │     ├─ bangladeshexpert/  ← Home.tsx · Article.tsx · theme.css
│  │     └─ qatarexperts/      ← Home.tsx · Article.tsx · theme.css
│  ├─ package.json             ← Next 15.5.19 (do NOT downgrade; older = Vercel CVE block)
│  └─ .env.local               ← local-dev Supabase creds (gitignored) so `npm run dev` shows real data
│
├─ supabase/schema.sql         ← the `articles` table + RLS policies
└─ README.md                   ← this file
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
7. **Publish**: written to Supabase via `store.add_article`.

All 3 agents are "trained" by `modules/seo_playbook.py` (Google Helpful Content + E-E-A-T + GEO/AEO
for AI Overviews + human-voice anti-AI-tell rules). **Update SEO strategy in that one file.**

Without an LLM key it falls back to a single mock draft (so the flow still runs).

---

## 4. Tech stack

- **Generator**: Python 3, Flask, `openai` SDK (used for both DeepSeek and OpenRouter — both
  OpenAI-compatible), `requests`, `json-repair`, `python-slugify`. venv at `generator/.venv`.
- **Sites**: Next.js 15 (App Router, TypeScript, React 19), plain CSS per theme (no Tailwind).
- **DB**: Supabase (Postgres + PostgREST + RLS).
- **Hosting**: Vercel (one project per site). **LLM**: DeepSeek (direct). **Images**: Pixabay + Pollinations.

---

## 5. Run it

**Generator admin (local):**
```powershell
cd "D:\My app\AutoBlog\generator"
.\.venv\Scripts\Activate.ps1          # venv already created
python admin\app.py                   # → http://127.0.0.1:5050
```
Pages: **Dashboard** · **Generate** (bulk + manual) · **Manage** (edit/delete) · **Settings**.

**Web app (local preview, optional):**
```powershell
cd "D:\My app\AutoBlog\web"
npm run dev                           # → http://127.0.0.1:3000  (hub: links to each /s/<site>)
```
`web/.env.local` points local dev at Supabase so you see real content.

> Windows gotcha: the admin is launched detached and `pythonw.exe`/venv children can linger. To
> restart cleanly, **kill by the process that OWNS port 5050**, not by image name:
> ```powershell
> $o=(Get-NetTCPConnection -LocalPort 5050 -State Listen -EA SilentlyContinue).OwningProcess
> if($o){ Stop-Process -Id $o -Force }
> ```

---

## 6. Configuration — `generator/.env`

```ini
STORAGE_BACKEND=supabase
SUPABASE_URL=https://yfzxnxexhssbthfyiznj.supabase.co
SUPABASE_SERVICE_KEY=<anon key today; replace with service_role for prod security>

LLM_PROVIDER=deepseek                 # deepseek | openrouter
DEEPSEEK_API_KEY=<key>
OPENROUTER_API_KEY=<key>              # wired but unused; its deepseek routes tested thin/slow
OPENROUTER_MODEL=deepseek/deepseek-chat   # for top quality try anthropic/claude-3.5-sonnet

IMAGE_PROVIDER=pixabay               # pixabay | pollinations(AI) | placeholder
PIXABAY_API_KEY=<key>
```
`config/settings.py` loads this `.env` by **absolute path**, so it works no matter the working
directory (admin, drip, or a scheduled task). Keys live only here; `.env` is gitignored.

**Security note:** the admin currently writes with the Supabase **anon** key, enabled by open RLS
`insert/update/delete` policies. For production, put the **service_role** key in
`SUPABASE_SERVICE_KEY` and drop the open anon write policies.

---

## 7. Daily use

- **Bulk** (`/generate` → ⚡ Bulk): tick websites + a count → AI plans unique keyword topics per site,
  writes full articles, publishes live. Parallel (4 at a time).
- **Manual** (`/generate` → ✍️ Manual): one site + your own titles.
- **Manage** (`/manage`): edit / delete any post (live in seconds). Edit → status `draft` hides it.
- **Drip** (the Google-safe way to scale): `drip.py` publishes a few NEW unique articles per run
  until a site hits a target. Windows Task **"AutoBlog-Qatar-Drip"** runs `drip_qatar.bat` daily 10:00
  → 3/day until QatarExperts has 50.
  ```powershell
  python drip.py qatarexperts 3 50     # site, per-run, target
  python drip.py all 1 50              # 1/day for every site
  ```

---

## 8. ➕ Add a NEW website (do this for the next site)

1. **Generator site config** — add an object to `generator/sites/sites_config.json`:
   ```json
   { "id":"mysite", "name":"MySite", "domain":"mysite.com",
     "tagline":"…", "niche":"…comma,separated,keywords…", "language":"en",
     "tone":"…how it should write…", "audience":"…who it's for…",
     "theme":"mysite-theme", "default_word_count":1500 }
   ```
2. **Web site config** — add the SAME object to `web/src/data/sites.json` (keep both files in sync).
3. **Domain map** (for later real domains) — add to `web/src/lib/sites.config.ts` `DOMAIN_TO_SITE`:
   `"mysite.com":"mysite", "www.mysite.com":"mysite"`.
4. **Design** — create three files: `web/src/sites/mysite/Home.tsx`, `Article.tsx`, `theme.css`.
   Easiest: copy an existing site's folder and restyle, OR hand a design agent the **contract** in
   §9. Each theme.css must scope every selector under `.site-mysite`.
5. **Register** — add to `web/src/sites/registry.ts`:
   ```ts
   import MyHome from "./mysite/Home";  import MyArticle from "./mysite/Article";
   // …
   mysite: { Home: MyHome, Article: MyArticle },
   ```
6. **Typecheck**: `cd web && npx tsc --noEmit`.
7. **Deploy** (one Vercel project for the site):
   ```powershell
   cd "D:\My app\AutoBlog\web"
   $team="team_aTdfAHvhg921PdFGtFnp0qgj"
   $SUPA="https://yfzxnxexhssbthfyiznj.supabase.co"
   $ANON="<supabase anon key>"
   vercel link --yes --project autoblog-mysite --scope $team
   vercel deploy --prod --yes --scope $team -e SITE_ID=mysite -e SUPABASE_URL=$SUPA -e SUPABASE_ANON_KEY=$ANON
   ```
   → live at `https://autoblog-mysite.vercel.app`.
8. **Content**: restart the admin (so it loads the new site), then Bulk-generate a small foundation
   and/or add a drip task. Done.

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

- **Supabase** project `AutoBlog` — id `yfzxnxexhssbthfyiznj`, region `ap-south-1`. Table `articles`
  (schema in `supabase/schema.sql`). RLS: public reads `status='published'`; anon insert/update/delete
  (open — see §6 security note). $10/month.
- **Vercel** team `team_aTdfAHvhg921PdFGtFnp0qgj`. One project per site: `autoblog-<id>`. Each has env
  `SITE_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (passed via `-e` on deploy). Hobby tier = free.
- **Windows Task Scheduler** task `AutoBlog-Qatar-Drip` (daily 10:00).

---

## 11. Key decisions & gotchas (read before changing things)

- **One Next.js codebase, deployed N times.** `SITE_ID` env pins a deployment to one site;
  `middleware.ts` rewrites `/` → `/s/<SITE_ID>` and 308-redirects `/s/<id>/..` links to clean `/slug`.
  Locally (no SITE_ID) the root is a hub and sites live at `/s/<id>`.
- **Two site-config files** (`generator/sites/sites_config.json` and `web/src/data/sites.json`) must
  stay in sync. (Web can't read the generator folder on Vercel, so the list is bundled.)
- **`cache: "no-store"`** in `web/src/lib/data.ts` makes new posts appear instantly. For high traffic,
  switch to ISR (`revalidate`) + on-demand revalidation.
- **Next 15.5.19 pinned** — Vercel blocks the older 15.1.x (CVE-2025-66478). Don't downgrade.
- **Restart admin by killing the port-5050 owner** (see §5) — image-name kills miss `pythonw`/children.
- Internal `/s/..` links 308-redirect to clean URLs on a live single-site deployment; canonical +
  sitemap already use clean `/slug`.

---

## 12. Honest caveats (don't over-promise)

- **No tool guarantees first-page Google ranking.** Ranking needs domain authority, real backlinks,
  competition, and time. `*.vercel.app` subdomains rank poorly — use real domains.
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

- Connect real custom domains (biggest lever for actual SEO).
- Real keyword volume + SERP data (Semrush / Google APIs) instead of LLM-only keyword ideas.
- `service_role` key for production-secure writes; drop open anon write policies.
- Optional: stronger OpenRouter model (Claude/GPT) for top-tier writing; queue/worker for true
  100/day scale; drip tasks for all sites.
```
