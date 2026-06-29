-- Migration v5: site theme setting
INSERT INTO app_settings (key, value) VALUES ('theme', 'indigo') ON CONFLICT (key) DO NOTHING;
