# GCCGuide — "Gulf Expat Data Hub" — build report

Branch: `feat/gcc-hub` (worktree `M:\Code\AutoBlog-gcc`, based on `b447e0e`, the HEAD of `feat/seo-engine`).
Nothing was pushed and nothing was deployed. `web/src/lib/legalPages.tsx` was not touched, and the
uncommitted work that was sitting in the main worktree (the SEO-engine feature) was never staged,
modified or built — I worked in a separate git worktree for exactly that reason.

---

## 1. Verdict per phase

| Phase | State | What it is |
|---|---|---|
| 0 — Shared building blocks | **Done** | D1 schema, cron data Worker, UI kit, per-type sitemaps, single indexing gate |
| 1 — Daily rates (currency, gold, fuel) | **Done** | 169 rate pages, 14 gold pages, 6 fuel pages, all sourced and dated |
| 2 — Workers' money calculators | **Partly done, 2 countries STOPped** | Engine + 57 unit tests + 4/6 countries verified from official law; Qatar and Kuwait refused rather than guessed |
| 3 — Prayer times | **Done** | 385 cities, 121 indexed, full month + Ramadan 2027 tables |
| 4 — Government & embassy directory | **Done with gaps** | 76 missions (65 verified), 12 visa-fee items (8 with a figure), 12 holiday calendars |
| 5 — Affiliate travel & remittance | **STOPPED (as designed)** | Template + named config only; no prices invented |
| 6 — Home, navigation, distribution | **Done** | "Today in the Gulf", share card, RSS, sitemap index, prune analysis |

**Page totals: 769 built — 402 indexed, 367 deliberately noindex** (details in §8). The 402 is not an
estimate: it is the sum of the eight type sitemaps, which is also what the pages' own `robots` metadata
says.

---

## 2. What a visitor gets, and why it is not "scaled content"

Every page is a rendering of stored data with its own numbers, not a template with the nouns swapped:

* `/rates/aed-to-inr` prints today's rate, the 30-day range and average, the week/month/year change,
  a both-directions amount table and a matrix of the six Gulf currencies — all from the same stored
  snapshot. The FAQ answers are generated from those numbers, so two pairs never share a sentence.
* `/gold-rate/dubai` computes 24/22/21/18K per gram, per 8 g, per 10 g and per tola from the spot price,
  shows the same gold in the other five Gulf currencies, and says in plain words that shops add
  making charges. It never claims to be a shop price.
* `/prayer-times/uae/dubai` is computed for that city's coordinates — the month table, Qibla bearing and
  Ramadan 2027 suhoor/iftar times differ city by city because the inputs differ.
* `/embassy/india-embassy-in-uae` carries the mission's address, phone and hours **plus the official page
  it was read from and the date it was read**.

And each page has a source line and an "updated" timestamp; where a fact could not be verified the field
is blank and the page says so.

---

## 3. Phase 0 — shared building blocks

### D1 schema (`workers/gcc-data/migrations/0001_gcc_hub.sql`)

| Table | Purpose |
|---|---|
| `gcc_fx_rate` | current mid-market rate, units per 1 USD, one row per currency |
| `gcc_fx_daily` | one row per currency per day — the 30-day and 1-year chart history |
| `gcc_gold_spot` | latest good spot price (single row, `id = 1`) |
| `gcc_gold_daily` | daily spot value for the gold chart |
| `gcc_fuel` | official monthly prices by country/grade/month (optional override of the JSON) |
| `gcc_job_log` | one row per cron run: ok/error/skipped, message, rows, duration |
| `gcc_page_flag` | reviewer override: force one URL in or out of the index without a deploy |

All statements are idempotent. Apply with:

```powershell
cd web
npx wrangler d1 execute autoblog-content --remote --file=../workers/gcc-data/migrations/0001_gcc_hub.sql
```

### Scheduled job (`workers/gcc-data/`, Worker `gcc-data`)

Cron (UTC), in `workers/gcc-data/wrangler.jsonc`:

| Cron | Job |
|---|---|
| `0 2,10,18 * * *` | currency (3× a day, as specified) |
| `15 * * * *` | gold spot (hourly) |
| `30 0 * * *` | daily history snapshot + IndexNow ping of the changed URLs |

Properties that matter:

