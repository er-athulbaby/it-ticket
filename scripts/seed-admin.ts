/**
 * Run once to create the first superadmin:
 *   npx ts-node --project tsconfig.json scripts/seed-admin.ts
 *
 * Or set env vars:
 *   ADMIN_NAME="Your Name" ADMIN_EMAIL="admin@company.com" ADMIN_PASSWORD="SecurePass@1"
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const name = process.env.ADMIN_NAME || 'Super Admin';
const email = process.env.ADMIN_EMAIL || 'admin@company.com';
const password = process.env.ADMIN_PASSWORD || 'HelpDesk@123';

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const hashed = await bcrypt.hash(password, 10);

  await pool.query(`
    INSERT INTO admins (name, email, password, role)
    VALUES ($1, $2, $3, 'superadmin')
    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
  `, [name, email, hashed]);

  console.log(`✓ Admin created: ${email} / ${password}`);
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
