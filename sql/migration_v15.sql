-- migration_v15: consumable transactions can target a staff member or a department

ALTER TABLE consumable_transactions ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE consumable_transactions ADD COLUMN IF NOT EXISTS department VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_consumable_tx_staff ON consumable_transactions(staff_id);
