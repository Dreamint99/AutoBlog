# AutoBlog — agent quick-start

**Read `README.md` first** — it has the full architecture, file map, and step-by-step guides.

This is a multi-site SEO blog network: a **local Python admin** (`generator/`, Flask, port 5050)
runs a **3-agent pipeline** that writes articles to **Supabase**, and **4 Next.js sites** (`web/`,
one codebase deployed once per site on Vercel) read Supabase and render with their own designs.

## Must-know before you touch anything
- **Two site-config files must stay in sync:** `generator/sites/sites_config.json` and
  `web/src/data/sites.json`.
- **Adding a site / per-site design contract:** README §8 and §9.
- **Restart the admin by killing the port-5050 OWNER**, not by process name (a `pythonw` child lingers):
  `$o=(Get-NetTCPConnection -LocalPort 5050 -State Listen -EA SilentlyContinue).OwningProcess; if($o){Stop-Process -Id $o -Force}`
- **Deploy a site:** `vercel link --project autoblog-<id>` then `vercel deploy --prod -e SITE_ID=<id>
  -e SUPABASE_URL=… -e SUPABASE_ANON_KEY=…` (team `team_aTdfAHvhg921PdFGtFnp0qgj`).
- **Next is pinned to 15.5.19** (older = Vercel CVE block). Don't downgrade.
- **CSS hero pitfall:** never mix `aspect-ratio` + `height:100%` on a grid image (it overflows the
  column). Use `width:100%` + `min-width:0`.
- **Secrets** live in `generator/.env` (gitignored): DeepSeek, OpenRouter, Pixabay, Supabase.
- **LLM:** `LLM_PROVIDER=deepseek` (direct DeepSeek beat OpenRouter's deepseek routes in testing).
- **SEO rules** for the writers live in one file: `generator/modules/seo_playbook.py`.

## Honest caveats to keep repeating to the user
No tool guarantees first-page ranking; `*.vercel.app` ranks poorly (need real domains); mass AI
publishing risks Google "scaled content abuse" (drip, don't dump); AI text isn't reliably
"undetectable" — Google ranks on helpfulness.

## probashiinfo.com (WordPress, Bengali) — the 5th site
- Not a Vercel site: `publish_target: wordpress` → `generator/modules/wordpress.py` posts via the WP REST API
  (creds only in GitHub secrets `PROBASHIINFO_WP_*`; there is no local `.env`).
- Auto-post: `.github/workflows/probashi-drip.yml`, 2 Bengali posts/day (09:30 + 19:30 BST) on the free LLM
  chain (Gemini first). A run that publishes nothing now fails red. GitHub disables scheduled workflows after
  ~60 days without repo activity — re-enable with `gh workflow enable probashi-drip.yml`.
- Images: real photos only (`generator/modules/photos.py`: Pixabay → Openverse CC0, tag-matched, re-hosted in WP
  media, never reused). One-off repair of old posts: `probashi-fix-images.yml` (dry-run / run / all).
- No English "Key takeaways" box on WordPress posts (pipeline skips it; a WP snippet hides it on old posts).
- Front-end changes on the live site are Code Snippets (WP admin → Snippets), source kept in the
  `Dreamint99/probashi-bondhu-web` repo under `promo/`: Probashi Bondhu promo (#6), Dream International ad (#7),
  newspaper redesign (#8, `PN_PUBLIC` false = admin-only preview), Key takeaways hider (#9).
