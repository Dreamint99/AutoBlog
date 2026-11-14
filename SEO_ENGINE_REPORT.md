# SEO engine delivery report

Updated 14 November 2026 (Europe/Budapest). Target traffic is an objective, not a forecast.

## NinetyMins — deployed foundation

- Persistent D1 fixture catalogue, stable match URLs through pre/live/result, saved rich snapshots, factual answer/recap blocks, existing local kick-off display and live polling.
- Seven-day dated discovery across the backend's football competitions and NBA/WNBA, NFL, NHL, MLB, ATP/WTA and UFC; cricket uses the existing ESPN live/recent/upcoming feed. Individual dated calls replace unsupported ESPN date ranges. Full competition rotation takes about 62 minutes. Seven-day cricket availability depends on the upstream feed; not promised where absent. Tennis availability depends on published draws.
- Team/league/today/tomorrow hubs, internal links, standings when supplied, recorded scorer/player profiles from real roster statistics, race pages/F1 hub from the existing F1 feed, source links, head-to-head/form/model estimates when supplied. No invented predicted line-ups.
- Monthly match sitemaps (50,000 URL partitions), hubs/articles/news maps, robots reference. News entries are limited to the last 48 hours. lastmod records real persisted fixture/detail changes.
- Free iframe match/league widgets and copyable code, automatic 30-second refresh. Duplicate embed views are noindex; attribution uses nofollow and is optional, consistent with Google's widget-link spam rules. These are useful distribution assets, not a promise of ranking-credit backlinks.
- 1200x630 OG fallback, large image previews, SportsEvent/BreadcrumbList/SportsTeam/ItemList markup. Missing real venues are omitted rather than fabricated; such pages are not eligible for Google's event rich result until a venue is available. Shape validation is not Google's hosted Rich Results Test.
- Protected /admin/seo uses the existing nm-api ADMIN_KEY, with no password in URLs/caches. D1 cursor/outbox and 30-day KV errors. An hourly JSON report is stored in R2 with daily KV history. New jobs use Cloudflare crons, never GitHub Actions.

### Validation so far

- API and web TypeScript checks pass; OpenNext production build and deployments pass.
- Worker data-quality tests: 4 passing. Validation script: web/scripts/verify-seo.mjs.
- Five representative live URLs return HTTP 200 with expected indexing and JSON-LD shapes:
  - https://ninetymins.com/match/fifa-friendly/401921325-colombia-vs-chile (pre-match)
  - https://ninetymins.com/match/fifa-friendly/401916338-singapore-vs-paraguay (result)
  - https://ninetymins.com/team/colombia-football-208
  - https://ninetymins.com/league/fifa-friendly
  - https://ninetymins.com/embed/match/fifa-friendly_401921325 (noindex duplicate view)
- Mobile Lighthouse on the Singapore/Paraguay result: performance 95/100; FCP/LCP 1.2s, TBT 240ms, CLS 0.034. Local artifact: web/work/lighthouse-match.report.html. Measurement predates the final context-block addition; final repeat pending.
- Ownership key file is HTTP 200 and correct. A real local IndexNow POST returned HTTP 200. Initial Worker submissions to api.indexnow.org returned 429; pending URLs remain queued. Primary endpoint moved to Bing with a global cooldown, capped batches, version-guarded acknowledgment and retry backoff. Production success still being checked.
- Initial seed: 131 real match pages; catalogue has subsequently grown to 135. Roster/F1 pages are created only as real source data is discovered; their initial counts and full-rotation checks remain pending.

### Pruning

The written audit is generator/data/seo_prune_ninetymins.json: 157 published articles reviewed, zero noindex actions. Saved GSC export covers 2026-08-07 through 2026-11-05. Its absent URLs do not prove zero impressions, so they were protected. The audit script requires explicit zero-impression evidence covering at least 90 days plus publication before the window; tables/source/data signals also protect a page. The noindex decision table and sitemap/metadata filtering are implemented. No article was deleted.

### Runtime, costs and remaining work

