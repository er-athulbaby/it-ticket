-- Migration v2: branding, staff, requester, custom ticket number

-- App settings (key-value store)
CREATE TABLE IF NOT EXISTS app_settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT
);

INSERT INTO app_settings (key, value) VALUES
  ('company_name', 'My Company'),
  ('ticket_prefix', 'IT'),
  ('ticket_counter', '0'),
  ('logo_filename', '')
ON CONFLICT (key) DO NOTHING;

-- Staff table (requesters — no login)
CREATE TABLE IF NOT EXISTS staff (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  department   VARCHAR(255),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add requester to tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS requester_id INTEGER REFERENCES staff(id) ON DELETE SET NULL;

-- Drop old auto-trigger (ticket number now handled in API)
DROP TRIGGER IF EXISTS set_ticket_number ON tickets;
DROP FUNCTION IF EXISTS generate_ticket_number();
DROP SEQUENCE IF EXISTS ticket_seq;

-- Index for staff
CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(name);
