const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  });
}

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

  console.log('Admin created: ' + email + ' / ' + password);
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
