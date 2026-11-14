-- GCCGuide "Gulf Expat Data Hub" — schema, v1.
-- Applied to the shared D1 database `autoblog-content` (binding DB).
--
--   npx wrangler d1 execute autoblog-content --local  --file=../workers/gcc-data/migrations/0001_gcc_hub.sql
--   npx wrangler d1 execute autoblog-content --remote --file=../workers/gcc-data/migrations/0001_gcc_hub.sql
--
-- (run from web/ so wrangler picks up web/wrangler.jsonc). Every statement is
-- idempotent: re-running the file is safe.

-- ── Currency ────────────────────────────────────────────────────────────────
-- Current mid-market rate, always quoted as "units of `currency` per 1 USD"
-- (open.er-api.com base USD). Pages derive any cross rate from two rows.
CREATE TABLE IF NOT EXISTS gcc_fx_rate (
  currency   TEXT PRIMARY KEY,          -- ISO 4217, e.g. AED
  rate       REAL NOT NULL,             -- units per 1 USD
  source     TEXT NOT NULL,             -- provider name
  source_url TEXT NOT NULL,
  asof       TEXT NOT NULL,             -- provider's own timestamp (ISO 8601, UTC)
  fetched_at TEXT NOT NULL
);

-- One row per currency per day = the chart history (30-day and 1-year lines).
CREATE TABLE IF NOT EXISTS gcc_fx_daily (
  currency TEXT NOT NULL,
  d        TEXT NOT NULL,               -- YYYY-MM-DD (UTC)
  rate     REAL NOT NULL,               -- units per 1 USD
  source   TEXT NOT NULL,
  PRIMARY KEY (currency, d)
);
CREATE INDEX IF NOT EXISTS idx_gcc_fx_daily_d ON gcc_fx_daily (d);

-- ── Gold ────────────────────────────────────────────────────────────────────
-- Spot gold in USD per troy ounce. Single row (id = 1) = "latest good value".
CREATE TABLE IF NOT EXISTS gcc_gold_spot (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  usd_per_oz REAL NOT NULL,
  source     TEXT NOT NULL,
  source_url TEXT NOT NULL,
  asof       TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gcc_gold_daily (
  d          TEXT PRIMARY KEY,          -- YYYY-MM-DD (UTC)
  usd_per_oz REAL NOT NULL,
  source     TEXT NOT NULL
);

-- ── Fuel ────────────────────────────────────────────────────────────────────
-- Official monthly retail prices. Written by the reviewer's monthly JSON
-- (workers/gcc-data/scripts/import-fuel.mjs) — never scraped from retailers.
CREATE TABLE IF NOT EXISTS gcc_fuel (
  country        TEXT NOT NULL,         -- uae | saudi-arabia | qatar | kuwait | oman | bahrain
  grade          TEXT NOT NULL,         -- "Special 95", "Diesel", …
  month          TEXT NOT NULL,         -- YYYY-MM the price applies to
  grade_key      TEXT NOT NULL DEFAULT '',
  price          REAL NOT NULL,
  currency       TEXT NOT NULL,
  unit           TEXT NOT NULL DEFAULT 'litre',
  effective_from TEXT,
  source_url     TEXT NOT NULL,
  source_type    TEXT NOT NULL DEFAULT 'official',
  checked        TEXT,
  updated_at     TEXT NOT NULL,
  PRIMARY KEY (country, grade, month)
);
CREATE INDEX IF NOT EXISTS idx_gcc_fuel_month ON gcc_fuel (month, country);

-- ── Job log ─────────────────────────────────────────────────────────────────
-- Every cron run writes one row (ok / error / skipped). The site never reads
-- this table; it exists so a failed source is visible instead of silent.
CREATE TABLE IF NOT EXISTS gcc_job_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  job           TEXT NOT NULL,          -- fx | gold | backfill | indexnow | fuel
  status        TEXT NOT NULL,          -- ok | error | skipped
  message       TEXT NOT NULL DEFAULT '',
  rows_affected INTEGER NOT NULL DEFAULT 0,
  started_at    TEXT NOT NULL,
  finished_at   TEXT NOT NULL,
  duration_ms   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gcc_job_log_job ON gcc_job_log (job, started_at DESC);

-- ── Per-page index overrides ────────────────────────────────────────────────
-- Indexing is rule-based (see web/src/sites/gccguide/hub/config.ts). This table
-- lets the reviewer force one URL in or out later without a deploy:
--   INSERT INTO gcc_page_flag (url, seo_index, note, updated_at)
--   VALUES ('/rates/kwd-to-inr', 1, 'high demand', '2026-11-14');
CREATE TABLE IF NOT EXISTS gcc_page_flag (
  url        TEXT PRIMARY KEY,          -- site-relative path, e.g. /rates/aed-to-inr
  seo_index  INTEGER NOT NULL,          -- 1 = index, 0 = noindex
  note       TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
