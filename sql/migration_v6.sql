-- Migration v6: dynamic ticket statuses

CREATE TABLE IF NOT EXISTS ticket_statuses (
  id SERIAL PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color_class VARCHAR(200) NOT NULL DEFAULT 'bg-slate-100 text-slate-700',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default statuses (skip if already exist)
INSERT INTO ticket_statuses (label, slug, color_class, display_order, is_system) VALUES
  ('Open',        'open',        'bg-yellow-100 text-yellow-700', 1, TRUE),
  ('In Progress', 'in_progress', 'bg-blue-100 text-blue-700',     2, TRUE),
  ('On Hold',     'on_hold',     'bg-orange-100 text-orange-700', 3, TRUE),
  ('Resolved',    'resolved',    'bg-green-100 text-green-700',   4, TRUE),
  ('Closed',      'closed',      'bg-slate-100 text-slate-600',   5, TRUE)
ON CONFLICT (slug) DO NOTHING;
