-- Live guard against older generators (no GitHub push needed).
-- A reviewed, sourced article can be explicitly allowed with
-- seo_state key approved-article:infkey:<slug>, value true.
CREATE TRIGGER IF NOT EXISTS seo_infkey_data_only
BEFORE INSERT ON articles
WHEN NEW.site_id='infkey'
  AND EXISTS(SELECT 1 FROM seo_state WHERE key='content-policy:infkey' AND value='data-only')
  AND NOT EXISTS(SELECT 1 FROM seo_state WHERE key='approved-article:infkey:'||NEW.slug AND value='true')
BEGIN
  SELECT RAISE(ABORT,'InfKey generic article publishing is paused: verified data pages only');
END;
INSERT INTO seo_state(key,value) VALUES('content-policy:infkey','data-only')
ON CONFLICT(key) DO UPDATE SET value=excluded.value;
