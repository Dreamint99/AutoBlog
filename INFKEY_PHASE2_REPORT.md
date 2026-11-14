# infkey.com phase 2 — status (14 Nov 2026)

Live version: `9386f8f1-130d-4660-a631-801826d15ef6` (previous: `548acd90-9365-4a14-b8a4-55990ac7d0da`).

| Item | State |
|---|---|
| 1. Can I run it? | Live: `/run`, `/run/<model>`, `/run/<model>/<gpu>`, `/gpu/<gpu>`, and (new today) `/gpu` index of all 50 GPUs with VRAM, bandwidth, models that fit at 4-bit and the largest one. Top models + popular GPUs indexable; pair pages noindex. |
| 2. AI Status | Live: `/status` and `/status/<service>` (`chatgpt`, `claude`, `cohere`, `cursor`, `elevenlabs`, …), 5-minute cron. |
| 3. New / upcoming | `/new` and `/changes` live (daily). `/upcoming` NOT built: it needs hand-checked official announcements with sources, and the rules forbid invented dates. Build it only from a curated, sourced list. |
| 4. Prune | `INFKEY_PRUNE_LIST.md` lists 300 articles with 0 impressions (not applied). The seo-engine run (`generator/data/seo_prune_infkey.json`, branch `feat/seo-engine`) marked them **keep / protected** because impressions data was incomplete. The two disagree, so nothing is noindexed. Owner decision needed. |

Checks today: `/gpu` 200 with canonical `/gpu`, in sitemap, 50 GPU links; `/`, `/run`, `/gpu/rtx-5090`, `/models`, `/status`, `/status/chatgpt`, `/new`, `/changes`, `/sitemap.xml` all 200 with no render errors.
