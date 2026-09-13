-- migration_v10: Asset categories + category column on assets

CREATE TABLE IF NOT EXISTS asset_categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  color      VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assets ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES asset_categories(id) ON DELETE SET NULL;

-- Service request counter
INSERT INTO app_settings (key, value) VALUES ('sr_counter', '0') ON CONFLICT (key) DO NOTHING;
