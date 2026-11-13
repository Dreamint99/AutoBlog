-- InfKey AI model database (D1 autoblog-content). Filled daily by workers/infkey-sync.
CREATE TABLE IF NOT EXISTS infkey_models (
  id TEXT PRIMARY KEY,
  or_id TEXT NOT NULL,
  hf_id TEXT,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT,
  category TEXT NOT NULL DEFAULT 'llm',
  input_per_m REAL,
  output_per_m REAL,
  cached_input_per_m REAL,
  unit_price REAL,
  unit_label TEXT,
  max_context INTEGER,
  max_output INTEGER,
  latency_note TEXT,
  supports_vision INTEGER DEFAULT 0,
  supports_audio INTEGER DEFAULT 0,
  supports_functions INTEGER DEFAULT 0,
  supports_structured INTEGER DEFAULT 0,
  supports_reasoning INTEGER DEFAULT 0,
  commercial_use INTEGER DEFAULT 1,
  input_modalities TEXT,
  output_modalities TEXT,
  official_source TEXT,
  last_verified TEXT,
  sort INTEGER DEFAULT 100000,
  tier INTEGER DEFAULT 2,
  notes TEXT,
  description TEXT,
  created INTEGER,
  active INTEGER DEFAULT 1,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS infkey_models_sort ON infkey_models(active, sort);
CREATE INDEX IF NOT EXISTS infkey_models_cat ON infkey_models(active, category, sort);
CREATE TABLE IF NOT EXISTS infkey_price_history (
  id TEXT NOT NULL,
  day TEXT NOT NULL,
  input_per_m REAL,
  output_per_m REAL,
  PRIMARY KEY (id, day)
);
