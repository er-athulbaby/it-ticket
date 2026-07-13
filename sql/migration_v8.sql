-- Migration v8: Ticket reminder notifications

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS notification_frequency VARCHAR(20) NOT NULL DEFAULT 'none';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reminder_last_sent TIMESTAMPTZ;

INSERT INTO app_settings (key, value) VALUES
  ('reminder_time_1', '09:00'),
  ('reminder_time_2', '15:00'),
  ('reminder_secret', '')
ON CONFLICT (key) DO NOTHING;
