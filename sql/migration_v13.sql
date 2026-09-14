-- migration_v13: staff association link, mobile, visible staff code

ALTER TABLE staff ADD COLUMN IF NOT EXISTS association_id INTEGER REFERENCES associations(id) ON DELETE SET NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS mobile VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_code VARCHAR(20) UNIQUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS ms_license VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_staff_association ON staff(association_id);
