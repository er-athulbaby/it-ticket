/**
 * Creates two tickets for each staff member:
 *   Ticket 1 — "Installation and setup of new PC"   → assigned to Athul Baby
 *   Ticket 2 — "Configuration of new PC"            → assigned to Rafiq
 *
 * Run on the server:
 *   npx ts-node --project tsconfig.json scripts/seed-tickets.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const STAFF_NAMES = [
  'Abdulla N. Alansari',
  'Ahmed M. Abdulghaffar',
  'Ahmed M. Jasim',
  'Ahmed T. Alalaiwat',
  'Ali H. Altajir',
  'Ali J. Haroona',
  'Ali K. Husain',
  'Athul Baby',
  'Atifa A. Alsayed',
  'Dhabia I. Hamada',
  'Dr. Moayyed Hashem',
  'Dr. Nabeel T. Alshehab',
  'Eman A. Bufarsan',
  'Fajer J. Hasan',
  'Fatema M. Alansari',
  'Fay H. Buallay',
  'Hala Z. Alzayani',
  'Hanan A. Zaid',
  'Hasan A. Ahmed',
  'Hasan A. Juma',
  'Hesham A. Albeloshi',
  'Husain A. Abdulrazzaq',
  'Husain E. Alaali',
  'Khaled M. Haji',
  'Lounes Madene',
  'Malak S. Qarooni',
  'Manar AlMansoori',
  'Maryam H. Almadhi',
  'Maryam Mardana',
  'Mohamed K. Alkaabi',
  'Mohamed S. Eldeeb',
  'Muhammad Rafiq Bhatti',
  'Muna J. Ekshish',
  'Salah A. Khedr',
  'Sayed A. Hasan',
  'Shaikha A. Almannaei',
  'Shaikha Ali Mohamed',
  'Shoof G. Almalood',
  'Yousif A. Hussain',
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Find the two assigned admins
  const { rows: admins } = await pool.query<{ id: number; name: string }>(
    `SELECT id, name FROM admins WHERE is_active = TRUE`
  );

  const athul = admins.find((a) => a.name.toLowerCase().includes('athul'));
  const rafiq = admins.find((a) => a.name.toLowerCase().includes('rafiq'));

  if (!athul) {
    console.error('ERROR: No active admin found with name containing "athul"');
    console.error('Active admins:', admins.map((a) => a.name).join(', '));
    await pool.end();
    process.exit(1);
  }
  if (!rafiq) {
    console.error('ERROR: No active admin found with name containing "rafiq"');
    console.error('Active admins:', admins.map((a) => a.name).join(', '));
    await pool.end();
    process.exit(1);
  }

  console.log(`Ticket 1 → assigned to: ${athul.name} (id ${athul.id})`);
  console.log(`Ticket 2 → assigned to: ${rafiq.name} (id ${rafiq.id})`);
  console.log('');

  // Get ticket prefix + current counter from app_settings
  const { rows: settingRows } = await pool.query<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings WHERE key IN ('ticket_prefix', 'ticket_counter')`
  );
  const s: Record<string, string> = {};
  settingRows.forEach((r) => { s[r.key] = r.value; });
  const prefix = s['ticket_prefix'] || 'IT';
  let counter = parseInt(s['ticket_counter'] || '0', 10);

  let created = 0;
  const notFound: string[] = [];

  for (const name of STAFF_NAMES) {
    const { rows: staffRows } = await pool.query<{ id: number }>(
      `SELECT id FROM staff WHERE name = $1 AND is_active = TRUE LIMIT 1`,
      [name]
    );

    if (!staffRows.length) {
      // Try case-insensitive fallback
      const { rows: fallback } = await pool.query<{ id: number; name: string }>(
        `SELECT id, name FROM staff WHERE name ILIKE $1 AND is_active = TRUE LIMIT 1`,
        [name]
      );
      if (!fallback.length) {
        console.log(`  SKIP (not found): ${name}`);
        notFound.push(name);
        continue;
      }
      staffRows.push(fallback[0]);
    }

    const staffId = staffRows[0].id;

    // Ticket 1 — Installation
    counter++;
    const tn1 = `${prefix}-${String(counter).padStart(5, '0')}`;
    await pool.query(
      `INSERT INTO tickets (ticket_number, title, description, priority, status, requester_id, assigned_to)
       VALUES ($1, $2, '', 'medium', 'open', $3, $4)`,
      [tn1, 'Installation and setup of new PC', staffId, athul.id]
    );

    // Ticket 2 — Configuration
    counter++;
    const tn2 = `${prefix}-${String(counter).padStart(5, '0')}`;
    await pool.query(
      `INSERT INTO tickets (ticket_number, title, description, priority, status, requester_id, assigned_to)
       VALUES ($1, $2, '', 'medium', 'open', $3, $4)`,
      [tn2, 'Configuration of new PC', staffId, rafiq.id]
    );

    console.log(`  ${tn1} + ${tn2}  →  ${name}`);
    created += 2;
  }

  // Sync the counter back to app_settings
  await pool.query(
    `UPDATE app_settings SET value = $1 WHERE key = 'ticket_counter'`,
    [String(counter)]
  );

  console.log('');
  console.log(`Done! Created ${created} tickets for ${created / 2} staff members.`);
  if (notFound.length) {
    console.log(`\nNot found in staff table (${notFound.length}):`);
    notFound.forEach((n) => console.log(`  - ${n}`));
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
