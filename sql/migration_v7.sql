-- Migration v7: Associations/Federations

CREATE TABLE IF NOT EXISTS associations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS association_id INTEGER REFERENCES associations(id) ON DELETE SET NULL;