nm-api SEO cron: 1-59/2 * * * * (every two minutes on odd UTC minutes), separate from the pre-existing one-/two-minute live jobs. One competition scans per invocation; rich details rotate; rosters and F1 run every fifth invocation. New SEO paths make no paid API/LLM calls. Paid API spending is zero; no paid integration is enabled. Infrastructure usage remains subject to Cloudflare plan quotas; there is no promise of unlimited free operations. Existing non-SEO Workers AI behavior is unchanged.

Countly, distribution, broader monitoring, monthly data stories and the other three sites are next in the requested order. They are not represented as shipped by this checkpoint.

## Measurement plan

- Four weeks: compare GSC impressions/clicks, Bing clicks, sampled URL Inspection indexed share (not inferred from performance rows), crawl errors, source/API failures, valid page counts and widget usage. Establish baseline by site and page type.
- Eight weeks: compare matched 28-day periods, ranking/country and fixture/team cohorts, returning visitors, genuine referring domains, conversion/engagement, D1/Worker usage. Correct weak data coverage before extending templates.
- Twelve weeks: evaluate sustained real search visits against the 100,000/month network objective. Expand only page types with useful data and evidence of demand. No ranking or traffic guarantee.

Primary references: https://developers.google.com/search/docs/essentials/spam-policies ; https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap ; https://developers.google.com/search/docs/appearance/structured-data/event ; https://www.indexnow.org/documentation .

## Countly — deployed data foundation

The real Worker import completed with 648 pages (645 country/indicator pages and three rankings). Population, GDP per capita and real GDP growth pages require at least three observations and show up to six. Country/economy observations exclude World Bank regional/income aggregates. Rankings align every row to one common observation year. Comparison pages align a common year separately per metric. Source update dates and observation years are distinct; 2025 figures are not called 2026 estimates.

Five live samples (all HTTP 200, expected indexing, country/ranking Dataset JSON-LD and server-rendered tables/SVG charts validated):
- https://countly.net/data/population/india-ind
- https://countly.net/data/gdp-per-capita/united-states-usa
- https://countly.net/data/ranking/population
- https://countly.net/data/compare/china-chn-vs-india-ind
- https://countly.net/data/embed/population (noindex duplicate view)

The Countly pruning audit reviewed 363 published articles, applied zero noindex changes for the same evidence reasons as NinetyMins. Daily data refresh is 03:17 UTC; notification retries run hourly at :23. The initial World Bank GDP history call exceeded 15 seconds; increasing the bounded source timeout to 45 seconds allowed the production import to complete. Subsequent failures retain existing data and are logged. A later frontend deploy encountered a transient Cloudflare authentication error; the initial verified deployment remains live and the final retry is pending.

## Other sites: data readiness audit (before any expansion)

- VisaPoint: the requested generator/data/visa-check.json is absent. The actual web/src/data/visa-check.json is an October-verified directory of visa-status portals, not a passport-to-destination rules matrix. Existing passport-index data comes from a community GitHub dataset; it does not supply current official per-pair citations/last-check evidence. New passport-pair and work-visa salary pages are therefore skipped rather than inventing rules or reusing a portal list as visa-policy data. Existing pages/designs are preserved.
- GCCGuide: existing country reference data and portal links do not constitute a verified job-by-city salary/cost dataset. New salary pages and calculators are skipped pending such a source. No salary numbers are invented; existing design is preserved.
- InfKey: the current model reader depends on legacy Supabase and returns no data without that connection. There is no verified current model pricing/context/benchmark dataset to populate a new comparison system or informed picker. Those new page types are skipped. Generic article generation will be disabled locally and a D1 insert guard will pause new InfKey articles from older deployed generators; explicitly approved sourced articles can be allowed via a per-slug state record. Data pages in seo_pages are unaffected. This does not edit/push GitHub workflow code or disable other sites. Older remote jobs may still attempt generation and be rejected at publishing until their code is updated.

All three receive evidence-based pruning audits. Missing performance rows remain protected rather than being called zero-impression pages.
