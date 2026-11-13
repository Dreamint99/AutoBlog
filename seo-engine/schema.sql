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
