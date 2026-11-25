# Embassy pages v20 — 25 November 2026

Data lives in `wp_snippets/pbd-data-pages.php`, function `pbd_emb_all()`: JSON is gzcompressed and base64-encoded between `<<<'B64'` and `B64`. No secret is in that block. `embassy_refresh.load()` and `.dump()` roundtrip it without changing bytes.

- 82 mission pages (11 existing + 71 new), plus 131 country pages without a resident Bangladesh mission, plus `/embassy/`: **214 URLs**, all index,follow.
- 193 foreign country headings (all UN members except Bangladesh, plus Palestine; no Kosovo, Taiwan or Vatican page).
- 39 countries have officially verified accreditation; 92 say it could not be verified and show the closest 2 missions plus MOFA welfare contacts. Nearest mission is never presented as the accredited one.
- Existing 12 URLs (11 missions + hub) are unchanged. `singapore` retains its old slug.
- MOFA's 8 regional static pages were cross-checked; New York UN PM and OIC PM are not standalone consular pages (their cities' consulates are included). Geneva PM is the only Bangladesh mission in Switzerland, so it keeps a page. Dublin is not on the region pages yet but has its own official mofa.gov.bd site, used as the source (ambassador presented credentials 24 Nov 2026). Buenos Aires has a government placeholder site but is not on the MOFA region list: `/embassy/argentina/` notes this.
- Core contacts are only mission/MOFA/Probashi ministry facts, with source links and page update dates. No named officer's personal mobile, gmail or yahoo address is published. Official role hotlines/WhatsApp are included.
- Country enrichment: capital time difference and DST note, calling code, currency, language, area, nearest missions, great-circle distances, bearing, neighboring countries, visa page links where live. Country background data: mledoze/countries plus a capital-coordinates CSV; distance is computed, not road distance. No unsupported community-size claims.
- Every page has >=3 FAQs. Full rendered-page TF-IDF cosine gate (same tokenizer/weighting as pSEO gate): 213/213 passed `<0.6`, maximum 0.59226. `php -l` passed. Standalone render test passed 213 pages + hub with E_ALL and no warnings. No GovernmentOffice node on country/no-mission pages.

## Weekly refresh

`generator/embassy_refresh.py` reads the 8 MOFA region pages. When a new mission is listed for a `kind=country` record, it switches the record to `kind=mission` under the **same URL slug**; only mofa.gov.bd email is auto-filled and other core contacts are marked missing, with fallbacks. New subdomains in a country with existing missions are reported for review, never guessed. Removed links are reported, not deleted.

The new `embassy` job in `probashi-data-refresh.yml` lints, commits only snippet + changed URLs, creates `auto-embassy YYYY-MM-DD` backup, pushes snippet live, flushes and submits changed URLs with IndexNow. The existing agency/D1 job is untouched. Schedule stays weekly (`10 3 * * 1`). This branch is not merged to the default branch, per instruction, so the weekly job becomes scheduled only when the workflow is present on the default branch; it can be manually dispatched with this branch ref meanwhile.

Dry run: `python generator/embassy_refresh.py --dry-run`

## Keyword Planner

Customer 8526099199, global historical metrics, queried 25 Nov 2026 (Nov 2025–Oct 2026).
Top avg monthly searches: Bangladesh High Commission London 18,100; Bangladesh Embassy Paris 12,100; Bangladesh Consulate New York 6,600; Bangladesh Embassy India 4,400; High Commission Canberra/Australia 3,600; Embassy Berlin 3,600; Embassy Washington/USA 2,900; Consulate Toronto 2,900; Embassy Madrid 2,900; High Commission New Delhi/India 2,400; Consulate Sydney 1,600; Embassy Japan 1,600; Embassy Korea 1,300; Embassy Lisbon 1,300; High Commission Maldives 1,000; Embassy Bahrain 1,000; Embassy Lebanon 590; Embassy Kolkata 590; Embassy Finland 590; High Commission Mauritius 260; Embassy Jordan 210; Embassy Brunei 210; Embassy Iraq 90; Embassy Libya 70; Embassy Romania 70.
Bangla variants mostly no volume; Lebanon/Romania/Brunei 20 and Portugal 10. Titles use the proper official type (high commission/consulate) while New Delhi includes “Bangladesh Embassy India” and Kolkata includes “Embassy” for the common query; bilingual wording and English FAQs remain.

## Deploy / rollback

Branch `seo/probashi-embassy-v20` branched from v19 and rebased onto `seo/probashi-pbd-v18-poen` (5e00be0), preserving passport-office changes + one-shot purge. No main/master, merge or PR.

Use `probashi-snippets.yml --ref seo/probashi-embassy-v20`, data_cmd:
1. `backup v19-pre-all`
2. `push wp_snippets/pbd-data-pages.php on`
3. `flush`
4. `indexnow wp_snippets/embassy-indexnow-v20-1.txt` (100 URLs)
5. `indexnow wp_snippets/embassy-indexnow-v20-2.txt` (100 URLs)
6. `indexnow wp_snippets/embassy-indexnow-v20-3.txt` (14 URLs)

Rollback: `gh workflow run probashi-snippets.yml --ref seo/probashi-embassy-v20 -f data_cmd="restore v19-pre-all"` then `flush`.
