-- Migration v4: admin profile photo
ALTER TABLE admins ADD COLUMN IF NOT EXISTS photo_filename VARCHAR(500);
