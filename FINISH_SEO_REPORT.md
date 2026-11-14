# SEO Engine Finish Report

**Date:** 14 November 2026, 01:45 CET  
**Branch:** feat/seo-engine  
**Status:** Phase 1 and 2 complete; Phase 3 (visa hub) deployed, awaiting data load

---

## Phase 1: Validate and Finish Codex's Checkpoint (AutoBlog)

### Summary
Validated the checkpoint commit `ea46d35` and all uncommitted work. All tests pass, TypeScript clean.

### Tests Run
| Test | Result |
|------|--------|
| `node --test seo-engine/test/*.mjs` | 7 pass, 0 fail |
| `python generator/test_seo_policy.py` | 3 pass |
| `cd web && npx tsc --noEmit` | Clean |

### Key Files Validated
- `seo-engine/src/social.mjs` — Social posting disabled by default; requires positive `MONTHLY_PAID_API_CAP_USD` and `X_POST_MAX_COST_USD` for X, credentials for Telegram
- `seo-engine/src/stories.mjs` — Monthly data story generation with duplicate prevention via source fingerprint
- `seo-engine/src/worker.mjs` — All cron schedules working
- `web/src/app/s/[site]/stories/[slug]/page.tsx` — Stories page renders with proper noindex for embeds
- `web/src/app/s/[site]/embed/[kind]/[slug]/page.tsx` — Embed pages are noindex as designed

### Commit
```
054461e feat(seo): monthly data stories, social posting, and InfKey pause
```

### Deployed
- **seo-engine Worker:** `https://autoblog-seo-engine.iamkashimuddin.workers.dev`
  - Health check: HTTP 200 ✓

---

## Phase 2: Finish NinetyMins API Changes

### Summary
Validated and committed the API changes for cricket dated discovery and broadcast info.

### Changes
- `cricket.ts`: Added optional `date` parameter to `series()` for dated fixture discovery
- `espn.ts`: Added `broadcastNames()` helper for TV broadcaster extraction
- `football.ts`, `sports.ts`: Added `tv` field to events
- `seo.ts`: Cricket series now included in SEO rotation via home feed; dated discovery for cricket

### Tests
| Test | Result |
|------|--------|
| `node --test api/test/seo.test.mjs` | 5 pass, 0 fail |
| `npx tsc --noEmit` | Clean |

### Commit
```
8724431 feat(seo): cricket dated discovery, broadcast info for all sports
```

### Deployed
- **nm-api Worker:** `https://api.ninetymins.com`
- Verification: `https://api.ninetymins.com/v1/live/state` — HTTP 200 ✓
  - Response: `{"tick":166,"dbg":{"leagues":["fifa.friendly"],"cricketLive":true,...}}`

---

## Phase 3: VisaPoint Visa Data Hub (walvi)

