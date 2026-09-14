// Turns the CSV "Licenses" column (e.g. "Microsoft Fabric (Free)+Microsoft 365 Business Premium")
// into real rows in the `licenses` table, and assigns each staff member as a seat holder via
// `license_assignments`. Run AFTER scripts/import-boc-staff.js --apply (staff must already exist).
//
// Usage:
//   node scripts/link-staff-licenses.js            -> dry run, prints a report only
//   node scripts/link-staff-licenses.js --apply      -> actually writes to the database

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = process.env[m[1]] || m[2].trim();
  }
}

const APPLY = process.argv.includes('--apply');
const CSV_PATH = path.join(__dirname, 'data', 'BOC-USER.csv');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function normalizeName(name) {
  return name.toLowerCase().replace(/\bdr\.?\b/g, '').replace(/[.,'"]/g, '').replace(/\s+/g, ' ').trim();
}
function tokenSet(name) { return new Set(normalizeName(name).split(' ').filter((t) => t.length > 1)); }
function similarity(a, b) {
  const setA = tokenSet(a), setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let common = 0;
  for (const t of setA) if (setB.has(t)) common++;
  return common / Math.max(setA.size, setB.size);
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found at ${CSV_PATH}.`);
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let raw = fs.readFileSync(CSV_PATH, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  const rows = parseCsv(raw);
  const header = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  const idx = { name: header.indexOf('Display name'), license: header.indexOf('Licenses') };
  if (idx.name === -1 || idx.license === -1) {
    console.error('Could not find expected columns. Header:', header);
    await client.end();
    process.exit(1);
  }

  const { rows: staffRows } = await client.query('SELECT id, name FROM staff');
  const { rows: existingLicenses } = await client.query('SELECT id, name FROM licenses');
  const licenseByName = new Map(existingLicenses.map((l) => [l.name.toLowerCase(), l]));

  // Collect: licenseName -> Set of staff ids, and staffId -> matched CSV name (for reporting)
  const planToStaffIds = new Map();
  const unmatchedNames = [];
  let skuMentions = 0;

  for (const r of dataRows) {
    const csvName = (r[idx.name] || '').trim();
    const licenseCell = (r[idx.license] || '').trim();
    if (!csvName || !licenseCell) continue;

    const plans = licenseCell.split('+').map((p) => p.trim()).filter((p) => p && p.toLowerCase() !== 'unlicensed');
    if (plans.length === 0) continue;

    let best = null, bestScore = 0;
    for (const s of staffRows) {
      const score = similarity(s.name, csvName);
      if (score > bestScore) { bestScore = score; best = s; }
    }
    if (!best || bestScore < 0.75) { unmatchedNames.push(csvName); continue; }

    for (const plan of plans) {
      skuMentions++;
      if (!planToStaffIds.has(plan)) planToStaffIds.set(plan, new Set());
      planToStaffIds.get(plan).add(best.id);
    }
  }

  console.log(`\n=== License Linking ${APPLY ? '(APPLY MODE)' : '(DRY RUN)'} ===`);
  console.log(`CSV rows with a license: ${dataRows.filter((r) => (r[idx.license] || '').trim()).length}`);
  console.log(`Unique license plans found: ${planToStaffIds.size}`);
  console.log(`Staff names in CSV with no confident staff match (skipped): ${unmatchedNames.length}\n`);

  console.log('--- PLANS AND SEAT COUNTS ---');
  const sortedPlans = [...planToStaffIds.entries()].sort((a, b) => b[1].size - a[1].size);
  for (const [plan, staffIds] of sortedPlans) {
    const exists = licenseByName.has(plan.toLowerCase());
    console.log(`  ${exists ? '(existing)' : '(will create)'} "${plan}" — ${staffIds.size} staff`);
  }

  if (!APPLY) {
    console.log('\nDry run only — no changes made. Re-run with --apply to write to the database.');
    await client.end();
    return;
  }

  let licensesCreated = 0, assignmentsCreated = 0, assignmentsSkipped = 0;

  for (const [plan, staffIds] of planToStaffIds) {
    let license = licenseByName.get(plan.toLowerCase());
    if (!license) {
      const res = await client.query(
        `INSERT INTO licenses (name, vendor, seats) VALUES ($1, 'Microsoft', $2) RETURNING id, name`,
        [plan, staffIds.size]
      );
      license = res.rows[0];
      licenseByName.set(plan.toLowerCase(), license);
      licensesCreated++;
    }

    for (const staffId of staffIds) {
      try {
        await client.query(
          `INSERT INTO license_assignments (license_id, staff_id, assigned_date)
           VALUES ($1, $2, CURRENT_DATE)
           ON CONFLICT (license_id, staff_id) WHERE returned_date IS NULL DO NOTHING`,
          [license.id, staffId]
        );
        assignmentsCreated++;
      } catch (e) {
        console.log(`  SKIP assignment license#${license.id} staff#${staffId}: ${e.message}`);
        assignmentsSkipped++;
      }
    }
  }

  console.log(`\nDone. Licenses created: ${licensesCreated}, Assignments created: ${assignmentsCreated}, Skipped: ${assignmentsSkipped}`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
