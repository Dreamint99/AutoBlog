CREATE TABLE IF NOT EXISTS seo_engine_outbox (
  site_id TEXT NOT NULL, url TEXT NOT NULL, version TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, next_try TEXT NOT NULL, delivered_at TEXT,
  PRIMARY KEY(site_id,url)
);
CREATE INDEX IF NOT EXISTS seo_engine_pending ON seo_engine_outbox(site_id,delivered_at,next_try);
CREATE TABLE IF NOT EXISTS seo_social (
  channel TEXT NOT NULL, url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0, remote_id TEXT, updated_at TEXT NOT NULL,
  PRIMARY KEY(channel,url)
);
CREATE TABLE IF NOT EXISTS seo_budget (month TEXT PRIMARY KEY, reserved_usd REAL NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS seo_embed_hosts (site_id TEXT NOT NULL, host TEXT NOT NULL, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, PRIMARY KEY(site_id,host));

-- Visa data hub (VisaPoint walvi site)
CREATE TABLE IF NOT EXISTS visa_matrix (
  passport TEXT NOT NULL,   -- ISO-2 code of passport country
  destination TEXT NOT NULL, -- ISO-2 code of destination country
  requirement TEXT NOT NULL, -- visa free, visa on arrival, eta, e-visa, visa required, no admission
  days INTEGER,             -- number of days allowed (null if not specified)
  source TEXT NOT NULL,     -- source URL
  data_date TEXT NOT NULL,  -- date of the source data
  updated_at TEXT NOT NULL, -- when we last updated this row
  PRIMARY KEY(passport, destination)
);
CREATE INDEX IF NOT EXISTS visa_by_passport ON visa_matrix(passport);
CREATE INDEX IF NOT EXISTS visa_by_destination ON visa_matrix(destination);

-- Visa indexing rules: which pairs should be indexed
CREATE TABLE IF NOT EXISTS visa_index_rules (
  passport TEXT NOT NULL,
  destination TEXT,  -- null = all destinations for this passport
  indexed INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  PRIMARY KEY(passport, destination)
);

-- Country metadata for visa pages
CREATE TABLE IF NOT EXISTS visa_countries (
  iso2 TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  population INTEGER,  -- for ranking top passports
  region TEXT
);
