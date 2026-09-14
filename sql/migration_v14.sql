-- migration_v14: per-staff license assignments

CREATE TABLE IF NOT EXISTS license_assignments (
  id            SERIAL PRIMARY KEY,
  license_id    INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  staff_id      INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  assigned_by   INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_assignments_license ON license_assignments(license_id);
CREATE INDEX IF NOT EXISTS idx_license_assignments_staff ON license_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_license_assignments_active ON license_assignments(staff_id) WHERE returned_date IS NULL;

-- one active (non-returned) assignment per staff+license pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_license_assignments_unique_active
  ON license_assignments(license_id, staff_id) WHERE returned_date IS NULL;