* **Idempotent** — every write is `INSERT … ON CONFLICT DO UPDATE` or `INSERT OR REPLACE`.
* **Keeps the last good value.** A failed fetch writes nothing and logs `error`; a *plausibility* failure
  (AED suddenly at 4.20, gold at 90 USD/oz) is treated the same way, because a wrong number is worse than
  a stale one. Five of the six Gulf currencies are hard USD pegs, so a >0.5% drift from the peg is a feed
  bug by definition and is rejected.
* **Never breaks the site** — the web app reads D1 with `cachedRead` (15 min fresh, stale-on-error) and
  falls back to a dated seed snapshot if D1 is empty.
* **Logs** to `gcc_job_log`, so a silent death becomes a visible row.

It has no public route. Run it locally with `--test-scheduled` or `curl "http://127.0.0.1:8788/?job=fx"`.

### UI kit (`web/src/sites/gccguide/hub/`)

`ui.tsx` + `hub.css`, all server components, no chart library and no client JS:

`BigStat` · `StatRow` · `TrendChart` (inline SVG, `vector-effect: non-scaling-stroke`, with a
`<details>` table of the plotted values) · `AmountTable` · `DataTable` · `Faq` · `SourceLine` ·
`Related` · `Callout` · `NoData` · `Crumbs` · `PageHead` · `SectionHead` · `HubPage`.

### Indexing gate (`hub/gate.ts` + `hub/config.ts`)

One function per page type decides indexability; **the page's `robots` metadata and its sitemap entry
both call it**, so they cannot drift. The knobs live in `INDEX` in `hub/config.ts`:

```ts
rates: true, gold: true, fuel: true, calculators: true, calculatorExamples: true,
prayer: true, prayerMinPopulation: 50_000, embassy: true, visaFees: true, holidays: true,
flights: false, remittance: false
```

Raising `prayerMinPopulation`/flipping a flag and rebuilding widens the indexed set. A single URL can be
forced in or out at runtime with `gcc_page_flag`.

### Sitemaps

`/sitemap-index.xml` lists `/sitemap.xml` (articles) plus one sitemap per page type:
`-rates`, `-gold`, `-fuel`, `-calculators`, `-prayer`, `-embassy`, `-holidays`. Only indexed URLs are
listed, `lastmod` is the **data** timestamp (not the deploy date), and `robots.txt` points gccguide at
the index. IndexNow is re-used (`api.indexnow.org`, key file already published at
`/7cb730425493bd6250188aee25110d83.txt`) and pinged daily with the rates/gold URLs.

---

## 4. Phase 1 — daily rates, gold, fuel

**Currency.** Source `open.er-api.com/v6` (free, no key, USD base, 166 currencies), fallback
`@fawazahmed0/currency-api` (CC0) — both keyless. ECB/Frankfurter was rejected as specified: no Gulf
currencies. Historical series for the charts come from the CC0 currency-api's date-pinned daily
snapshots (`workers/gcc-data/scripts/backfill-history.mjs` emits the SQL; see §12).

`/rates/<gulf>-to-<quote>` — 6 Gulf × 14 quote currencies (INR, PKR, BDT, PHP, NPR, LKR, EGP, IDR, KES,
NGN, ETB, USD, EUR, GBP). Current rate, 30-day chart, 1-year chart, amount table both ways, 30-day
range and average, week/month/year change sentences, peg explanation, FAQ, related links.

The 84 reverse pairs (`/rates/inr-to-aed`) are built and reachable but **noindex with
`rel=canonical` to the forward page**, exactly as specified; the forward page's inverse table also
answers the reverse query, so the canonical target genuinely serves it.

**Gold.** Source `api.gold-api.com/price/XAU` — free, keyless, live spot USD/oz. `/gold-rate/<city>` for
Dubai, Abu Dhabi, Sharjah, Al Ain, Riyadh, Jeddah, Dammam, Mecca, Medina, Doha, Kuwait City, Muscat,
Salalah, Manama: 24/22/21/18K per gram, 8 g, 10 g and tola; the same gold in the other five Gulf
currencies; 30-day chart; making-charge warning.

**Fuel.** `/fuel-price/<country>` from the official monthly announcements, transcribed into
`hub/data/fuel.json` (one row per grade, each with `source_url`, `source_type`, `effective_from`,
`checked`) — 21 rows covering all six countries for November 2026, plus a USD-per-litre cross-country
comparison (the only honest way to compare six currencies).

Sample URLs: `/rates/aed-to-inr`, `/rates/kwd-to-inr`, `/rates/sar-to-pkr`, `/gold-rate/dubai`,
`/gold-rate/riyadh`, `/fuel-price/uae`, `/fuel-price/kuwait`.

---

