# SEO engine operations

The websites remain Next.js/OpenNext Workers. `nm-api` owns fixture discovery,
saved match snapshots, rosters and F1. This small Worker owns World Bank refresh,
data stories, distribution and search monitoring. All new schedules are Cloudflare
crons; no new GitHub Actions jobs were added.

Run these from `M:\Code\AutoBlog`:

```powershell
node --test seo-engine/test/data.test.mjs seo-engine/test/social.test.mjs seo-engine/test/stories.test.mjs
python generator/test_seo_policy.py
node web/node_modules/wrangler/bin/wrangler.js deploy --config seo-engine/wrangler.jsonc
```

Apply `seo-engine/schema.sql` to `autoblog-content` before first deployment.
The shared `seo_pages`/sports schema lives in the API repository's
`api/seo-schema.sql`. Migrations are additive and repeatable.

## Schedules (UTC)

| Job | Schedule | Behavior |
| --- | --- | --- |
| nm-api SEO | odd minutes, every two minutes | Rotate dated fixtures, merge existing live feeds, save changes, enrich snapshots, retry IndexNow |
| World Bank + stories | 03:17 daily | Validate full source responses, retain prior data on error, update only changed content |
| Distribution | hourly at :23 | Retry notification batches; one queued post per configured social channel |
| Search + mentions | Monday 04:41 | Read search APIs when configured, inspect a five-URL sample/site, search brand mentions/known embed hosts |

Snapshots include their actual timestamps. Annual data years are never replaced
with the current year. Sports stories explicitly describe incomplete catalogue
samples; they are not full-season league statistics. No LLM writes are used here. If the annual World Bank cohort has not changed, a new month does not create a duplicate growth story; that skipped publication is recorded instead.

## Admin and credentials

`https://ninetymins.com/admin/seo` and `https://countly.net/admin/seo` reuse the
existing `nm-api` ADMIN_KEY. The engine checks that key with nm-api instead of
copying it. No passwords go in query strings or shared caches.

The engine's authenticated endpoints use the `x-admin-key` header:

- `GET /report`: current operations JSON.
- `POST /run`: manual source refresh; unchanged source data produces zero writes.
- `POST /operations`: stories, monitoring and mention checks; distribution only
  runs for accounts with configured credentials.
- `GET /press/<site>/<yyyy-mm>`: press-ready summary JSON. No emails are sent.

Worker URL: `https://autoblog-seo-engine.iamkashimuddin.workers.dev`.
BOOTSTRAP_KEY was temporary for delivery verification and was deleted afterward.

Configure secrets with Wrangler's interactive `secret put` command; do not paste
secret values into source, chat or reports:

| Secret/config | Purpose |
| --- | --- |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID` | A bot authorized to post in the owner's channel |
| `X_USER_ACCESS_TOKEN` | User-context OAuth access token with post-writing scope for the owner's account |
| `X_POST_MAX_COST_USD` | Conservative maximum charge per X request; required before paid calls |
| `MONTHLY_PAID_API_CAP_USD` | Default `0`; X stays off until a positive cap and per-call maximum are configured |
| `GSC_SERVICE_ACCOUNT` | Service-account JSON authorized read-only on the two Search Console properties |
| `BING_WEBMASTER_API_KEY` | Bing Webmaster read access |

Existing Google authentication uses GitHub OIDC/Workload Identity and cannot be
reused as a Cloudflare credential. Without the new credentials, admin shows the
dated saved-export baseline plus explicit unavailable statuses, not invented live
metrics. Index coverage is a labeled inspected sample, never inferred from clicks.

## Delivery guarantees and limits

- D1 hashes and transactionally queued notifications make refreshes repeatable.
  IndexNow acknowledges the exact queued version and backs off on provider 429s.
- Social ledger keys are `(channel, URL)`. A timeout after possible acceptance is
  marked `delivery_unknown` for review; it is not blindly retried into a duplicate.
  One post/channel/hour is the default, so a backlog is possible.
- Paid calls reserve a maximum cost atomically before sending. Reservations are
  conservative upper bounds, not reconciled provider invoices. Failed calls do
  not release their reservation automatically.
- Free Bing RSS mention search is undocumented and may become unavailable.
  Candidates are explicitly potential mentions; a person verifies the page and
  decides on any outreach. Embedded-widget telemetry stores only the referring
  host, never visitor IDs or query strings. Attribution is optional/nofollow.
- Provider failures keep the last good data and are logged in SEO_LOG. Cloudflare
  infrastructure quotas still apply even when data APIs and summaries are free.

## InfKey publishing pause

`infkey-policy.sql` pauses new InfKey article inserts from legacy deployed jobs.
Both local configs mark InfKey `data_only`, and the generator refuses generic
generation before any LLM call. Verified data products can use `seo_pages`.
For a reviewed sourced article, add `seo_state` key
`approved-article:infkey:<slug>` with value `true`. To lift the site-wide pause,
change `content-policy:infkey` from `data-only` after a deliberate review.
Other sites' inserts and existing InfKey URLs are unaffected by the insert guard.

The branch has not been pushed. Older remote GitHub jobs may still attempt
generation and be rejected by the database; updating those jobs' code requires
publishing the local commits through the owner's normal process.
