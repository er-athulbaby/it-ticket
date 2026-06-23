-- Migration v3: staff portal login + email notifications

-- Add login fields to staff
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_filename VARCHAR(500);

-- Allow staff to author notes
ALTER TABLE ticket_notes ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL;

-- Email / SMTP settings
INSERT INTO app_settings (key, value) VALUES
  ('notification_email', ''),
  ('smtp_host', 'smtp-mail.outlook.com'),
  ('smtp_port', '587'),
  ('smtp_user', ''),
  ('smtp_pass', '')
ON CONFLICT (key) DO NOTHING;
