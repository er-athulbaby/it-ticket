-- migration_v11: Replace asset_type with category_id (categories are now the single classification)

ALTER TABLE assets DROP COLUMN IF EXISTS asset_type;
ALTER TABLE assets ALTER COLUMN category_id SET NOT NULL;

DROP INDEX IF EXISTS idx_assets_type;
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