## 5. Phase 2 — workers' money calculators

**Status: engine complete and tested; 4 of 6 countries verified; Qatar and Kuwait STOPPED.**

The formula is data (`hub/data/labour-rules.json`), the arithmetic is code (`hub/gratuity.ts`,
`hub/leave.ts`) and 57 unit tests pin the arithmetic. Each country record carries the article number
and the official page it was read from.

| Country | Gratuity | Overtime | Annual leave | Notice | Source that was read |
|---|---|---|---|---|---|
| UAE | Art. 51: basic wage, 1-yr min, 21 d/yr → 30 d/yr after 5, cap 24 months, resignation = full | 25% (50% 10pm–4am), ÷240 | 30 days | Art. 43: 30 days | u.ae (4 pages) |
| Saudi Arabia | Arts. 84+85: **last wage**, 15 d/yr → 30 d/yr, resignation 0 / ⅓ / ⅔ / 1 | 50%, ÷240 | 21 → 30 after 5 yrs | Arts. 75+76: 30 d worker / 60 d employer | hrsd.gov.sa labour-law PDF |
| Oman | Art. 61: basic, 30 d/yr flat, no cap | 25% day / 50% night, ÷240 | 30 days | Art. 38: 30 d | mol.gov.om |
| Bahrain | Art. 116 + Art. 47: basic + social allowance, 15 d/yr → 30 d/yr after 3 | 25% / 50% | 30 days | Art. 99: 30 d | lloc.gov.bh |
| Qatar | **not verified** | — | — | — | mol.gov.qa & adlsa.gov.qa refused connections, hukoomi in maintenance, almeezan.qa is a JS shell (HTTP 406) |
| Kuwait | **not verified** | — | — | — | official PDF embeds an unmapped legacy font (text is glyph soup); manpower/e.gov.kw unreachable or 403 |

Pages: `/calculators`, `/gratuity/<country>` (GET form that works with JavaScript off), the three
sibling calculators `/overtime/<country>`, `/annual-leave/<country>`, `/notice-period/<country>`, and
pre-computed example pages `/gratuity/<country>/basic-<wage>-<cur>-<years>` — the sitemap lists
4 wages × 4 service lengths × 6 countries = 96 combinations, and only those, so the index gets a small
high-intent set first.

**STOP, per the brief:** Qatar and Kuwait publish no number at all. The pages say the formula could not
be verified, link the ministry, and are `noindex` (their gratuity/notice/overtime/leave pages are 8 of
the 367 noindex pages). That is deliberate: a gratuity figure is a financial decision.

**Two law caveats the reviewer should see** (both are printed on the pages):
1. **Bahrain Art. 116 applies only to workers not covered by the Social Insurance Law.** Bahrain has been
   moving expatriates onto monthly SIO end-of-service contributions, so for many workers the SIO — not an
   employer lump sum — is the benefit. The page warns about this.
