# InfKey UI Redesign Report

**Date:** 2026-11-14  
**Branch:** `feat/infkey-data`  
**Uploaded Version ID:** `5a5d1a8c-3a65-4ba1-9a78-d952f2db8fd1`

## Summary

Redesigned infkey.com to look like a premium AI data product (Linear/Vercel/Stripe-docs quality). Data-first approach with clean, minimal text. All changes are scoped to infkey-only files and CSS selectors.

## Files Changed

### Core Theme & Styles
- **`web/src/sites/infkey/theme.css`** — Added spacing scale variables (`--sp-1` through `--sp-8`), radius variants, enhanced table styles with sticky headers, zebra rows, mobile card view for tables (<640px), status badges, uptime bars, fit badges for "Can I run it?", memory bars, change chips with arrows, enhanced price cards
- **`web/src/sites/infkey/ai.css`** — Added data hero styles (premium gradient background, search box, entry tiles grid), mobile compare table stacking, SVG price chart styles with axis labels

### Components
- **`web/src/sites/infkey/Home.tsx`** — Replaced blog hero with data hero: single tagline, model count, search box, 4 entry tiles (AI Prices, Compare, Is It Down?, Can I Run It?). Reorganized sections: Status strip → Live prices → Changes → New models → (smaller) blog sections
- **`web/src/sites/infkey/HomeWidgets.tsx`** — NEW: Server components for StatusStrip (colored pills for all 9 services), ChangesSummary (today's changes with chips), NewModels (this week's additions)
- **`web/src/sites/infkey/data-ui.tsx`** — Added `data-label` attributes for mobile card view, new components: `StatusBadge`, `FitBadge`, `MemoryBar`, `ChangeChip`
- **`web/src/sites/infkey/Changes.tsx`** — Using new `ChangeChip` component with arrows (▲/▼) and color-coded badges
- **`web/src/sites/infkey/PriceHistory.tsx`** — Enhanced SVG chart with Y-axis labels, grid lines, dark-mode safe colors (`--accent-2`, `--cyan`), hover-free tooltips via SVG `<title>`, legend

### Route Pages
- **`web/src/app/s/[site]/status/page.tsx`** — Big "All systems operational" / "Some services have issues" answer at top, CSS badges instead of emoji, data-labels for mobile
- **`web/src/app/s/[site]/status/[service]/page.tsx`** — Big "Yes/No" answer at top, 90-day uptime bar visualization, CSS badges for components
- **`web/src/app/s/[site]/run/[model]/page.tsx`** — FitBadge components, larger price cards (`lg` variant), data-labels
- **`web/src/app/s/[site]/run/[model]/[gpu]/page.tsx`** — Big answer at top, MemoryBar visualization showing needed vs available GPU memory, FitBadge components
- **`web/src/app/s/[site]/gpu/[gpu]/page.tsx`** — FitBadge components, data-labels
- **`web/src/app/s/[site]/models/[id]/page.tsx`** — Larger price cards

### Data Layer
- **`web/src/lib/models.ts`** — Added `getNewModels(days)` function to get models added in the last N days

## Design Changes

### Home Page (Before → After)
- **Hero:** "The best AI for students/doctors…" rotating text → "Live prices, status & specs for 445+ AI models" with search box
- **Entry:** Scattered links → 4 prominent entry tiles with icons
- **Data first:** Status strip, live prices, changes summary, new models all above blog content

### Tables
- **Headers:** Now sticky on scroll
- **Zebra:** Alternating row backgrounds for readability
- **Numbers:** Tabular-nums for aligned columns
- **Mobile (<640px):** Transforms to card layout (name+provider on top, price chips below)

### Status Pages
- **Badges:** Replaced 🟢🟡🔴 emoji with CSS badges ("Operational", "Degraded", "Outage") with color + text
- **Big answer:** "Yes, ChatGPT has problems" or "No, ChatGPT is up" prominently at top
- **Uptime bar:** 90-day history visualization (green/amber/red bars)

### Can I Run It?
- **Badges:** "Runs" (green), "Barely fits" (amber), "Too big" (grey) as styled badges
- **Memory bar:** Visual comparison of needed vs available GPU memory
- **Big answer:** Clear Yes/No at top of model+GPU pair pages

### Price Changes
- **Chips:** Green ▼ chips for drops, red ▲ chips for increases
- **Percentage:** Clearly shown with directional arrows

### Price History Chart
- **Axis labels:** Y-axis with dollar amounts, X-axis with dates
- **Grid lines:** Subtle guides
- **Tooltips:** SVG `<title>` elements (no JavaScript needed)
- **Legend:** Clear output (solid) vs input (dashed) indication

## Screenshots

Located in `ui-shots/`:

| Page | Desktop (1280px) | Phone (390px) |
|------|------------------|---------------|
| Home | `home-desktop.png` | `home-phone.png` |
| Models | `models-desktop.png` | `models-phone.png` |
| Model Detail | `model-detail-desktop.png` | `model-detail-phone.png` |
| Compare | `compare-desktop.png` | `compare-phone.png` |
| Status | `status-desktop.png` | `status-phone.png` |
| Status/ChatGPT | `status-chatgpt-desktop.png` | `status-chatgpt-phone.png` |
| Run Model | `run-model-desktop.png` | `run-model-phone.png` |
| GPU | `gpu-desktop.png` | `gpu-phone.png` |
| Changes | `changes-desktop.png` | `changes-phone.png` |

## Verification

- ✅ TypeScript: `npx tsc --noEmit` passes
- ✅ Build: `deploy-site.ps1 infkey -DryRun` completes successfully
- ✅ Version uploaded: `5a5d1a8c-3a65-4ba1-9a78-d952f2db8fd1`

## What Was NOT Changed

Per requirements:
- No data logic, SQL queries, or D1 schemas
- No URL structure changes
- No metadata/SEO changes (generateMetadata functions unchanged)
- No robots rules
- No sync Worker code
- No shared file behavior changes for other sites
- No new npm packages
- Server components remain server components

## Accessibility

- Contrast ≥ 4.5:1 maintained (checked badge colors)
- Focus styles preserved (`:focus-visible` outlines)
- `aria-label` on icon-only controls
- Tables retain `<th>` elements
- Status badges use color + text (never color alone)
- SVG charts have `role="img"` and `aria-label`

## Notes

1. **Local preview has empty D1 data**: The home and model pages show "No models loaded" because the local wrangler preview uses an empty D1 simulation. The uploaded version (ID above) uses the real production D1 database and will display full data.

2. **Status page works in preview**: The status page successfully shows the new "All systems operational" banner and table styling.

3. **Model URLs**: Some requested model IDs (e.g., `openai-gpt-6-1-sol`) don't exist in the current database. Screenshots used existing models where possible.

4. **Mobile card view**: Tables transform into stacked cards using CSS only (no JS), triggered at <640px viewport width.

5. **Uptime bar component**: Rendered server-side with pure CSS styling.

## Testing the Uploaded Version

To test the uploaded version at 1% traffic:
```bash
curl -H "Cloudflare-Workers-Version-Overrides: autoblog-infkey=5a5d1a8c-3a65-4ba1-9a78-d952f2db8fd1" https://infkey.com/s/infkey/status
```

Or use the Cloudflare dashboard to deploy to a percentage of traffic.
