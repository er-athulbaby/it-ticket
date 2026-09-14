-- migration_v16: asset vendor/price/photo, license software type + reminders + association
-- assignment support, and a system-wide audit log

-- Assets: vendor (supplier, distinct from make/manufacturer), unit price, photo
ALTER TABLE assets ADD COLUMN IF NOT EXISTS vendor VARCHAR(255);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS photo_filename VARCHAR(500);

-- Licenses: software type + expiry reminder toggles
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS software_type VARCHAR(100);
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS remind_90 BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS remind_60 BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS remind_30 BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS last_reminder_sent_days INTEGER;

-- License assignments: allow assigning to an association, not just a staff member
ALTER TABLE license_assignments ADD COLUMN IF NOT EXISTS association_id INTEGER REFERENCES associations(id) ON DELETE CASCADE;
ALTER TABLE license_assignments ALTER COLUMN staff_id DROP NOT NULL;
ALTER TABLE license_assignments DROP CONSTRAINT IF EXISTS chk_license_assignment_target;
ALTER TABLE license_assignments ADD CONSTRAINT chk_license_assignment_target CHECK (staff_id IS NOT NULL OR association_id IS NOT NULL);

DROP INDEX IF EXISTS idx_license_assignments_unique_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_license_assignments_unique_active_staff
  ON license_assignments(license_id, staff_id) WHERE returned_date IS NULL AND staff_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_license_assignments_unique_active_assoc
  ON license_assignments(license_id, association_id) WHERE returned_date IS NULL AND association_id IS NOT NULL;

-- System-wide audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id            SERIAL PRIMARY KEY,
  entity_type   VARCHAR(50) NOT NULL,
  entity_id     INTEGER,
  entity_label  VARCHAR(255),
  action        VARCHAR(20) NOT NULL, -- create | update | delete
  changes       JSONB,
  admin_id      INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  admin_name    VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
