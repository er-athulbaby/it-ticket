// Corrects staff.association_id assignments that the original import got wrong due to
// generic-word false-positive matches (e.g. "Bahrain Boxing Association" got matched to
// "Bahrain Athletics Association" just because both share "Bahrain" + "Association").
//
// Uses an exact, hand-verified alias map instead of fuzzy scoring, built by comparing
// every association-like CSV Department value against the canonical associations list.
//
// Usage:
//   node scripts/fix-staff-associations.js            -> dry run, prints a report only
//   node scripts/fix-staff-associations.js --apply      -> actually writes to the database

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
  const rows = []; let row = []; let field = ''; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
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

// exact CSV Department text (trimmed) -> correct canonical association name.
// "NEW:" prefix means the association doesn't exist yet and should be created.
const ALIAS_MAP = {
  'Bahrain Athletics Association': 'Bahrain Athletics Association',
  'Bahrain Badminton & Squash Federation': 'Bahrain Badminton and Squash Federation',
  'Bahrain Basketball Association': 'Bahrain Basketball Association',
  'Bahrain Bodybuilding Federation': 'Bahrain Body Building Federation',
  'Bahrain Boxing Association': 'Bahrain Boxing Federation',
  'Bahrain Collegiate Athletics Association': 'Bahrain School and Collegiate Athletic Association',
  'Bahrain Combat Sport Council': 'Bahrain Combat Sports Council',
  'Bahrain Cycling Association': 'Bahrain Cycling Association',
  'Bahrain Handball Association': 'Bahrain Handball Association',
  'Bahrain Maritime Sports Association': 'Bahrain Maritime Sports Association',
  'Bahrain Martial Arts Federation': 'NEW:Bahrain Martial Arts Federation',
  'Bahrain Mixed Martial Arts Federation': 'Bahrain Mixed Marital Arts Federation',
  'Bahrain Padel Federation': 'Bahrain Padel Federation',
  'Bahrain Rugby Federation': 'NEW:Bahrain Rugby Federation',
  'Bahrain Shooting Association': 'Bahrain Shooting Federation',
  'Bahrain Swimming Association': 'Bahrain Aquatic Federation',
  'Bahrain Table Tennis Association': 'Bahrain Table Tennis Association',
  'Bahrain Triathlon Association': 'Bahrain Triathlon Association',
  'Bahrain Volleyball Association': 'Bahrain Volleyball Association',
  'Bahrain Weightlifting Federation': 'Bahrain Weightlifting Federation',
  'Billiard, Snooker, and Darts Federation': 'Bahrain Billiard, Snooker & Dart Federation',
  'Secretary General, Supreme Council for Youth & Sports': 'Secretary General, Supreme Council for Youth & Sports',
};

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let raw = fs.readFileSync(CSV_PATH, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  const rows = parseCsv(raw);
  const header = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);
  const idx = { name: header.indexOf('Display name'), dept: header.indexOf('Department') };

  const { rows: staffRows } = await client.query('SELECT id, name, association_id FROM staff');
  const { rows: assocRows } = await client.query('SELECT id, name FROM associations');
  const assocByName = new Map(assocRows.map((a) => [a.name, a]));

  console.log(`\n=== Fix Staff Associations ${APPLY ? '(APPLY MODE)' : '(DRY RUN)'} ===\n`);

  // --- Step 1: merge duplicate "Bahrain Shooting Federation" ---
  const shootingDupes = assocRows.filter((a) => a.name === 'Bahrain Shooting Federation').sort((a, b) => a.id - b.id);
  let shootingKeepId = null;
  if (shootingDupes.length > 1) {
    shootingKeepId = shootingDupes[0].id;
    const dupeIds = shootingDupes.slice(1).map((a) => a.id);
    console.log(`Merging duplicate "Bahrain Shooting Federation": keeping id ${shootingKeepId}, removing ${dupeIds.join(', ')}`);
    if (APPLY) {
      for (const dupeId of dupeIds) {
        await client.query('UPDATE staff SET association_id=$1 WHERE association_id=$2', [shootingKeepId, dupeId]);
        await client.query('DELETE FROM associations WHERE id=$1', [dupeId]);
      }
    }
  } else if (shootingDupes.length === 1) {
    shootingKeepId = shootingDupes[0].id;
  }
  if (shootingKeepId) assocByName.set('Bahrain Shooting Federation', { id: shootingKeepId, name: 'Bahrain Shooting Federation' });

  // --- Step 2: create any missing "NEW:" associations ---
  for (const target of new Set(Object.values(ALIAS_MAP))) {
    if (target.startsWith('NEW:')) {
      const name = target.slice(4);
      if (!assocByName.has(name)) {
        console.log(`Will create new association: "${name}"`);
        if (APPLY) {
          const res = await client.query('INSERT INTO associations (name) VALUES ($1) RETURNING id, name', [name]);
          assocByName.set(name, res.rows[0]);
        }
      }
    }
  }

  // --- Step 3: resolve each staff member's correct association per CSV row ---
  let corrections = 0, unchanged = 0, unmatched = 0;
  const correctionLog = [];

  for (const r of dataRows) {
    const csvName = (r[idx.name] || '').trim();
    const deptText = (r[idx.dept] || '').trim();
    if (!csvName || !deptText || !(deptText in ALIAS_MAP)) continue;

    let targetName = ALIAS_MAP[deptText];
    if (targetName.startsWith('NEW:')) targetName = targetName.slice(4);
    const targetAssoc = assocByName.get(targetName);
    if (!targetAssoc) { unmatched++; continue; }

    let best = null, bestScore = 0;
    for (const s of staffRows) {
      const score = similarity(s.name, csvName);
      if (score > bestScore) { bestScore = score; best = s; }
    }
    if (!best || bestScore < 0.75) { unmatched++; continue; }

    if (best.association_id === targetAssoc.id) { unchanged++; continue; }

    corrections++;
    correctionLog.push(`  DB#${best.id} "${best.name}": association_id ${best.association_id ?? 'null'} -> ${targetAssoc.id} ("${targetAssoc.name}")`);
    if (APPLY) {
      await client.query('UPDATE staff SET association_id=$1 WHERE id=$2', [targetAssoc.id, best.id]);
      best.association_id = targetAssoc.id; // keep in-memory copy consistent if a name repeats
    }
  }

  console.log(`\n--- CORRECTIONS (${corrections}) ---`);
  console.log(correctionLog.slice(0, 40).join('\n'));
  if (correctionLog.length > 40) console.log(`  ... and ${correctionLog.length - 40} more`);

  console.log(`\nAlready correct: ${unchanged} | No confident staff match: ${unmatched}`);

  if (!APPLY) {
    console.log('\nDry run only — no changes made. Re-run with --apply to write to the database.');
  } else {
    console.log('\nDone.');
  }

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