2. **Oman Art. 61 is expressly interim** ("until the savings system under the Social Protection Law
   starts") and Art. 48 allows an employer savings programme to replace gratuity. The rate is worded as
   "not less than" one month per year, so the figure is a floor, not a fixed amount.

---

## 6. Phase 3 — prayer times

* Cities: **GeoNames** (CC BY 4.0), feature class P, population ≥ 1,000 → **385 places** across the six
  states (uae 107, saudi-arabia 157, qatar 41, kuwait 27, oman 41, bahrain 12). Attribution is printed on
  every prayer page.
* Computation: **`adhan` 4.4.6 (MIT)** — no prayer API, no key, works offline.
* Method: Umm al-Qura for Saudi Arabia, Dubai for the UAE, Qatar's and Kuwait's own presets where the
  library has them; for Oman and Bahrain the library has no dedicated method, so the page says it uses
  the Muslim World League convention and tells the reader to compare with the local mosque. A method
  switcher (`?method=`) is on every city page.
* Page: today's six times with the next prayer highlighted, full month table, sunrise/sunset, Qibla
  bearing, last third of the night, Hijri date (Umm al-Qura calendar via ICU, tabular fallback), and a
  **Ramadan 2027** suhoor/iftar table marked "expected" (30 days from the projected 8 Feb 2027 start).
* Index gate: cities ≥ 50,000 population → **121 indexed**, 264 reachable but noindex.

Sample URLs: `/prayer-times`, `/prayer-times/uae`, `/prayer-times/uae/dubai`,
`/prayer-times/saudi-arabia/makkah`.

---

## 7. Phase 4 — government & embassy directory

* **76 missions across 11 sending countries; 65 verified.** Each record has the mission's address, phone,
  email, hours, website, a Maps link, the `source_url` it was read from and a `checked` date.
  Sending countries: India (7), Pakistan (5), Bangladesh (8), Philippines (0 — see below), Egypt (8),
  Sri Lanka (8), Nepal (1), Indonesia (8), UK (8), China (5), Turkey (7).
* **11 records are explicitly `verified: false`** with empty fields: the Philippines missions (8) — every
  `dfa.gov.ph` page returns Cloudflare 403 to this machine — plus Pakistan (2) and India Jeddah (1) whose
  official contact blocks are script-gated. They are pages, they are noindex, and they show "not verified"
  rather than an address from a directory.
* **Visa/residence fees: 12 items, 8 with a verified figure** (UAE ICP residence + Emirates ID, Qatar RP
  renewal + QID, Kuwait civil ID, Oman residence card, Bahrain work permit + CPR). Four items are `null`
  with the reason stated: Saudi iqama and exit/re-entry (my.gov.sa returns 403; Absher publishes no
  amount), Kuwait iqama (the MOI page is a payment form with no tariff), UAE visa-status check (free by
  design).
* **Public holidays: 12 calendars** (6 countries × 2026 and 2027). Fixed national days and the
  moon-dependent feasts are separated — the latter are flagged `expected`, with the Ramadan working-hours
  note on each page.

Sample URLs: `/embassy`, `/embassy/india-embassy-in-uae`, `/embassy/egypt-consulate-in-uae-dubai`,
`/visa-fees/uae`, `/public-holidays/uae-2027`.

---

## 8. Page inventory

Counts are what the code builds. "Indexed" = goes in the sitemap and has `robots: index`.

| Page type | Total | Indexed | Noindex |
|---|---:|---:|---:|
| `/rates` hub | 1 | 1 | 0 |
| `/rates/<gulf>-to-<quote>` (forward) | 84 | 84 | 0 |
| `/rates/<quote>-to-<gulf>` (reverse, canonical → forward) | 84 | 0 | 84 |
| `/gold-rate` hub + 14 cities | 15 | 15 | 0 |
| `/fuel-price` hub + 6 countries | 7 | 7 | 0 |
| `/calculators` hub | 1 | 1 | 0 |
| `/gratuity/<country>` | 6 | 4 | 2 |
| `/gratuity/<country>/<example>` (sitemap set) | 64 | 64 | 0 |
| `/overtime`, `/annual-leave`, `/notice-period` × 6 | 18 | 12 | 6 |
| `/prayer-times` hub | 1 | 1 | 0 |
| `/prayer-times/<country>` | 6 | 6 | 0 |
| `/prayer-times/<country>/<city>` | 385 | 121 | 264 |
| `/embassy` hub | 1 | 1 | 0 |
| `/embassy/<slug>` | 76 | 65 | 11 |
| `/visa-fees` hub + 6 countries | 7 | 7 | 0 |
| `/public-holidays` hub + 12 calendars | 13 | 13 | 0 |
| **Total** | **769** | **402** | **367** |

Sitemap reconciliation (measured on the built Worker, not estimated):

```
sitemap-rates.xml        85     sitemap-prayer.xml     128
sitemap-gold.xml         15     sitemap-embassy.xml     66
sitemap-fuel.xml          7     sitemap-visa.xml         7
sitemap-calculators.xml  81     sitemap-holidays.xml    13
                                             total     402
```

`/sitemap-index.xml` lists those eight plus `/sitemap.xml` (the existing article sitemap) = 9 children.

Notes: the `/gratuity/<country>/<example>` family is generated on demand for any valid
`basic-<wage>-<cur>-<years>` slug, so 64 is the sitemap set (4 wages × 4 service lengths × the 4 verified
countries), not a limit. Reverse rate pairs and the two unverified countries' calculator pages are the
only families that are noindex by design rather than by data.

---

## 9. Verification

### TypeScript

```
cd web && npx tsc --noEmit
→ (no output)  exit 0
```

### Unit tests — 62 passing

```
cd web && node --test src/sites/gccguide/hub/series.test.ts
→ tests 18 / pass 18 / fail 0

cd web && node --test src/sites/gccguide/hub/gratuity.test.ts
→ tests 24 / pass 24 / fail 0   (tier boundaries, fractional years, 1-year gate, 24-month cap,
                                 resignation vs termination, Saudi 0/⅓/⅔/1 scale, slug round-trip)

cd web && node --test src/sites/gccguide/hub/leave.test.ts
→ tests 15 / pass 15 / fail 0   (hourly divisor 240/208/0, +25%/+50%, leave tiers, daily wage, clamping)

cd web && node --test src/sites/gccguide/hub/rules.test.ts
→ tests 5 / pass 5 / fail 0     (the six country slugs match the site's, confirmed records carry an
                                 article + https source + usable numbers, unconfirmed records assert none)
```

The tests write their own rule fixtures, so they pin the arithmetic independently of the verified law
file. Two of my own expectations were wrong when I first ran them (a "30-day change" baseline cannot be
29 days old) and the tests caught it — the function was right, the test was fixed.

`rules.test.ts` exists because of a real bug found during verification: the labour file keyed Saudi Arabia
as `"saudi"` while the site's slug is `"saudi-arabia"`, so that country silently fell back to "not
verified" and dropped out of the sitemap. The data was corrected and the test now fails loudly on any such
mismatch.

### Data job, run locally against a real D1

```
curl "http://127.0.0.1:8788/?job=fx"
→ {"job":"fx","results":[{"job":"fx","rows":20,"status":"ok",
   "message":"stored 20 rates from open.er-api.com @ 2026-11-13T00:02:31Z"}]}

curl "http://127.0.0.1:8788/?job=gold"
→ {"job":"gold","results":[{"job":"gold","rows":1,"status":"ok",
   "message":"XAU 3887.60 USD/oz @ 2026-11-13T23:36:56Z (gold-api.com)"}]}
```

Sample rows read back from D1:

```
SELECT currency, rate, source, asof FROM gcc_fx_rate
AED 3.6725 · SAR 3.75 · QAR 3.64 · OMR 0.384497 · BHD 0.376 · KWD 0.31098
INR 94.086126 · PKR 276.622899 · BDT 124.773951 · PHP 63.786172 · NPR 150.536611 · LKR 332.42858
EGP 53.448759 · IDR 18250.530965 · KES 130.03512 · NGN 1350.459083 · ETB 161.454253 · EUR 0.903491
GBP 0.755149 · USD 1                      (source open.er-api.com, asof 2026-11-13T00:02:31Z)

SELECT usd_per_oz, asof FROM gcc_gold_spot
3887.600098 · 2026-11-13T23:36:56Z        (gold-api.com)

SELECT job,status,rows_affected,message FROM gcc_job_log ORDER BY id DESC LIMIT 3
gold   ok   1   XAU 3887.60 USD/oz @ 2026-11-13T23:36:56Z (gold-api.com)
fx     ok  20  stored 20 rates from open.er-api.com @ 2026-11-13T00:02:31Z
```

### Build (as `deploy-site.ps1` does it, without uploading)

```
cd web
$env:SITE_ID="gccguide"
npx opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion
npx wrangler deploy --dry-run
```

```
✓ Compiled successfully in 30.6s
   Linting and checking validity of types ...
Route (app)                                     Size  First Load JS
├ ƒ /share/rates.png                           188 B         103 kB
├ ƒ /sitemap-calculators.xml                   188 B         103 kB
├ ƒ /sitemap-embassy.xml                       188 B         103 kB
├ ƒ /sitemap-fuel.xml                          188 B         103 kB
├ ƒ /sitemap-gold.xml                          188 B         103 kB
├ ƒ /sitemap-holidays.xml                      188 B         103 kB
├ ƒ /sitemap-index.xml                         188 B         103 kB
├ ƒ /sitemap-prayer.xml                        188 B         103 kB
├ ƒ /sitemap-rates.xml                         188 B         103 kB
├ ƒ /sitemap-visa.xml                          188 B         103 kB
+ First Load JS shared by all                 103 kB
[OpenNext] Worker saved in `.open-next\worker.js` 🚀
[OpenNext] OpenNext build complete.        exit 0

npx wrangler deploy --dry-run
✨ Read 325 files from the assets directory .open-next/assets
Total Upload: 10936.48 KiB / gzip: 2384.53 KiB
env.DB (autoblog-content)   D1 Database
env.ASSETS                  Assets
env.CF_VERSION_METADATA     Worker Version Metadata
env.SITE_ID ("gccguide")    Environment Variable
--dry-run: exiting now.
```

No upload happened. First Load JS stays at the shared 103 kB — the hub adds no client JavaScript; the
only script on any hub page is the ~300-byte inline "remember my city" snippet on the home page.

### Sample pages rendered from the built Worker (real D1, `wrangler dev --local`)

| URL | HTTP | `<title>` | `robots` | `canonical` |
|---|---|---|---|---|
| `/` | 200 | GCCGuide — Qatar, UAE, Saudi, Kuwait, Oman & Bahrain Guide… | index, follow | https://gccguide.com |
| `/rates/aed-to-inr` | 200 | AED to INR today: 1 AED = 25.6191 INR (13 Nov 2026) | index, follow, max-image-preview:large | https://gccguide.com/rates/aed-to-inr |
| `/gold-rate/dubai` | 200 | Gold rate in Dubai today — 24K AED 459.02/g, 22K AED 420.47/g (13 Nov 2026) | index, follow, max-image-preview:large | https://gccguide.com/gold-rate/dubai |
| `/fuel-price/uae` | 200 | Petrol price in UAE — November 2026: 95-octane AED 4.040/litre | index, follow, max-image-preview:large | https://gccguide.com/fuel-price/uae |
| `/gratuity/saudi-arabia` | 200 | Gratuity calculator Saudi Arabia 2026 — end-of-service pay (SAR) | index, follow, max-image-preview:large | https://gccguide.com/gratuity/saudi-arabia |
| `/gratuity/qatar` | 200 | Gratuity calculator Qatar 2026 — end-of-service pay (QAR) | **noindex, follow** | https://gccguide.com/gratuity/qatar |
| `/prayer-times/uae/dubai` | 200 | Prayer times in Dubai today — Fajr 05:15, Maghrib 17:34 (UAE) | index, follow, max-image-preview:large | https://gccguide.com/prayer-times/uae/dubai |
| `/embassy/india-embassy-in-uae` | 200 | Embassy of India, Abu Dhabi — address, phone and opening hours | index, follow | https://gccguide.com/embassy/india-embassy-in-uae |
| `/grattry/uae` (typo) | 404 | — | — | — |

JSON-LD on `/rates/aed-to-inr` — one array, three nodes, all mirroring the visible page:

```json
[{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
   {"@type":"ListItem","position":1,"name":"GCCGuide","item":"https://gccguide.com"},
   {"@type":"ListItem","position":2,"name":"Exchange rates","item":"https://gccguide.com/rates"},
   {"@type":"ListItem","position":3,"name":"AED to INR","item":"https://gccguide.com/rates/aed-to-inr"}]},
 {"@context":"https://schema.org","@type":"ExchangeRateSpecification","name":"AED/INR exchange rate",
  "url":"https://gccguide.com/rates/aed-to-inr","dateModified":"2026-11-13T23:37:22Z",
  "currentExchangeRate":{"@type":"UnitPriceSpecification","price":25.619095,"priceCurrency":"INR","unitText":"1 AED"},
  "description":"1 AED = 25.6191 INR on 13 Nov 2026."},
 {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[ … 5 questions … ]}]
```

The FAQ node is generated from the same array the page renders, so the markup cannot drift from the
visible text. No aggregate ratings, no prices we do not show, no Event markup for prayer times (a daily
prayer is not a calendar event, so that markup is deliberately absent).

Rendering the pages against real D1 for the first time also surfaced a local-only problem worth recording:
`/` returned 500 until the local database had an `articles` table, because the home page reads the article
list. That is test data, not a code defect — but it does mean **a fresh environment must have the
`articles` table before the home page will render**. Production already has it.

---

## 10. Data sources, licences and limits

| Data | Source | Licence / key | Limits and caveats |
|---|---|---|---|
| Currency (current) | `open.er-api.com/v6` (exchangerate-api) | free, **no key** | provider refreshes **once a day**; we poll 3×/day so a new value appears on the provider's schedule, not ours. 166 currencies. |
| Currency (history + fallback) | `@fawazahmed0/currency-api` via jsDelivr | **CC0**, no key | one snapshot per day, pinned by date, which is what makes the 1-year backfill possible without a key |
| Gold spot | `api.gold-api.com/price/XAU` | free, **no key** | one call/hour; no published hard quota; the job rejects implausible values |
| Cities / populations | GeoNames dump | **CC BY 4.0** — attributed on every prayer page | populated places ≥ 1,000; 385 rows |
| Prayer calculation | `adhan` 4.4.6 | **MIT** | library, not a service — no quota, no network at request time |
| Fuel prices | national announcements (ADNOC, QAFCO/QatarEnergy, KNPC, OOMCO, Bahrain committee) | facts, transcribed with source URLs | **manual monthly update** — see §12 |
| Embassy/consulate | mission sites + foreign ministries (gov.uk, mea.gov.in, mofa.gov.pk, mfa.gov.bd, mfa.gov.eg, mfa.gov.lk, kemlu.go.id, mofaic.gov.cn, mfa.gov.tr, mfa.gov.np) | facts, each with `source_url` | no scraping of directories; 11 missions unverified rather than guessed |
| Visa fees | ICP, u.ae, Absher, MOI Qatar, PACI, ROP Oman, bahrain.bh | facts, each with `source_url` | 4 items null rather than borrowed from agencies |
| Holidays | cabinet circulars / official calendars (u.ae, SAMA, almeezan, e.gov.kw, shuoon.om, mtt.gov.bh) | facts | lunar dates marked `expected` |
| Labour law | u.ae, hrsd.gov.sa, mol.gov.om, lloc.gov.bh | facts, article-cited | Qatar/Kuwait blocked (§5) |
| IndexNow | `api.indexnow.org` | public key file, not a secret | Google ignores it; sitemaps are the Google path |

Nothing in the repository contains a secret. The only credential-like value is the IndexNow key, which
is a public verification file by design.

---

## 11. What the reviewer must decide or do

### Needs an account / key (nothing is faked meanwhile)

| Item | Placeholder | Where |
|---|---|---|
| Flight prices | `TRAVELPAYOUTS_MARKER` (+ token) | `hub/affiliate.ts` |
| Remittance comparison (Wise) | `WISE_AFFILIATE_ID` | `hub/affiliate.ts` |
| Remittance comparison (Remitly) | `REMITLY_AFFILIATE_ID` | `hub/affiliate.ts` |

`AffiliatePanel.tsx` is the ready template. It renders a "not live yet" state listing the missing
variable and **throws** if asked for prices without a partner, so a fabricated price cannot ship. No
`/flights` or `/remittance` route is mounted — that is the Phase 5 STOP.

### Manual updates (no deploy needed for fuel; a rebuild for the rest)

1. **Monthly: fuel prices.** Copy the new month into `hub/data/fuel.json`, bump `month`, add one row per
   grade with `source_url`, `source_type`, `effective_from`, `checked`, then rebuild. The alternative
   path is the `gcc_fuel` D1 table (the site prefers D1 rows for the current month if present).
2. **Qatar and Kuwait calculators** — unblock by reading `mol.gov.qa` / `almeezan.qa` / `moj.gov.kw`
   from a normal browser and filling the four records; the engine needs no code change.
3. **Historical charts at launch** — run the backfill once against the remote D1:
   `node workers/gcc-data/scripts/backfill-history.mjs` then
   `cd web && npx wrangler d1 execute autoblog-content --remote --file=../workers/gcc-data/out/backfill-fx.sql`.
   Until then the charts self-hide and the pages say "tracking began on <date>" — they never draw a line
   they do not have.
4. **Embassy refresh** — the directory is a snapshot; each record carries `checked`. A quarterly pass is
   sensible.

### Indexing decisions (all one-line changes)

* `prayerMinPopulation: 50_000` → 121 indexed of 385. Lower it to index more towns, raise it to be
  stricter. The 264 small-town pages are live and correct, just not submitted.
* Gold: all 14 cities indexed, as the brief asked. **This is the one near-duplicate risk in the build**,
  because the four UAE cities quote identical numbers. If the reviewer prefers caution, change
  `isGoldIndexed()` in `hub/gold.ts` to `INDEX.gold && city.primary` (one city per country) and the other
  eight fall out of the sitemap. I left it wide because that is what the brief specified, and because
  each page does carry city-specific framing (currency, tola price, cross-currency table).
* Reverse rate pairs are canonicalised to the forward page, as specified. Note the trade-off: Google will
  consolidate `/rates/inr-to-aed` into `/rates/aed-to-inr`, so the reverse pages will not rank on their
  own. The forward page therefore carries an inverse amount table, so the query is still answered.

### Phase 6 prune list — **empty, and why**

The brief says to remove/noindex gccguide articles with 0 impressions over 90 days, "write the list in
the report first, then apply".

* `generator/data/gsc_gccguide.json` (window 2026-08-07 → 2026-11-05, 156 URLs, 6,486 impressions):
  **every page in the file has at least one impression. The list is empty, so nothing was removed or
  noindexed.**
* Caveat the reviewer must know: a Search Console pages export only contains URLs that had impressions.
  A page with genuinely zero impressions would not appear in the file at all, so this dataset cannot
  prove a page has zero impressions — only the inverse. A true zero-impression inventory needs the full
  GSC URL list.
* For the reviewer's judgement, 72 of the 156 pages have 1–4 impressions over the window (≈0.01% of the
  site's impressions each). They are candidates for consolidation, not for deletion without a full GSC
  inventory. Nothing was applied.

---

## 12. Deploy (after review — I did not deploy or push)

```powershell
# 0. from the repo root, on the branch
git checkout feat/gcc-hub

# 1. schema (once)
cd web
npx wrangler d1 execute autoblog-content --remote --file=../workers/gcc-data/migrations/0001_gcc_hub.sql

# 2. seed the history charts (once, optional but recommended)
cd ..
node workers/gcc-data/scripts/backfill-history.mjs
cd web
npx wrangler d1 execute autoblog-content --remote --file=../workers/gcc-data/out/backfill-fx.sql

# 3. the cron Worker (its own Worker, same D1 binding)
npx wrangler deploy -c ../workers/gcc-data/wrangler.jsonc

# 4. the site
powershell -ExecutionPolicy Bypass -File .\deploy-site.ps1 gccguide
```

`deploy-site.ps1` regenerates the gitignored `web/wrangler.jsonc` (Worker `autoblog-gccguide`, D1 binding
`DB`, `SITE_ID=gccguide`, domains `gccguide.com` + `www.gccguide.com`), builds with
`opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion`, and deploys. Dry run:
`.\deploy-site.ps1 gccguide -DryRun`.

After the first cron run, check `gcc_job_log` — a successful row for `fx` and `gold` is the proof the
pipeline is live:

```powershell
npx wrangler d1 execute autoblog-content --remote --command "SELECT job,status,message FROM gcc_job_log ORDER BY id DESC LIMIT 5"
```

---

## 13. Known gaps and risks (honest list)

1. **Qatar and Kuwait calculators are STOPped** (§5). The other four are live and cited.
2. **Bahrain and Oman gratuity have legal caveats** that change who is entitled (§5). Printed on the pages,
   but a reader skimming the number will miss them — consider a stronger banner.
3. **The 1-year charts are empty until the backfill script runs** on the remote D1. Locally they render.
4. **Fuel prices are manual**, by design (the brief allowed this). If the reviewer misses a month, the page
   keeps last month's date on it — it never claims to be current, but it will be stale.
5. **Gold city pages are near-duplicates within a country** (§11). One-line fix available.
6. **Embassy coverage is uneven by country** — 11 sending countries, dominated by South Asia; the US,
   Philippines, Kenya, Nigeria, Ethiopia and Jordan are missing because their official pages would not
   serve this machine. This is the largest remaining data gap.
7. **`adhan` adds ~40 KB to the server bundle**; it does not ship to the browser.
8. **Edge cache**: pages are `force-dynamic` and the existing `cache-worker.js` caches HTML 30 min, so a
   rate can be up to ~30 min older than D1. The source line prints the stored timestamp, not "now".
9. **`next/og` share card** works locally (171 KB PNG). It has not been exercised on the Workers runtime
   in this session — verify `/share/rates.png` on the deployed Worker before promoting it in social posts.
10. **The calculators do not cover free-zone law** (DIFC/ADGM/QFC) or domestic workers, which differ. The
    pages say so; they are not legal advice.

---

## 14. Commit log (branch `feat/gcc-hub`)

| Commit | Phase |
|---|---|
| `7f6555e` | gccguide hub: D1 schema, cron data worker, UI kit, split sitemaps (phase 0) |
| `414ab65` | gccguide hub: daily rates, gold and fuel pages (phase 1) |
| `73e3dc8` | gccguide hub: gratuity calculator + calculators hub (phase 2, part 1) |
| `46e75fc` | gccguide hub: prayer times for 385 Gulf cities (phase 3) |
| `1d469ce` | gccguide hub: embassy directory, visa fees and public holidays (phase 4) |
| `ea4f859` | gccguide hub: home strip, share card, RSS, sitemap index (phase 6, part 1) |
| `c5bb882` | gccguide hub: verified labour-law rules + overtime, leave and notice calculators (phase 2, part 2) |
| *final* | sitemap-visa + Saudi slug fix + rules test + this report |

Nothing was pushed. Nothing was deployed. `feat/gcc-hub` is a separate worktree branch based on
`b447e0e`; the other in-progress work in the repository was never staged, modified or built.
