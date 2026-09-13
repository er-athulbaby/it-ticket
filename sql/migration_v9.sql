-- migration_v9: IT Asset Management

-- Physical assets (hardware devices)
CREATE TABLE IF NOT EXISTS assets (
  id               SERIAL PRIMARY KEY,
  asset_tag        VARCHAR(50) UNIQUE,
  asset_type       VARCHAR(100) NOT NULL,
  make             VARCHAR(100),
  model            VARCHAR(200),
  serial_no        VARCHAR(200),
  fru_part_no      VARCHAR(200),
  condition        VARCHAR(50) NOT NULL DEFAULT 'good',
  purchase_date    DATE,
  warranty_expiry  DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Who has which asset and when
CREATE TABLE IF NOT EXISTS asset_assignments (
  id               SERIAL PRIMARY KEY,
  asset_id         INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  staff_id         INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  association_id   INTEGER REFERENCES associations(id) ON DELETE SET NULL,
  assigned_by      INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  assigned_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date    DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Consumables inventory (toners, cables, accessories, etc.)
CREATE TABLE IF NOT EXISTS consumables (
  id                   SERIAL PRIMARY KEY,
  name                 VARCHAR(255) NOT NULL,
  category             VARCHAR(100),
  unit                 VARCHAR(50) NOT NULL DEFAULT 'piece',
  quantity             INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold  INTEGER NOT NULL DEFAULT 5,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Consumable stock movements (in/out)
CREATE TABLE IF NOT EXISTS consumable_transactions (
  id               SERIAL PRIMARY KEY,
  consumable_id    INTEGER NOT NULL REFERENCES consumables(id) ON DELETE CASCADE,
  transaction_type VARCHAR(5) NOT NULL CHECK (transaction_type IN ('in', 'out')),
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  ticket_id        INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  notes            TEXT,
  created_by       INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Software licenses
CREATE TABLE IF NOT EXISTS licenses (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  vendor           VARCHAR(255),
  product          VARCHAR(255),
  license_key      TEXT,
  seats            INTEGER DEFAULT 1,
  purchase_date    DATE,
  expiry_date      DATE,
  notes            TEXT,
  last_alert_sent  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service Change Request / Asset Transfer forms
CREATE TABLE IF NOT EXISTS service_requests (
  id                   SERIAL PRIMARY KEY,
  request_number       VARCHAR(20) UNIQUE NOT NULL,
  staff_id             INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  association_id       INTEGER REFERENCES associations(id) ON DELETE SET NULL,
  cpr_no               VARCHAR(50),
  department           VARCHAR(255),
  mobile_no            VARCHAR(50),
  tel_no               VARCHAR(50),
  fax_no               VARCHAR(50),
  address              TEXT,
  company              VARCHAR(255),
  it_username          VARCHAR(255),
  it_domain_id         VARCHAR(255),
  it_security_group    VARCHAR(255),
  it_membership        VARCHAR(255),
  it_access_permissions TEXT,
  it_map_drives        TEXT,
  it_duration          VARCHAR(100),
  asset_details        JSONB NOT NULL DEFAULT '[]',
  status               VARCHAR(50) NOT NULL DEFAULT 'pending',
  comments             TEXT,
  employee_name        VARCHAR(255),
  employee_signed_date DATE,
  completed_by_name    VARCHAR(255),
  completed_by_date    DATE,
  device_return_name   VARCHAR(255),
  device_return_date   DATE,
  received_by_name     VARCHAR(255),
  received_by_date     DATE,
  device_condition     TEXT,
  created_by           INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_condition ON assets(condition);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_staff ON asset_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_active ON asset_assignments(asset_id) WHERE returned_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_consumable_tx ON consumable_transactions(consumable_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON licenses(expiry_date);
CREATE INDEX IF NOT EXISTS idx_service_requests_staff ON service_requests(staff_id);