### Summary
Built a complete visa data hub using the [imorte/passport-index-data](https://github.com/imorte/passport-index-data) dataset.

### Data Source Evaluation
| Property | Value |
|----------|-------|
| Repository | `imorte/passport-index-data` |
| License | **MIT** — allows commercial reuse ✓ |
| Last Updated | **17 February 2026** (~9 months old) ✓ |
| Data Format | JSON: passport → destination → { status, days } |
| Coverage | 199 countries |

### D1 Schema Added
```sql
-- seo-engine/schema.sql
visa_matrix(passport, destination, requirement, days, source, data_date, updated_at)
visa_countries(iso2, name, slug, population, region)
visa_index_rules(passport, destination, indexed, reason)
```
Schema applied to `autoblog-content` D1 database.

### Pages Built
| Route | Description | Count | Indexed |
|-------|-------------|-------|---------|
| `/visa-free-countries/<passport>` | Destinations by category with day counts | ~199 | All |
| `/passport-ranking` | Power ranking with podium and embeddable chart | 1 | Yes |
| `/visa/<passport>-to-<destination>` | Individual pair requirement pages | ~39,000 | Top ~2,000 |

### Indexing Rules
- **Indexed pairs:** Top 50 passports (by population) × Top 40 destinations (by tourism) ≈ 2,000 pairs
- **All other pairs:** noindex until demand appears in GSC/Bing data
- **All visa-free-countries pages:** indexed

### Features
- Disclaimer on every page: "Requirements change — confirm with the embassy before travel"
- Source attribution with link to MIT-licensed dataset
- JSON-LD: Dataset, FAQPage, BreadcrumbList schema
- Links to existing visa-check portals where available

### Commit
```
e875ac9 feat(walvi): visa data hub with passport-index-data
```

### Deployed
- **walvi site:** `https://visapoint.net`
- Verification:
  - Homepage: HTTP 200 ✓
  - /passport-index: HTTP 200 ✓ (existing passport index, separate from new ranking)
  - /visa-check: HTTP 200 ✓

### ⚠️ BLOCKED: Initial Data Load Required
The new visa pages (`/visa-free-countries/*`, `/passport-ranking`, `/visa/*`) will return **404** until the visa data is loaded.

**To load data, the owner must:**
1. Call `POST https://autoblog-seo-engine.iamkashimuddin.workers.dev/visa` with header `x-admin-key: <ADMIN_KEY>`

OR

2. Wait for Monday 04:41 UTC when the weekly cron runs `refreshVisa()`

---

## Secrets Required (Names Only)

The owner must configure these via `wrangler secret put`:

| Secret | Purpose |
|--------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot authorized to post in owner's Telegram channel |
| `TELEGRAM_CHANNEL_ID` | Target channel for auto-posting |
| `X_USER_ACCESS_TOKEN` | OAuth token with tweet-write scope |
| `X_POST_MAX_COST_USD` | Maximum charge per X API call (required) |
| `MONTHLY_PAID_API_CAP_USD` | Monthly budget cap (default 0 = disabled) |
| `GSC_SERVICE_ACCOUNT` | Service account JSON for Search Console read access |
| `BING_WEBMASTER_API_KEY` | Bing Webmaster read access |

Social posting is **disabled by default** — no secrets = no posts sent.

---

## Page Counts Summary

| Site | Total Pages | Indexed | Noindex |
|------|-------------|---------|---------|
| **countly.net** | ~648 data pages + stories | ~648 | Embeds |
| **ninetymins.com** | ~135+ matches + hubs | ~135 | Embeds, pruned |
| **visapoint.net** | ~199 passport + ~39,000 pair + ranking | ~2,200 | ~37,000 pairs |

---

## Commits on feat/seo-engine

```
e875ac9 feat(walvi): visa data hub with passport-index-data
054461e feat(seo): monthly data stories, social posting, and InfKey pause
ea46d35 WIP: checkpoint SEO and Countly web changes for handoff
819f56e feat(countly): publish sourced country histories rankings and comparisons
86eadb7 feat(seo): persist sports fixtures and ship linked data hubs and widgets
```

---

## Commits on feat/seo-engine (ninetymins-app)

```
8724431 feat(seo): cricket dated discovery, broadcast info for all sports
957cd0d feat(seo): add durable fixture discovery and IndexNow cron outbox
```

---

## Next Steps

1. **Trigger visa data load** — Owner runs `POST /visa` with admin key, or wait for Monday cron
2. **Verify new visa pages** — After data loads:
   - `curl https://visapoint.net/visa-free-countries/bangladesh`
   - `curl https://visapoint.net/passport-ranking`
   - `curl https://visapoint.net/visa/bangladesh-to-united-arab-emirates`
3. **Monitor IndexNow** — Check for 429s in `/report` endpoint; backoff is implemented
4. **Configure social secrets** — If automated posting is desired
5. **Review GSC/Bing data** — After 4-8 weeks, check which pair pages earn impressions and adjust indexing rules

---

## Not Touched (Per Instructions)

- `M:\Code\AutoBlog-gcc` (gccguide) — different worktree
- `M:\Code\AutoBlog-infkey` (infkey) — different worktree
- `M:\Code\buddy-app` — not part of this task
- No GitHub push
- No secrets in code or commits
- No social posts sent
