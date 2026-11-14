# probashiinfo.com — overlap map for the data pages

Rule: **one search query = one URL.** Built 2026-11-14 from all 381 posts + 7 pages (WP REST) and 90 days of
Search Console queries (`generator/data/gsc_probashiinfo.json`, 581 URLs). Script: `probashi-data/overlap.py`
→ `probashi-data/overlap.json`. Rank Math focus keywords are not exposed by the REST API; titles + GSC queries
were used instead (GSC is the better signal: it shows what each URL actually ranks for).

Existing posts are never changed by this work (URLs, titles, content untouched).

## 1. Visa check — `/visa-check/<country>/`

| Country | Existing coverage | Decision |
|---|---|---|
| Saudi Arabia | 13 posts (!) — winner `/se-di-bhisaa-cek-2026-paaspeaartt-diye-shj-niym/` (605 impr/90d) | **No new page.** Hub links to winner. |
| UAE / Dubai | 2 posts — winner `/dubaai-bhisaa-cek-2026-paaspeaartt-nmbr-diye-shj-niym/` | **No new page.** |
| Kuwait | 4 posts — winner `/kuyet-bhisaa-cek-2026-paaspeaartt-naambaare-shj-yaacaai-niym/` (3,085 impr) | **No new page.** |
| Qatar | 5 posts — winner `/kaataar-bhisaa-cek-2026-paaspeaartt-naambaar-diye-anlaaine-shj-gaaidd/` | **No new page.** |
| Malaysia | 8 posts — winner `/maalyeshiyaa-bhisaa-cek-2026-paaspeaartt-naambaar-diye-shj-upaay/` (1,017 impr) | **No new page.** |
| North Macedonia | guide post (1 impr for "ভিসা চেক") — intent is "how to go", not status check | New page (status-check intent) |
| Australia | general multi-country post, 1 impr | New page |
| 29 others (Oman, Bahrain, Singapore, Korea, Japan, Turkey, Romania, Serbia, Moldova, VFS/Schengen, UK, USA, Canada, Croatia, Poland, Hungary, Czechia, Lithuania, Portugal, Italy, Albania, Germany, Ireland, New Zealand, India, Thailand, Vietnam, Sri Lanka, Indonesia) | none | New page, indexable |
| Hub `/visa-check/` | general posts "পাসপোর্ট নাম্বার দিয়ে ভিসা চেক ২০২৬" (5083, 4998, 3037, 2984) own the generic query | Hub is **noindex,follow** (navigation only) |

Note for the owner (not done here, content change): Saudi has 13 near-duplicate visa-check posts and Malaysia 8;
they compete with each other. Merging them into the winners (301) would likely help — `probashi-merge.yml` exists.

The drip writer is told to avoid these titles (`generator/data/probashi_datapages.json`), so it stops writing
new "<country> ভিসা চেক" posts that would compete with the data pages.

## 2. Customs & baggage — `/customs/...`, `/baggage/<airline>/`
No post targets কাস্টমস / ব্যাগেজ / লাগেজ / স্বর্ণ / মোবাইল শুল্ক (0 titles, 0 GSC queries). Free to build.

## 3. GAMCA medical — `/gamca/<city>/`
No GAMCA post. `/mediglass-visa-check-2026/` (Wafid medical *status* check) and the Malaysia visa-check post
(query "মালয়েশিয়া মেডিকেল চেক") are status-check intents. GAMCA pages = **centre list by city** (different
intent); they cross-link to the Mediglass post for "medical result check".

## 4. Agencies + government migration cost
- Agency licence pages `/agency/<licence>/`: no post targets agency licence lookup. Free.
- **Migration cost: heavy overlap.** "<country> যেতে কত টাকা লাগে" is owned by existing posts for 32 countries
  (Malaysia 30k impr, Kuwait, Qatar, Oman, Romania, Dubai, Greece…). Decision: **no per-country cost pages.**
  One hub `/migration-cost/` ("সরকার নির্ধারিত অভিবাসন ব্যয়" — the official BMET table), each row linking to
  the existing country post that ranks for "যেতে কত টাকা লাগে".

## 5. Remittance + rates
- Existing: page `/taka-rate/` (live rate list), daily "টাকার রেট" posts (34), remittance-method posts
  (channels, fees, "পাঠানোর উপায়"). GSC shows no URL ranking for "১ রিয়াল কত টাকা"-type converter queries.
- Decision: `/remittance/<currency>/` = **converter + 2.5% incentive calculator** ("১০০০ রিয়াল কত টাকা,
  প্রণোদনাসহ"). Not "today's rate list" (owned by `/taka-rate/`) and not "how to send" (owned by posts).
  Each page links to `/taka-rate/` and to the remittance-channel post.
- Bank routing numbers: **not built here** — link to `coloursofbangladesh.com/routing/...` (COB session; blocked
  on an official source as of 2026-11-14).

## 6. Visa requirements for Bangladeshi passport — `/visa/<country>/`
Existing posts own "<country> ভিসা আবেদন / ভিজিট ভিসা / কি কি লাগে" for: India (`ইন্ডিয়ান ভিসা করতে কি কি লাগে`),
Canada (visit visa), Germany (ভিসা আবেদন ×2), Italy (ভিসা আবেদন লিংক), Cyprus, North Macedonia, Belarus,
Armenia, Estonia, Serbia, Malaysia, Saudi, Kuwait, Maldives, Romania, Lithuania, Portugal, Poland, Greece, US,
Australia (agri visa). Decision per country (applied when phase 6 is built from `overlap.json` "visa-req"):
- Post title is a tourist/visit visa guide for that country (India, Canada, Germany, Italy, Cyprus, N. Macedonia,
  Belarus, Armenia, Estonia) → `/visa/<country>/` is **noindex** and links to that post.
- Post is a *work*-visa guide only → `/visa/<country>/` is indexable (tourist/entry-rule intent) and cross-links.
- All other countries (~170) → indexable, released 100–200/day.
