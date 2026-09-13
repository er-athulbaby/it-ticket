-- migration_v12: association email, service request accessories/duration, email tracking

ALTER TABLE associations ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS accessories JSONB NOT NULL DEFAULT '[]';
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS duration_type VARCHAR(20) NOT NULL DEFAULT 'permanent';
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS return_by_date DATE;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS request_email_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS return_email_sent BOOLEAN NOT NULL DEFAULT FALSE;
